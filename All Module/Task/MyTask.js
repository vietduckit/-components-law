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
  "To do": "Chưa thực hiện",
  "In progress": "Đang xử lý",
  "Blocked": "Bị chặn",
  "Pending approval": "Chờ duyệt",
  "Approved": "Đã duyệt",
  "Done": "Hoàn thành",
  "Cancelled": "Đã huỷ",
  "High": "Cao",
  "Medium": "Trung bình",
  "Low": "Thấp",
  "Partner": "Luật sư đối tác",
  "Lawyer": "Luật sư",
  "Associate": "Luật sư cộng sự",
  "Legal Assistant": "Trợ lý pháp lý",
  "Title": "Tiêu đề",
  "Status": "Trạng thái",
  "Priority": "Ưu tiên",
  "Deadline": "Hạn",
  "Start date": "Ngày bắt đầu",
  "Completion date": "Ngày hoàn thành",
  "Progress details": "Nội dung diễn biến",
  "Note content": "Nội dung ghi chú",
  "Estimated duration": "Thời gian dự kiến",
  "Pending Issue": "Vấn đề tồn đọng",
  "Next Step": "Bước tiếp theo",
  "Approver": "Người duyệt",
  "Approval assigned date": "Ngày phân công xét duyệt",
  "Approval date": "Ngày duyệt",
  "Approval required": "Yêu cầu xét duyệt",
  "Comment": "Bình luận",
  "Document": "Tài liệu",
  "Deleted status": "Trạng thái xóa",
  "By": "Người thực hiện",
  "Note": "Ghi chú",
  "Content": "Nội dung",
  "Assignees": "Người được gán",
  "Draft": "Nháp",
  "Rejected": "Từ chối",
  "Task document": "Tài liệu Task",
  "Meeting minutes": "Biên bản họp",
  "Contract": "Hợp đồng",
  "Evidence / Records": "Chứng cứ / Hồ sơ",
  "Other": "Khác",
  "Task": "Công việc",
  "Minutes": "Biên bản",
  "Records": "Hồ sơ",
  "just now": "vừa xong",
  "{0} min ago": "{0} phút trước",
  "{0} hours ago": "{0} giờ trước",
  "Waiting": "Đang chờ",
  "{0}% Excellent": "{0}% Xuất sắc",
  "{0}% On track": "{0}% Đúng tiến độ",
  "{0}% Slow": "{0}% Chậm",
  "{0}% Poor": "{0}% Kém",
  "Prerequisite task": "Công việc điều kiện",
  "Next step": "Bước tiếp theo",
  "Refresh": "Làm mới",
  "Write a comment...": "Viết bình luận...",
  "Attach document": "Đính kèm tài liệu",
  "Bold (Ctrl+B)": "In đậm (Ctrl+B)",
  "Italic (Ctrl+I)": "In nghiêng (Ctrl+I)",
  "Underline (Ctrl+U)": "Gạch chân (Ctrl+U)",
  "Strikethrough": "Gạch ngang",
  "Decrease indent": "Giảm lề",
  "Increase indent": "Tăng lề",
  "Blockquote": "Trích dẫn",
  "Code block": "Đoạn mã",
  "Numbered list": "Danh sách số",
  "Bullet list": "Danh sách chấm",
  "Insert link": "Chèn liên kết",
  "Clear formatting": "Xóa định dạng",
  "Font size": "Kích cỡ chữ",
  "Alignment": "Căn lề",
  "Could not load the editor. Check your network connection.": "Không thể tải editor. Vui lòng kiểm tra kết nối mạng.",
  "Loading editor...": "Đang tải editor...",
  "Mention someone": "Nhắc đến ai",
  "Search lawyer name...": "Tìm tên luật sư...",
  "No results": "Không tìm thấy",
  "User #{0}": "Người dùng #{0}",
  "Anonymous": "Ẩn danh",
  "Enter the comment before mentioning anyone.": "Vui lòng nhập nội dung bình luận trước khi nhắc tên.",
  "Comment posted": "Đã đăng bình luận",
  "Error: ": "Lỗi: ",
  "Please try again": "Thử lại",
  "Comment updated": "Đã cập nhật bình luận",
  "Could not update": "Lỗi cập nhật",
  "Confirm delete": "Xác nhận xóa",
  "Delete this comment and its attachments?": "Bạn có chắc chắn muốn xóa bình luận này và các tệp đính kèm không?",
  "Delete these files?": "Bạn có chắc chắn muốn xóa các tệp này không?",
  "Delete": "Xóa",
  "Cancel": "Hủy",
  "Deleted": "Đã xóa",
  "Could not delete": "Lỗi khi xóa",
  "Document name updated": "Đã cập nhật tên tài liệu",
  "Failed to update name": "Lỗi cập nhật tên",
  "File": "Tệp",
  "Original file: {0}": "File gốc: {0}",
  "Save": "Lưu",
  "Hide preview": "Ẩn preview",
  "Xem preview": "Show preview",
  "▲ Collapse": "▲ Thu nhỏ",
  "▼ Preview": "▼ Preview",
  "Download": "Tải về",
  "System": "Hệ thống",
  "Save changes": "Lưu thay đổi",
  "Quote:": "Trích dẫn:",
  "Mentioned:": "Đã nhắc đến:",
  "Reply": "Phản hồi",
  "Edit": "Chỉnh sửa",
  "▲ Collapse replies": "▲ Thu gọn phản hồi",
  "▼ Show {0} replies": "▼ Xem {0} phản hồi",
  "Pending": "Chờ gửi",
  "Note:": "Nội dung ghi chú:",
  "Replying to ": "Đang trả lời ",
  "Attached document": "Tài liệu đính kèm",
  "Sending...": "Đang gửi...",
  "No comments or documents yet": "Chưa có bình luận hay tài liệu nào",
  "▲ Collapse (showing {0} of {1})": "▲ Rút gọn (hiện {0} trong {1})",
  "▼ View {0} more comments ({1} total)": "▼ Xem thêm {0} bình luận (tổng {1})",
  "⬇️ Download": "⬇️ Tải về",
  "Close": "Đóng",
  "This format cannot be previewed — download it to open": "Không thể xem trước định dạng này — vui lòng tải về để mở",
  "Upload failed": "Upload thất bại",
  "Choose a file or enter a Drive URL": "Vui lòng chọn file hoặc nhập Drive URL",
  "✅ Updated successfully!": "✅ Cập nhật thành công!",
  "✅ Upload successful!": "✅ Upload thành công!",
  "✏️ Update document": "✏️ Cập nhật tài liệu",
  "📎 Attach document": "📎 Đính kèm tài liệu",
  "Updating...": "Đang cập nhật...",
  "Processing...": "Đang xử lý...",
  "Update": "Cập nhật",
  "Confirm attachment": "Xác nhận đính kèm",
  "Upload": "Tải lên",
  "Identification": "Định danh",
  "Document type": "Loại văn bản",
  "Enter the document type": "Vui lòng nhập loại văn bản",
  "e.g. Hợp đồng, Biên bản...": "VD: Hợp đồng, Biên bản...",
  "Document name": "Tên tài liệu",
  "Full document name (the file name if left blank)": "Nhập tên đầy đủ của tài liệu (Sẽ lấy tên file nếu bỏ trống)",
  "Document number": "Số hiệu",
  "e.g. 123/2024/HĐ": "VD: 123/2024/HĐ",
  "Issue date": "Ngày ban hành",
  "Signed date": "Ngày ký",
  "Effective date": "Ngày hiệu lực",
  "Parties": "Bên liên quan",
  "Sender": "Người gửi",
  "Sending person / organisation": "Tên cá nhân / tổ chức gửi",
  "Recipient": "Người nhận",
  "Receiving person / organisation": "Tên cá nhân / tổ chức nhận",
  "Content summary": "Tóm tắt nội dung",
  "A short description of the main content...": "Mô tả ngắn gọn nội dung chính...",
  "Attachment": "File đính kèm",
  "Replace file (optional)": "Thay file mới (tuỳ chọn)",
  "Choose file": "Chọn file",
  "Drag and drop or ": "Kéo thả hoặc ",
  "click to choose": "click để chọn",
  "Google Drive URL (optional)": "Google Drive URL (tuỳ chọn)",
  "Enter a note...": "Nhập ghi chú...",
  "✅ Next step saved": "✅ Đã lưu bước tiếp theo",
  "Save failed": "Lưu thất bại",
  "(No next step yet)": "(Chưa có bước tiếp theo)",
  "e.g.: Draft the LoA per the Detailed outline, send to client for review...": "VD: Khải soạn LoA theo Detailed outline, gửi khách hàng review...",
  "Unsaved": "Chưa lưu",
  "Saving...": "Đang lưu...",
  "💾 Save": "💾 Lưu",
  "✓ Saved": "✓ Đã lưu",
  "✅ Saved": "✅ Đã lưu",
  "(No content yet)": "(Chưa có nội dung)",
  "Enter progress details...": "Nhập nội dung diễn biến...",
  "Search lawyer...": "Tìm luật sư...",
  "Unassign": "Huỷ phân công",
  "{0} ₫/hr": "{0} ₫/giờ",
  "Choose the approving lawyer": "Chọn luật sư duyệt",
  "No service assigned": "Chưa gắn dịch vụ",
  "Service #": "Dịch vụ #",
  "Search tasks by name...": "Tìm công việc theo tên...",
  "No tasks found": "Không có công việc nào",
  "Select a prerequisite task...": "Chọn công việc điều kiện...",
  "❌ Reject timesheet": "❌ Từ chối timesheet",
  "Rejection reason": "Lý do từ chối",
  "Enter a reason (optional)...": "Nhập lý do (tuỳ chọn)...",
  "❌ Confirm rejection": "❌ Xác nhận từ chối",
  "Please select the start time": "Vui lòng chọn thời điểm bắt đầu",
  "Please enter the hours worked": "Vui lòng nhập số giờ thực hiện",
  "Hours must not exceed 24": "Số giờ không được vượt quá 24",
  "The start time cannot be more than 24 hours in the future": "Thời điểm bắt đầu không được quá 24 giờ trong tương lai",
  "⛔ Overlaps timesheet {0} → {1}": "⛔ Trùng thời gian với timesheet {0} → {1}",
  "✅ Updated": "✅ Đã cập nhật",
  "✅ Saved (Draft)": "✅ Đã lưu (Nháp)",
  "📤 Sent for approval": "📤 Đã gửi duyệt",
  "Error": "Lỗi",
  "✅ Approved": "✅ Đã duyệt",
  "❌ Rejected": "❌ Đã từ chối",
  "📝 Moved back to draft": "📝 Đã chuyển về nháp",
  "⏱ Total hours:": "⏱ Tổng giờ:",
  "estimated {0}": "dự kiến {0}",
  "⏱ Estimated:": "⏱ Dự kiến:",
  "⚡ Productivity:": "⚡ Năng suất:",
  "＋ Add": "＋ Thêm",
  "A timesheet is still running": "Đang có timesheet chưa kết thúc",
  "No timesheet yet — press ＋ Add to start": "Chưa có timesheet — nhấn ＋ Thêm để bắt đầu",
  "⏳ Running": "⏳ Đang chạy",
  "Rejection reason: ": "Lý do từ chối: ",
  "📤 Send for approval": "📤 Gửi duyệt",
  "✅ Approve": "✅ Duyệt",
  "❌ Reject": "❌ Từ chối",
  "✏️ Edit": "✏️ Sửa",
  "📝 Back to draft": "📝 Về nháp",
  "🗑 Delete": "🗑 Xoá",
  "✏️ Update timesheet": "✏️ Cập nhật timesheet",
  "⏱ Log work hours": "⏱ Ghi nhận giờ làm việc",
  "👨‍⚖️ Lawyer": "👨‍⚖️ Luật sư",
  "(you)": "(bạn)",
  "🕐 Start time *": "🕐 Thời điểm bắt đầu *",
  "⚡ Use the current time": "⚡ Dùng thời điểm hiện tại",
  "⏱ Hours worked *": "⏱ Số giờ thực hiện *",
  "e.g. 2 or 1.5": "VD: 2 hoặc 1.5",
  "hours": "giờ",
  "⛔ Overlaps:": "⛔ Trùng thời gian:",
  "📊 Total after saving:": "📊 Tổng sau khi lưu:",
  "⚡ Productivity (estimated {0}):": "⚡ Năng suất (dự kiến {0}):",
  "📝 Description": "📝 Mô tả",
  "Short description...": "Mô tả ngắn gọn...",
  "The timesheet will be saved with status ": "Timesheet sẽ được lưu với trạng thái ",
  "\"Draft\"": "\"Nháp\"",
  "💾 Save draft": "💾 Lưu nháp",
  "edited a comment": "đã chỉnh sửa bình luận",
  "deleted a comment": "đã xóa bình luận",
  "uploaded files": "đã tải lên tệp",
  "commented": "đã bình luận",
  "edited": "đã chỉnh sửa",
  "deleted": "đã xóa bỏ",
  "uploaded": "đã tải lên",
  "acted": "đã thực hiện",
  "Comment + {0} files": "Bình luận + {0} tệp",
  "Comment + mentions": "Bình luận + nhắc tên",
  "{0} files": "{0} tệp",
  "Attached file": "Tệp đính kèm",
  "Mention": "Nhắc tên",
  "replied to {0}:": "đã phản hồi {0}:",
  "Comment content:": "Nội dung bình luận:",
  "↓ changed to ↓": "↓ thay đổi thành ↓",
  "(Note mentions someone)": "(Ghi chú có nhắc tên)",
  "Mentioned people:": "Đã nhắc đến ai:",
  "Attached file:": "Tệp đính kèm:",
  "(No name yet)": "(Chưa có tên)",
  "DOWNLOAD": "TẢI VỀ",
  "data": "dữ liệu",
  "created {0}": "đã tạo {0}",
  "deleted {0}": "đã xóa {0}",
  "updated {0}": "đã cập nhật {0}",
  " {0} at ": " {0} lúc ",
  "Value:": "Giá trị:",
  "Edited the comment and its mentions": "Sửa nội dung bình luận và cập nhật người được nhắc",
  "Edited the comment": "Sửa nội dung bình luận",
  "Updated the comment's mentions": "Cập nhật người được nhắc trong bình luận",
  "Deleted the comment": "Xóa bình luận",
  "Replied to {0}'s comment": "Phản hồi bình luận của {0}",
  "Uploaded {0} attached files": "Tải lên {0} tệp đính kèm",
  "Uploaded an attached file": "Tải lên tệp đính kèm",
  "Created a comment with related details": "Tạo bình luận kèm thông tin liên quan",
  "Created a comment": "Tạo bình luận",
  "Action:": "Hành động:",
  "{0} at {1}": "{0} lúc {1}",
  "updated [{0}]": "cập nhật [{0}]",
  "deleted [{0}]": "đã xóa [{0}]",
  "Activity history": "Lịch sử hoạt động",
  "No activity yet": "Chưa có hoạt động nào",
  "▼ View {0} more activities ({1} total)": "▼ Xem thêm {0} hoạt động (tổng {1})",
  "Must complete \"{0}\" first": "Cần hoàn thành \"{0}\" trước",
  "Status: {0}": "Trạng thái: {0}",
  "Update failed!": "Lỗi cập nhật!",
  "Priority updated": "Đã cập nhật ưu tiên",
  "Name updated": "Đã cập nhật tên",
  "Estimated duration updated": "Đã cập nhật thời gian dự kiến",
  "Requires approval": "Cần phê duyệt",
  "Overdue": "Quá hạn",
  "No attached files yet.": "Chưa có tệp đính kèm nào.",
  "Document name: ": "Tên tài liệu: ",
  "Log Timesheet": "Ghi nhận Timesheet",
  "General information": "Thông tin chung",
  "Number of hours...": "Số giờ...",
  "Assignee": "Người phụ trách",
  "Not required": "Không yêu cầu",
  "Select...": "Chọn...",
  "Time worked": "Thời gian thực hiện",
  "Work description": "Mô tả công việc",
  "Prerequisite task (Pending Issue)": "Công việc điều kiện (Pending Issue)",
  "Template files": "Tệp đính kèm file mẫu",
  "No template files yet.": "Chưa có file mẫu nào.",
  "Comments & Reports": "Bình luận & Báo cáo",
  "Work hour history": "Lịch sử giờ làm việc",
  "Type": "Loại",
  "Subtask": "Công việc phụ",
  "Main task": "Công việc chính",
  "Task name": "Tên công việc",
  "Description": "Mô tả",
  "✓ None": "✓ Không có",
  "✓ Done": "✓ Đã xong",
  "Start": "Bắt đầu",
  "Not selected": "Chưa chọn",
  "Update failed": "Cập nhật thất bại",
  "No project linked": "Chưa gắn dự án",
  "Service #{0}": "Dịch vụ #{0}",
  "Admin": "Admin",
  "Unknown": "Chưa xác định",
  "No lawyer profile linked": "Chưa liên kết hồ sơ luật sư",
  "↻ Refresh": "↻ Làm mới",
  "Loading...": "Đang tải...",
  "{0}/{1} done ({2}%)": "{0}/{1} hoàn thành ({2}%)",
  "📅 {0} due today": "📅 {0} đến hạn hôm nay",
  "⚠ {0} overdue": "⚠ {0} quá hạn",
  "🔍 Search task name...": "🔍 Tìm tên công việc...",
  "📁 All cases": "📁 Tất cả hồ sơ",
  "Untitled": "Không tên",
  "All": "Tất cả",
  "Loading data...": "Đang tải dữ liệu...",
  "No results found": "Không tìm thấy kết quả",
  "No tasks assigned yet.": "Chưa có công việc nào được phân công.",
  "{0} items": "{0} mục",
  "📅 {0} today": "📅 {0} hôm nay",
  "{0} items in total": "Tổng cộng {0} mục",
  "Show 5 more cases ⬇": "Xem thêm 5 hồ sơ ⬇",
  "Show less ⬆": "Rút gọn ⬆",
  "👤 Updated by: ": "👤 Cập nhật bởi: ",
  "👤 Attached by: ": "👤 Đính kèm bởi: ",
};
// ---- end ui language ----
const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);

const { React } = ctx;
const { useState, useEffect, useCallback, useMemo, useRef } = React;
const {
  Spin,
  Typography,
  Modal,
  message,
  Input,
  Select,
  Upload,
  Form,
  Button,
  Tag,
} = ctx.antd;
const { Text } = Typography;
const { Table, Tooltip, Empty, Drawer, Descriptions, Avatar } = ctx.antd;
const FONT = "Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const STATUS_CFG = {
  toDo: {
    label: tr("To do"),
    color: "#595959",
    bg: "#f5f5f5",
    border: "#d9d9d9",
  },
  inProgress: {
    label: tr("In progress"),
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

const SERVICE_COLORS = [
  { bg: "#e6f4ff", border: "#91caff", text: "#096dd9", dot: "#1890ff" },
  { bg: "#f9f0ff", border: "#d3adf7", text: "#531dab", dot: "#722ed1" },
  { bg: "#e6fffb", border: "#87e8de", text: "#006d75", dot: "#13c2c2" },
  { bg: "#fff7e6", border: "#ffd591", text: "#d46b08", dot: "#fa8c16" },
  { bg: "#f6ffed", border: "#b7eb8f", text: "#237804", dot: "#52c41a" },
  { bg: "#fff1f0", border: "#ffa39e", text: "#a8071a", dot: "#f5222d" },
];

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
const getStatusKeys = (hasApproval) =>
  hasApproval ? STATUS_KEYS_WITH_APPROVAL : STATUS_KEYS_WITHOUT_APPROVAL;

const resolveStatus = (newStatus, item) => {
  if (newStatus === "done" && item?.isRequiredApproval) return "pending";
  return newStatus;
};
const PRIORITY_CFG = {
  high: { label: tr("High"), color: "#cf1322", bg: "#fff1f0", icon: "↑↑" },
  medium: { label: tr("Medium"), color: "#d46b08", bg: "#fff7e6", icon: "↑" },
  low: { label: tr("Low"), color: "#389e0d", bg: "#f6ffed", icon: "↓" },
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

const FIELD_LABEL = {
  title: tr("Title"),
  status: tr("Status"),
  priority: tr("Priority"),
  lawyerId: tr("Lawyer"),
  dueDate: tr("Deadline"),
  startDate: tr("Start date"),
  closedDate: tr("Completion date"),
  description: tr("Progress details"),
  body: tr("Note content"),
  estimatedDuration: tr("Estimated duration"),
  previousTaskId: tr("Pending Issue"),
  nextStepDescription: tr("Next Step"),
  approvedById: tr("Approver"),
  approvedAt: tr("Approval assigned date"),
  acceptedAt: tr("Approval date"),
  isRequiredApproval: tr("Approval required"),
  notes: tr("Comment"),
  documents: tr("Document"),
  isDeleted: tr("Deleted status"),
  assignedLawyerId: tr("By"),
};

const ACTIVITY_FIELD_LABELS = {
  notes: tr("Note"),
  body: tr("Content"),
  documents: tr("Document"),
  title: tr("Title"),
  status: tr("Status"),
  assignedLawyerId: tr("By"),
  assignees: tr("Assignees"),
};



const extractId = (val) => {
  if (val === null || val === undefined || val === '') return null;
  if (Array.isArray(val)) return val.length > 0 ? extractId(val[0]) : null;
  if (typeof val === 'object') return val.id ? parseInt(val.id, 10) : null;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
};

const TS_STATUS_CFG = {
  draft: {
    label: tr("Draft"),
    color: "#8c8c8c",
    bg: "#f5f5f5",
    border: "#d9d9d9",
    icon: "📝",
  },
  submitted: {
    label: tr("Pending approval"),
    color: "#d46b08",
    bg: "#fff7e6",
    border: "#ffd591",
    icon: "📤",
  },
  approved: {
    label: tr("Approved"),
    color: "#389e0d",
    bg: "#f6ffed",
    border: "#b7eb8f",
    icon: "✅",
  },
  rejected: {
    label: tr("Rejected"),
    color: "#cf1322",
    bg: "#fff1f0",
    border: "#ffa39e",
    icon: "❌",
  },
};

const DOC_TYPE_OPTIONS = [
  { value: "task_doc", label: tr("Task document") },
  { value: "meeting_note", label: tr("Meeting minutes") },
  { value: "contract", label: tr("Contract") },
  { value: "evidence", label: tr("Evidence / Records") },
  { value: "other", label: tr("Other") },
];
const DOC_TYPE_CFG = {
  task_doc: { label: tr("Task"), color: "cyan" },
  meeting_note: { label: tr("Minutes"), color: "blue" },
  contract: { label: tr("Contract"), color: "purple" },
  evidence: { label: tr("Records"), color: "orange" },
  other: { label: tr("Other"), color: "default" },
};
const FILE_EXT_ICON = {
  ".pdf": "📄",
  ".doc": "📝",
  ".docx": "📝",
  ".xls": "📊",
  ".xlsx": "📊",
  ".png": "🖼️",
  ".jpg": "🖼️",
  ".jpeg": "🖼️",
};
const getFileIcon = (ext) => FILE_EXT_ICON[(ext || "").toLowerCase()] || "📎";

// utils
const fmt = (iso, mode) => {
  if (!iso) return null;
  const d = new Date(iso),
    dd = d.getDate().toString().padStart(2, "0"),
    mm = (d.getMonth() + 1).toString().padStart(2, "0"),
    yy = d.getFullYear(),
    hh = d.getHours().toString().padStart(2, "0"),
    mi = d.getMinutes().toString().padStart(2, "0");
  if (mode === "full") return `${dd}/${mm}/${yy} ${hh}:${mi}`;
  if (mode === "date") return `${dd}/${mm}/${yy}`;
  return `${dd}/${mm}`;
};
const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return tr("just now");
  if (diff < 3600) return tr("{0} min ago", { 0: Math.floor(diff / 60) });
  if (diff < 86400) return tr("{0} hours ago", { 0: Math.floor(diff / 3600) });
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
const fmtVND = (n) =>
  !n && n !== 0 ? "—" : Number(n).toLocaleString("vi-VN") + " ₫";
const fmtHours = (h) => {
  if (!h && h !== 0) return "—";
  const hrs = Math.floor(h),
    mins = Math.round((h - hrs) * 60);
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

const FILE_EXT_INFO = {
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
const getExtInfo = (ext) =>
  FILE_EXT_INFO[(ext || "").toLowerCase()] || {
    icon: "📎",
    color: "#8c8c8c",
    bg: "#fafafa",
  };

const formatActivityValue = (val) => {
  if (!val) return val;
  const statusMap = {
    toDo: tr("To do"),
    inProgress: tr("In progress"),
    blocked: tr("Waiting"),
    pending: tr("Pending approval"),
    approval: tr("Approved"),
    done: tr("Done"),
    cancelled: tr("Cancelled"),
  };
  if (statusMap[val]) return statusMap[val];
  const priorityMap = { high: tr("High"), medium: tr("Medium"), low: tr("Low") };
  if (priorityMap[val]) return priorityMap[val];
  if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return fmt(val, "full");
    } catch {}
  }
  return val;
};

const userName = (u) =>
  u?.nickname ||
  `${u?.firstName || ""} ${u?.lastName || ""}`.trim() ||
  u?.username ||
  u?.email ||
  null;
const calcWRFromTotal = (estimatedDuration, totalHours) => {
  if (
    !estimatedDuration ||
    estimatedDuration <= 0 ||
    !totalHours ||
    totalHours <= 0
  )
    return null;
  return Math.round((estimatedDuration / totalHours) * 100);
};
const wrCfg = (rate) => {
  if (rate == null) return { label: "—", color: "#8c8c8c", bg: "#f5f5f5" };
  if (rate >= 120)
    return { label: tr("{0}% Excellent", { 0: rate }), color: "#389e0d", bg: "#f6ffed" };
  if (rate >= 90)
    return { label: tr("{0}% On track", { 0: rate }), color: "#096dd9", bg: "#e6f4ff" };
  if (rate >= 70)
    return { label: tr("{0}% Slow", { 0: rate }), color: "#d46b08", bg: "#fff7e6" };
  return { label: tr("{0}% Poor", { 0: rate }), color: "#cf1322", bg: "#fff1f0" };
};

// api
async function apiReq(url, method, data) {
  return ctx.api.request({ url, method: method || "POST", data });
}
async function fetchAll(url, fields, filter) {
  try {
    const params = { pageSize: 500, page: 1 };
    if (fields) params.fields = fields;
    if (filter) params.filter = JSON.stringify(filter);
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
    const res = await ctx.api.request({
      url: "activity_log:list",
      params: {
        pageSize: 200,
        page: 1,
        sort: ["-id"],
        filter: JSON.stringify({
          $and: [
            { collectionName: { $eq: normalized } },
            { recordId: { $eq: recordId } },
          ],
        }),
      },
    });
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
    const res = await ctx.api.request({
      url: "notes:list",
      params: {
        pageSize: 100,
        page: 1,
        sort: ["-createdAt"],
        filter: JSON.stringify(filter),
        fields:
          "id,title,body,batchId,linkedUrl,collectionName,recordId,createdAt,updatedAt,createdById,replyText,parentId,isDeleted",
        appends: ["createdBy", "updatedBy", "assignees", "parent"],
      },
    });
    return res?.data?.data || [];
  } catch {
    return [];
  }
}
async function fetchFiles(collectionName, recordId, includeDeleted = false) {
  try {
    const filter = {
      $and: [
        { collectionName: { $eq: collectionName } },
        { recordId: { $eq: parseInt(recordId) } },
      ],
    };
    if (!includeDeleted) {
      filter.$and.push({ isDeleted: { $ne: true } });
    }
    const res = await ctx.api.request({
      url: "documents:list",
      params: {
        pageSize: 100,
        page: 1,
        sort: ["-createdAt"],
        filter: JSON.stringify(filter),
        fields:
          "id,title,documentCode,documentType,batchId,collectionName,recordId,googleDriveUrl,note,createdAt,updatedAt,createdById,isDeleted",
        appends: ["fileAttachment", "createdBy", "updatedBy"],
      },
    });
    return res?.data?.data || [];
  } catch {
    return [];
  }
}
async function fetchTS(filter) {
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
async function createTS(p) {
  return apiReq("timesheets:create", "POST", p);
}
async function updateTS(id, p) {
  return ctx.api.request({
    url: "timesheets:update",
    method: "POST",
    params: { filterByTk: id },
    data: p,
  });
}
async function deleteTS(id) {
  return ctx.api.request({
    url: "timesheets:destroy",
    method: "POST",
    params: { filterByTk: id },
  });
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
      changedByName: changedByName || "Hệ thống",
      changedAt: now,
      createdAt: now, // 🌟 Đồng bộ createdAt
      batchId: batchId || null,
      dataId: dataId || null,
    });
  } catch {}
}

async function logAct(col, id, action, field, oldV, newV, who, batchId, dataId = null, timestamp = null) {
  return logActivity(col, id, action, field, oldV, newV, who, batchId, dataId, timestamp);
}

const tF = (f) => {
  const map = {
    title: tr("Title"), status: tr("Status"), priority: tr("Priority"), lawyerId: tr("Lawyer"),
    dueDate: tr("Deadline"), startDate: tr("Start date"), closedDate: tr("Completion date"),
    description: tr("Progress details"), estimatedDuration: tr("Estimated duration"),
    previousTaskId: tr("Prerequisite task"), nextStepDescription: tr("Next step"),
    approvedById: tr("Approver"), isRequiredApproval: tr("Approval required"),
  };
  return map[f] || f;
};

// shared components
const Av = ({ name, color, size = 20 }) =>
  React.createElement('div', {
    title: name,
    style: {
      width: size, height: size, borderRadius: '50%', background: color || '#8c8c8c',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, color: '#fff', fontWeight: 500, flexShrink: 0,
    },
  }, (name || '?').charAt(0).toUpperCase());

const SBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.toDo;
  return React.createElement('span', {
    style: {
      fontSize: 12, fontFamily: FONT, fontWeight: 500, padding: '2px 8px',
      borderRadius: 3, background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap',
    },
  }, cfg.label);
};

const ReloadButton = ({ onReload, loading, text=tr("Refresh"), style={}}) =>{
  return React.createElement(Button, {
    size:'medium',
    onClick: onReload,
    loading: loading,
    style:{
      padding: '5px 16px',
      fontFamily: FONT, fontSize: 12, borderRadius: 4,
      display: 'inline-flex', alignItems: 'center',
      justifyContent: 'center', ...style
    }
  }, !loading ? `↻ ${text}` : text);
}

// ============================================================
// Rich text comment editor synced from TaskManagement.js
// ============================================================
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
          placeholder: placeholder || tr("Write a comment..."),
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
          uploadBtn.title = tr("Attach document");
        }

        // Add Tooltips to Quill toolbar buttons
        const tooltipMap = {
          ".ql-bold": tr("Bold (Ctrl+B)"),
          ".ql-italic": tr("Italic (Ctrl+I)"),
          ".ql-underline": tr("Underline (Ctrl+U)"),
          ".ql-strike": tr("Strikethrough"),
          '.ql-indent[value="-1"]': tr("Decrease indent"),
          '.ql-indent[value="+1"]': tr("Increase indent"),
          ".ql-blockquote": tr("Blockquote"),
          ".ql-code-block": tr("Code block"),
          '.ql-list[value="ordered"]': tr("Numbered list"),
          '.ql-list[value="bullet"]': tr("Bullet list"),
          ".ql-link": tr("Insert link"),
          ".ql-clean": tr("Clear formatting"),
        };
        Object.entries(tooltipMap).forEach(([selector, title]) => {
          const el = containerRef.current.parentElement.querySelector(selector);
          if (el) el.setAttribute("title", title);
        });
        const headerPicker = containerRef.current.parentElement.querySelector(
          ".ql-size .ql-picker-label",
        );
        if (headerPicker) headerPicker.setAttribute("title", tr("Font size"));
        const alignPicker = containerRef.current.parentElement.querySelector(
          ".ql-align .ql-picker-label",
        );
        if (alignPicker) alignPicker.setAttribute("title", tr("Alignment"));

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
        setError(tr("Could not load the editor. Check your network connection."));
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
            tr("Loading editor..."),
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
        tr("Mention someone"),
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
              placeholder: tr("Search lawyer name..."),
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
                tr("No results"),
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

const UnifiedNoteThread = ({
  collectionName,
  recordId,
  currentUser,
  lawyers,
  canEdit = true,
  projectFolderId,
  onFilesUpdate,
  refreshTrigger,
  caseId = null, // 🌟 Bổ sung caseId để tạo deep-link
}) => {
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
  const [pendingBatchId, setPendingBatchId] = useState(
    () => `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  );
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editBody, setEditBody] = useState("");
  const [editAssignedIds, setEditAssignedIds] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedThreads, setExpandedThreads] = useState({});
  const [showAll, setShowAll] = useState(false);
  const INITIAL_COUNT = 10;
  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchNotes(collectionName, recordId),
      fetchFiles(collectionName, recordId),
    ]).then(([notes, files]) => {
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
    (n.createdById ? tr("User #{0}", { 0: n.createdById }) : tr("Anonymous"));
  const warnMentionOnly = () => {
    message.warning(tr("Enter the comment before mentioning anyone."));
  };
  const handleSend = async () => {
    const hasText = getCommentText(body, true).length > 0;
    const hasFiles = pendingDocs.length > 0;
    if (assignedIds.length > 0 && !hasText) {
      warnMentionOnly();
      return;
    }
    if (!hasText && !hasFiles) return;
    setSending(true);
    const batchId = pendingBatchId;
    try {
      // ── BƯỚC 1: Tạo Note với batchId ─────────────────────────
      const currentPath = window.location.origin + window.location.pathname;
      const linkedUrl = `${currentPath}`;
      const currentTime = new Date().toISOString(); // 🌟 Thời gian đồng bộ
      const noteRes = await apiReq("notes:create", "POST", {
        collectionName,
        recordId,
        title: "Bình luận",
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
            ? "Tài liệu đính kèm"
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
          currentUser?.nickname || currentUser?.username || "Hệ thống",
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
          currentUser?.nickname || currentUser?.username || "Hệ thống",
          batchId,
          noteId,
          currentTime,
        );
      }

      // ── BƯỚC 2: Tạo Document records cùng batchId ────────────
      if (hasFiles) {
        const toISO = (val) => {
          if (!val) return null;
          const d = new Date(val);
          return isNaN(d.getTime()) ? null : d.toISOString();
        };
        for (const pDoc of pendingDocs) {
          let attIds = pDoc.attIds || null;
          if (!attIds && pDoc.file) {
            const fd = new window.FormData();
            fd.append("file", pDoc.file, pDoc.fileName || pDoc.file.name || "file");
            const uploadRes = await ctx.api.request({
              url: "attachments:create",
              method: "POST",
              params: { attachmentField: "documents.fileAttachment" },
              data: fd,
              headers: { "Content-Type": "multipart/form-data" },
            });
            if (uploadRes?.data?.data?.id) {
              attIds = [{ id: uploadRes.data.data.id }];
            }
          }
          await apiReq("documents:create", "POST", {
            documentType: pDoc.metadata.documentType?.trim() || "",
            documentCode: pDoc.metadata.documentCode?.trim() || "",
            title: pDoc.metadata.title?.trim() || pDoc.fileName,
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
            collectionName,
            recordId: parseInt(recordId),
            folderId: extractId(projectFolderId),
            createdById: currentUser?.id || null,
            createdAt: new Date().toISOString(),
            batchId,
            ...(attIds && { fileAttachment: attIds }),
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
      message.success(tr("Comment posted"));
    } catch (e) {
      message.error(tr("Error: ") + (e?.message || tr("Please try again")));
    }
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
          currentUser?.nickname || currentUser?.username || "Hệ thống";
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
      message.success(tr("Comment updated"));
    } catch (e) {
      message.error(tr("Could not update"));
    }
  };

  const handleDeleteNote = (item) => {
    const { note, files } = item;
    Modal.confirm({
      title: tr("Confirm delete"),
      content: note
        ? tr("Delete this comment and its attachments?")
        : tr("Delete these files?"),
      okText: tr("Delete"),
      cancelText: tr("Cancel"),
      okType: "danger",
      onOk: async () => {
        try {
          const currentTime = new Date().toISOString();
          const actionBatchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; // 🌟 BatchId riêng cho việc xóa
          const userName =
            currentUser?.nickname || currentUser?.username || "Hệ thống";

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
          message.success(tr("Deleted"));
        } catch (e) {
          message.error(tr("Could not delete"));
        }
      },
    });
  };

  const [editingFileId, setEditingFileId] = useState(null);
  const [editFileTitle, setEditFileTitle] = useState("");
  const [expandedPreviews, setExpandedPreviews] = useState({});

  const handleSaveFileTitle = async (f) => {
    const newTitle = editFileTitle.trim();
    if (!newTitle) return;
    try {
      const actionBatchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const oldTitle = f.title || "";

      await apiReq(`documents:update?filterByTk=${f.id}`, "POST", {
        title: newTitle,
        batchId: actionBatchId,
      });

      // 🌟 Log thủ công vì SQL trigger chặn update title của documents
      const userName =
        currentUser?.nickname || currentUser?.username || "Hệ thống";
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
            file.id === f.id ? { ...file, title: newTitle } : file,
          ),
        })),
      );
      message.success(tr("Document name updated"));
    } catch (e) {
      message.error(tr("Failed to update name"));
    }
    setEditingFileId(null);
    setEditFileTitle("");
  };

  const renderFileRow = (f) => {
    const att = Array.isArray(f.fileAttachment)
      ? f.fileAttachment[0]
      : f.fileAttachment;
    const ext = att?.extname
      ? att.extname.startsWith(".")
        ? att.extname.toLowerCase()
        : "." + att.extname.toLowerCase()
      : "";
    const rawFilename = att?.filename || tr("File");
    const displayTitle = f.title || att?.title || rawFilename;
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
    ].includes(ext);
    const canIframe = isPdf || isImage || isOffice;
    const isExpanded = !!expandedPreviews[f.id];
    const isEditingThisFile = editingFileId === f.id;
    const isMine = currentUser && f.createdById === currentUser.id;

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
                onClick: fullUrl ? () => setPreviewDoc(f) : undefined,
                title: tr("Original file: {0}", { 0: rawFilename }),
                style: {
                  fontSize: 13,
                  fontFamily: FONT,
                  fontWeight: 600,
                  color: "#096dd9",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  cursor: fullUrl ? "pointer" : "default",
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
                tr("Save"),
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
                tr("Cancel"),
              ),
            )
          : React.createElement(
              React.Fragment,
              null,
              canIframe &&
                React.createElement(
                  "span",
                  {
                    onClick: () =>
                      setExpandedPreviews((prev) => ({
                        ...prev,
                        [f.id]: !prev[f.id],
                      })),
                    title: isExpanded ? tr("Hide preview") : tr("Xem preview"),
                    style: {
                      fontSize: 12,
                      padding: "2px 8px",
                      cursor: "pointer",
                      color: "#595959",
                      border: "1px solid #d9d9d9",
                      borderRadius: 4,
                      flexShrink: 0,
                      fontWeight: 500,
                    },
                  },
                  isExpanded ? tr("▲ Collapse") : tr("▼ Preview"),
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
                      fontWeight: 600,
                      color: "#531dab",
                      cursor: "pointer",
                      flexShrink: 0,
                      padding: "2px 8px",
                      background: "#f9f0ff",
                      borderRadius: 4,
                      border: "1px solid #d3adf7",
                    },
                  },
                  tr("Download"),
                ),
              isMine &&
                canEdit &&
                React.createElement(
                  "span",
                  {
                    onClick: () => {
                      setEditingFileId(f.id);
                      setEditFileTitle(displayTitle);
                    },
                    style: {
                      fontSize: 12,
                      padding: "2px 8px",
                      cursor: "pointer",
                      color: "#8c8c8c",
                      border: "1px solid #d9d9d9",
                      borderRadius: 4,
                      flexShrink: 0,
                    },
                  },
                  "✏️",
                ),
            ),
      ),
      // ── Inline iframe preview ─────────────────────────────────
      isExpanded &&
        fullUrl &&
        React.createElement(
          "div",
          { style: { borderTop: "1px solid #f0f0f0", background: "#f8f9fa" } },
          isPdf
            ? React.createElement("iframe", {
                src: fullUrl,
                style: {
                  width: "100%",
                  height: 420,
                  border: "none",
                  display: "block",
                },
                title: displayTitle,
              })
            : isImage
              ? React.createElement("img", {
                  src: fullUrl,
                  alt: displayTitle,
                  style: {
                    width: "100%",
                    maxHeight: 400,
                    objectFit: "contain",
                    display: "block",
                    background: "#fff",
                  },
                })
              : isOffice
                ? React.createElement("iframe", {
                    src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`,
                    style: {
                      width: "100%",
                      height: 600,
                      border: "none",
                      display: "block",
                    },
                    title: displayTitle,
                  })
                : null,
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
        : tr("System");
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
    const isExpanded = expandedThreads[note?.id];

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
            gap: 12,
            padding: "16px 20px",
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
                    tr("Cancel"),
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
                    tr("Save changes"),
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
                        background: "#f8f9fa",
                        borderRadius: 8,
                        padding: "12px 14px",
                        borderLeft: "3px solid #1890ff",
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
                          tr("Quote:"),
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
                          tr("Mentioned:"),
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
                    ...files.map((f) => renderFileRow(f)),
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
                        tr("Reply"),
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
                          tr("Edit"),
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
                          tr("Delete"),
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
                setExpandedThreads((p) => ({ ...p, [note.id]: !p[note.id] })),
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
              ? tr("▲ Collapse replies")
              : tr("▼ Show {0} replies", { 0: replies.length }),
            !isExpanded &&
              React.createElement(
                Avatar.Group,
                { size: "small", maxCount: 3 },
                replies.map((r, i) =>
                  React.createElement(Av, {
                    key: i,
                    name: r.note ? authorName(r.note) : tr("Anonymous"),
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
        const name = doc.metadata.title || doc.fileName || tr("Document");
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
              tr("Pending"),
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
                tr("Note:"),
              ),
              doc.metadata.note,
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
              tr("Replying to "),
              replyingTo.note ? authorName(replyingTo.note) : tr("Document"),
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
                : tr("Attached document"),
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
      renderPendingChips(),
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
          sending ? tr("Sending...") : tr("Comment"),
        ),
      ),
    );
  };

  return React.createElement(
    "div",
    { style: { height: "100%", overflowY: "auto", background: "#fff" } },
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
              tr("No comments or documents yet"),
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
                    ? tr("▲ Collapse (showing {0} of {1})", { 0: INITIAL_COUNT, 1: feed.length })
                    : tr("▼ View {0} more comments ({1} total)", { 0: feed.length - INITIAL_COUNT, 1: feed.length }),
                ),
            ),
    ),
    previewDoc &&
      React.createElement(PreviewModal, {
        doc: previewDoc,
        onClose: () => setPreviewDoc(null),
      }),
    React.createElement(FileUploadModal, {
      open: showUploadModal,
      onClose: () => setShowUploadModal(false),
      onAddPending: (newDocData) =>
        setPendingDocs((prev) => [...prev, newDocData]),
      collectionName,
      recordId,
      currentUser,
      currentLawyerId,
      lawyers,
      projectFolderId,
    }),
  );
};



const PreviewModal = ({ doc, onClose }) => {
  if (!doc) return null;
  const attachment = Array.isArray(doc.fileAttachment) ? doc.fileAttachment[0] : doc.fileAttachment;
  const fileUrl  = attachment?.url || attachment?.preview;
  const fullUrl  = getFullUrl(fileUrl);
  const rawName    = doc.title || attachment?.title || attachment?.filename || tr("File");
  const extFromAtt = attachment?.extname
    ? (attachment.extname.startsWith('.') ? attachment.extname.toLowerCase() : '.' + attachment.extname.toLowerCase())
    : '';
  const extFromName = rawName.includes('.')
    ? '.' + rawName.split('.').pop().toLowerCase()
    : '';
  const fileExt = extFromAtt || extFromName || '';
  const baseName = rawName.toLowerCase().endsWith(fileExt)
    ? rawName.slice(0, rawName.length - fileExt.length)
    : rawName;
  const displayName = (baseName || tr("File")) + fileExt;
  const isPdf   = fileExt === '.pdf';
  const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(fileExt);
  const isOffice = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt'].includes(fileExt);

  const officeViewerUrl = isOffice && fullUrl
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`
    : null;
  return React.createElement(Modal, {
    open: !!doc, onCancel: onClose, centered: true,
    width: (isPdf || isOffice) ? '88%' : 'auto',
    title: React.createElement('span', { style: { fontFamily: FONT } }, displayName),
    bodyStyle: { padding: 0 },
    footer: [
      fullUrl && React.createElement(Button, {
        key: 'dl',
        onClick: () => window.open(fullUrl, '_blank'),
      }, tr("⬇️ Download")),
      React.createElement(Button, { key: 'cl', onClick: onClose }, tr("Close")),
    ].filter(Boolean),
  },
    isPdf && fullUrl && React.createElement('iframe', {
      src: fullUrl,
      style: { width: '100%', height: '80vh', border: 'none', display: 'block' },
      title: displayName,
    }),
    isImage && fullUrl && React.createElement('img', {
      src: fullUrl, alt: displayName,
      style: { maxWidth: '100%', maxHeight: '80vh', display: 'block', margin: '0 auto', padding: 16 },
    }),
    isOffice && officeViewerUrl && React.createElement('div', { style: { padding: 0 } },
      React.createElement('iframe', {
        src: officeViewerUrl,
        style: { width: '100%', height: '80vh', border: 'none', display: 'block' },
        title: displayName,
        frameBorder: '0',
      }),
    ),
    !isPdf && !isImage && !isOffice && React.createElement('div', {
      style: { padding: 32, textAlign: 'center' },
    },
      React.createElement(Empty, { description: tr("This format cannot be previewed — download it to open") }),
    ),
  );
};

const FileUploadModal = ({ open, onClose, onSuccess, onAddPending, collectionName, recordId, currentUser, editDoc = null, projectFolderId }) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const isEdit = !!editDoc;

  useEffect(() => {
    if (!open) return;
    if (isEdit && editDoc) {
      form.setFieldsValue({
        documentType: editDoc.documentType || '', documentCode: editDoc.documentCode || '',
        title: editDoc.title || '', openingDate: editDoc.openingDate ? editDoc.openingDate.slice(0, 10) : '',
        signedAt: editDoc.signedAt ? editDoc.signedAt.slice(0, 10) : '',
        effectiveAt: editDoc.effectiveAt ? editDoc.effectiveAt.slice(0, 10) : '',
        senderName: editDoc.senderName || '', recipientName: editDoc.recipientName || '',
        language: editDoc.language || '', docFormat: editDoc.docFormat || '',
        description: editDoc.description || '', 
        googleDriveUrl: editDoc.googleDriveUrl || '', note: editDoc.note || '',
      });
      setFileList([]);
    } else { 
      form.resetFields(); 
      setFileList([]); 
    }
  }, [open, editDoc]);

  const handleClose = () => { form.resetFields(); setFileList([]); onClose(); };

  const uploadFile = async () => {
    const file = fileList[0].originFileObj;
    const formData = new window.FormData();
    formData.append('file', file, file.name);
    const uploadRes = await ctx.api.request({
      url: 'attachments:create', method: 'POST',
      params: { attachmentField: 'documents.fileAttachment' },
      data: formData, headers: { 'Content-Type': 'multipart/form-data' },
    });
    const att = uploadRes?.data?.data;
    if (!att?.id) throw new Error(tr("Upload failed"));
    return [{ id: att.id }];
  };

  const toISO = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const handleSubmit = async () => {
    try { await form.validateFields(); } catch { return; }
    const values = form.getFieldsValue();
    const hasFile = fileList.length > 0;
    const hasDrive = !!values.googleDriveUrl?.trim();
    
    if (!isEdit && !hasFile && !hasDrive) { 
      message.error(tr("Choose a file or enter a Drive URL")); 
      return; 
    }
    
    if (onAddPending) {
      onAddPending({
        file: hasFile ? fileList[0].originFileObj : null,
        fileName: hasFile ? fileList[0].name : 'Google Drive Link',
        metadata: values
      });
      handleClose();
      return;
    }

    setUploading(true);
    try {
      const attIds = hasFile ? await uploadFile() : null;
      const now = new Date().toISOString();
      const payload = {
        documentType: values.documentType?.trim() || '', documentCode: values.documentCode?.trim() || '',
        title: values.title?.trim() || '', openingDate: toISO(values.openingDate), signedAt: toISO(values.signedAt),
        effectiveAt: toISO(values.effectiveAt), senderName: values.senderName?.trim() || '',
        recipientName: values.recipientName?.trim() || '', language: values.language?.trim() || '',
        docFormat: values.docFormat?.trim() || '', googleDriveUrl: values.googleDriveUrl?.trim() || '',
        description: values.description?.trim() || '', 
        note: values.note?.trim() || '', updatedById: extractId(currentUser?.id) || null, updatedAt: now,
        folderId: projectFolderId ? parseInt(projectFolderId) : null,
        ...(attIds && { fileAttachment: attIds }),
      };

      if (isEdit) {
        await ctx.api.request({ url: 'documents:update', method: 'POST', params: { filterByTk: editDoc.id }, data: payload });
        message.success(tr("✅ Updated successfully!"));
      } else {
        await apiReq('documents:create', 'POST', { ...payload, collectionName, recordId: parseInt(recordId), createdById: currentUser?.id || null, createdAt: now });
        message.success(tr("✅ Upload successful!"));
      }
      handleClose(); 
      if (onSuccess) onSuccess();
    } catch (e) { 
      message.error(tr("Error: ") + (e?.message || tr("Please try again"))); 
    }
    setUploading(false);
  };

  const inpStyle = { fontSize: 12, fontFamily: FONT };
  const DOC_TYPE_SUGGESTIONS = [
    tr("Contract"),tr("Minutes"),'Quyết định','Tờ trình',
    'Báo cáo',tr("Evidence / Records"),'Công văn','Đơn từ',
    'Phụ lục','Biên bản làm việc','File mẫu',tr("Other"),
  ];
  const divider = (label) => React.createElement('div', { style: { fontSize: 12, color: '#8c8c8c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: '12px 0 8px', paddingBottom: 4, borderBottom: '1px solid #f0f0f0', fontFamily: FONT } }, label);

  return React.createElement(Modal, {
    open, onCancel: handleClose, width: 1100, centered: true,
    title: React.createElement(Text, { strong: true, style: { fontFamily: FONT, fontSize: 14 } }, isEdit ? tr("✏️ Update document") : tr("📎 Attach document")),
    footer: [
      React.createElement(Button, { key: 'c', onClick: handleClose, disabled: uploading, style: { fontFamily: FONT } }, tr("Cancel")),
      React.createElement(Button, { key: 's', type: 'primary', onClick: handleSubmit, loading: uploading, style: { fontFamily: FONT } }, 
        uploading ? (isEdit ? tr("Updating...") : tr("Processing...")) : (isEdit ? tr("Update") : (onAddPending ? tr("Confirm attachment") : tr("Upload")))
      ),
    ],
  },
    currentUser && React.createElement('div', { style: { background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, padding: '6px 12px', marginBottom: 12, fontSize: 12, color: '#595959', fontFamily: FONT } },
      (isEdit ? tr("👤 Updated by: ") : tr("👤 Attached by: ")), React.createElement('strong', null, userName(currentUser) || currentUser.email)
    ),
    React.createElement(Form, { form, layout: 'vertical', size: 'small', style: { fontFamily: FONT } },
      divider(tr("Identification")),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
        React.createElement(Form.Item, { name: 'documentType', label: tr("Document type"), rules: [{ required: true, message: tr("Enter the document type") }] },
          React.createElement('div', null,
            React.createElement(Input, { allowClear: true, maxLength: 150, placeholder: tr("e.g. Hợp đồng, Biên bản..."), list: 'doc-type-list', style: inpStyle }),
            React.createElement('datalist', { id: 'doc-type-list' }, ...DOC_TYPE_SUGGESTIONS.map((s) => React.createElement('option', { key: s, value: s })))
          )
        ),
        React.createElement(Form.Item, { name: 'title', label: tr("Document name") }, 
          React.createElement(Input, { allowClear: true, placeholder: tr("Full document name (the file name if left blank)"), style: inpStyle })
        )
      ),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
        React.createElement(Form.Item, { name: 'documentCode', label: tr("Document number") }, React.createElement(Input, { allowClear: true, placeholder: tr("e.g. 123/2024/HĐ"), style: inpStyle })),
        React.createElement(Form.Item, { name: 'openingDate', label: tr("Issue date") }, React.createElement(Input, { type: 'date', style: { width: '100%', ...inpStyle } }))
      ),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
        React.createElement(Form.Item, { name: 'signedAt', label: tr("Signed date") }, React.createElement(Input, { type: 'date', style: { width: '100%', ...inpStyle } })),
        React.createElement(Form.Item, { name: 'effectiveAt', label: tr("Effective date") }, React.createElement(Input, { type: 'date', style: { width: '100%', ...inpStyle } }))
      ),
      divider(tr("Parties")),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
        React.createElement(Form.Item, { name: 'senderName', label: tr("Sender") }, React.createElement(Input, { allowClear: true, placeholder: tr("Sending person / organisation"), style: inpStyle })),
        React.createElement(Form.Item, { name: 'recipientName', label: tr("Recipient") }, React.createElement(Input, { allowClear: true, placeholder: tr("Receiving person / organisation"), style: inpStyle }))
      ),
      React.createElement(Form.Item, { name: 'description', label: tr("Content summary") }, 
        React.createElement(Input.TextArea, { rows: 3, allowClear: true, placeholder: tr("A short description of the main content...") })
      ),
      divider(tr("Attachment")),
      React.createElement(Form.Item, { label: isEdit ? tr("Replace file (optional)") : tr("Choose file") },
        React.createElement(Upload.Dragger, { fileList, beforeUpload: () => false, onChange: ({ fileList: fl }) => setFileList(fl.slice(-1)), maxCount: 1, style: { padding: '6px 0' } },
          React.createElement('p', { style: { fontSize: 20, margin: '0 0 4px' } }, '📁'),
          React.createElement('p', { style: { fontSize: 12, color: '#595959', margin: 0, fontFamily: FONT } }, tr("Drag and drop or "), React.createElement('span', { style: { color: '#1890ff' } }, tr("click to choose")))
        )
      ),
      React.createElement(Form.Item, { name: 'googleDriveUrl', label: tr("Google Drive URL (optional)") }, React.createElement(Input, { placeholder: 'https://docs.google.com/...', allowClear: true, style: inpStyle })),
      divider(tr("Note")),
      React.createElement(Form.Item, { name: 'note', label: tr("Note") }, React.createElement(Input.TextArea, { rows: 2, allowClear: true, placeholder: tr("Enter a note..."), style: inpStyle }))
    )
  );
};

const NextStepInlineEditor = ({ item, onUpdate, currentUser, readOnly = false }) => {
  const [val, setVal]     = useState(item.nextStepDescription || '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setVal(item.nextStepDescription || ''); }, [item.id, item.nextStepDescription]);
  const isDirty = val !== (item.nextStepDescription || '');
  const handleSave = async () => {
    if (!isDirty || readOnly) return;
    setSaving(true);
    try {
      await apiReq(`tasks:update?filterByTk=${item.id}`, 'POST', { nextStepDescription: val || null });
      onUpdate({ ...item, nextStepDescription: val || null });
      message.success(tr("✅ Next step saved"));
    } catch { message.error(tr("Save failed")); }
    setSaving(false);
  };
  if (readOnly) {
    return React.createElement('div', {
      style: { padding: '8px 10px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6, fontSize: 12, fontFamily: FONT, color: val ? '#096dd9' : '#bfbfbf', lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: 40 },
    }, val ? `→ ${val}` : tr("(No next step yet)"));
  }
  return React.createElement('div', { style: { position: 'relative' } },
    React.createElement('textarea', {
      value: val, onChange: (e) => setVal(e.target.value),
      placeholder: tr("e.g.: Draft the LoA per the Detailed outline, send to client for review..."), rows: 3,
      style: {
        width: '100%', border: `1px solid ${isDirty ? '#1890ff' : '#e8e8e8'}`,
        borderRadius: 6, padding: '8px 10px', paddingBottom: 36,
        fontSize: 12, fontFamily: FONT, outline: 'none', boxSizing: 'border-box',
        resize: 'vertical', lineHeight: 1.6, color: '#262626', background: '#fff',
      },
      onFocus: (e) => e.currentTarget.style.borderColor = '#1890ff',
    }),
    React.createElement('div', { style: { position: 'absolute', bottom: 8, right: 8, display: 'flex', alignItems: 'center', gap: 6 } },
      isDirty && React.createElement('span', { style: { fontSize: 12, fontFamily: FONT, color: '#fa8c16', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 10, padding: '1px 8px' } }, tr("Unsaved")),
      React.createElement('div', {
        onClick: saving ? null : handleSave,
        style: {
          fontSize: 12, fontFamily: FONT, padding: '3px 12px', borderRadius: 4, fontWeight: 600,
          background: saving ? '#f0f0f0' : (isDirty ? '#1890ff' : '#f5f5f5'),
          color: saving ? '#bfbfbf' : (isDirty ? '#fff' : '#bfbfbf'),
          cursor: saving ? 'not-allowed' : (isDirty ? 'pointer' : 'default'),
        },
      }, saving ? tr("Saving...") : (isDirty ? tr("💾 Save") : tr("✓ Saved"))),
    ),
  );
};

const DescriptionInlineEditor = ({ item, type, onUpdate, readOnly = false }) => {
  const [val, setVal]       = useState(item.description || '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setVal(item.description || ''); }, [item.id]);
  const isDirty = val !== (item.description || '');
  const handleSave = async () => {
    if (!isDirty || readOnly) return;
    setSaving(true);
    try {
      const url = type === 'subTask'
        ? `subTasks:update?filterByTk=${item.id}`
        : `tasks:update?filterByTk=${item.id}`;
      await apiReq(url, 'POST', { description: val || null });
      onUpdate({ ...item, description: val || null });
      message.success(tr("✅ Saved"));
    } catch { message.error(tr("Save failed")); }
    setSaving(false);
  };
  if (readOnly) {
    return React.createElement('div', {
      style: {
        padding: '10px 12px', background: '#fafafa', border: '1px solid #f0f0f0',
        borderRadius: 6, fontSize: 12, fontFamily: FONT,
        color: val ? '#262626' : '#bfbfbf',
        lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: 64,
      },
    }, val || tr("(No content yet)"));
  }
  return React.createElement('div', { style: { position: 'relative' } },
    React.createElement('textarea', {
      value: val,
      onChange: (e) => setVal(e.target.value),
      placeholder: tr("Enter progress details..."),
      rows: 4,
      style: {
        width: '100%',
        border: `1px solid ${isDirty ? '#1890ff' : '#e8e8e8'}`,
        borderRadius: 6, padding: '10px 12px', paddingBottom: 40,
        fontSize: 12, fontFamily: FONT, outline: 'none',
        resize: 'vertical', boxSizing: 'border-box',
        color: '#262626', background: '#fff', lineHeight: 1.7,
      },
    }),
    React.createElement('div', {
      style: { position: 'absolute', bottom: 8, right: 8, display: 'flex', alignItems: 'center', gap: 6 },
    },
      isDirty && React.createElement('span', {
        style: { fontSize: 11, fontFamily: FONT, color: '#fa8c16', background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 10, padding: '1px 8px' },
      }, tr("Unsaved")),
      React.createElement('div', {
        onClick: saving ? null : handleSave,
        style: {
          fontSize: 12, fontFamily: FONT, padding: '3px 12px', borderRadius: 4, fontWeight: 600,
          background: saving ? '#f0f0f0' : (isDirty ? '#1890ff' : '#f5f5f5'),
          color:      saving ? '#bfbfbf' : (isDirty ? '#fff'    : '#bfbfbf'),
          cursor:     saving ? 'not-allowed' : (isDirty ? 'pointer' : 'default'),
        },
      }, saving ? tr("Saving...") : (isDirty ? tr("💾 Save") : tr("✓ Saved"))),
    ),
  );
};

const TsBadge = ({ status }) => {
  const c = TS_STATUS_CFG[status] || TS_STATUS_CFG.draft;
  return React.createElement(
    "span",
    {
      style: {
        fontSize: 11,
        fontFamily: FONT,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 10,
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      },
    },
    c.icon,
    " ",
    c.label,
  );
};

const SBtn = ({ status, size = 15, onChange }) => {
  const [open, setOpen] = useState(false);
  const c = STATUS_CFG[status] || STATUS_CFG.toDo;
  return React.createElement(
    "div",
    { style: { position: "relative", flexShrink: 0 } },
    React.createElement(
      "div",
      {
        onClick: (e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        },
        title: c.label,
        style: {
          width: size,
          height: size,
          borderRadius: "50%",
          border: `2px solid ${c.color}`,
          background:
            status === "done"
              ? c.color
              : status === "inProgress"
                ? `${c.color}25`
                : "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
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
          { style: { color: c.color, fontSize: size * 0.6, lineHeight: 1 } },
          "×",
        ),
    ),
    open &&
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
        ...Object.entries(STATUS_CFG).map(([k, v]) =>
          React.createElement(
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
          ),
        ),
      ),
  );
};

// ── Portal Dropdown ──
const PortalDropdown = ({ anchorRef, open, onClose, width, children }) => {
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  React.useEffect(() => {
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
          display: "flex",
          flexDirection: "column",
        },
        onClick: (e) => e.stopPropagation(),
      },
      children,
    ),
  );
};

// ── LawyerPicker ──
const LawyerPicker = ({
  lawyers,
  value,
  onChange,
  size = 20,
  readOnly = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const triggerRef = React.useRef(null);
  const cur = lawyers.find((l) => l.id === value);
  const color = cur
    ? LAWYER_COLORS[lawyers.indexOf(cur) % LAWYER_COLORS.length]
    : "#8c8c8c";
  const TYPE_ORDER = ["associate", "suppliant", "lawyer", "partner"];
  const filtered = lawyers.filter((l) =>
    l.lawyerName.toLowerCase().includes(q.toLowerCase()),
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
  const handleClose = () => {
    setOpen(false);
    setQ("");
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
                fontSize: 10,
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
          ...items.map((l) => {
            const lColor =
              LAWYER_COLORS[lawyers.indexOf(l) % LAWYER_COLORS.length];
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
                onMouseEnter: (e) =>
                  (e.currentTarget.style.background = "#f5f5f5"),
                onMouseLeave: (e) =>
                  (e.currentTarget.style.background = "transparent"),
              },
              React.createElement(Av, {
                name: l.lawyerName,
                color: lColor,
                size: 24,
              }),
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
                    {
                      style: {
                        fontSize: 10,
                        fontFamily: FONT,
                        color: "#8c8c8c",
                      },
                    },
                    tr("{0} ₫/hr", { 0: Number(l.unitPrice).toLocaleString("vi-VN") }),
                  ),
              ),
            );
          }),
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
                fontSize: 10,
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
          ...others.map((l) => {
            const lColor =
              LAWYER_COLORS[lawyers.indexOf(l) % LAWYER_COLORS.length];
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
                onMouseEnter: (e) =>
                  (e.currentTarget.style.background = "#f5f5f5"),
                onMouseLeave: (e) =>
                  (e.currentTarget.style.background = "transparent"),
              },
              React.createElement(Av, {
                name: l.lawyerName,
                color: lColor,
                size: 24,
              }),
              React.createElement(
                "span",
                { style: { fontSize: 12, fontFamily: FONT, color: "#262626" } },
                l.lawyerName,
              ),
            );
          }),
        ),
    ),
  );

  return React.createElement(
    "div",
    { style: { position: "relative", display: "inline-flex" } },
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
                  fontSize: 12,
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
                { style: { fontSize: 11, color: "#bfbfbf" } },
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
              },
            })
          : React.createElement(
              "div",
              {
                title: tr("Choose the approving lawyer"),
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

// ── TaskPicker ──
const TaskPicker = ({ allTasks, currentTaskId, value, onChange, services = [], readOnly = false }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState('');
  const cur        = useMemo(() => allTasks.find((t) => t.id === value), [allTasks, value]);
  const currentTask = useMemo(() => allTasks.find((t) => t.id === currentTaskId), [allTasks, currentTaskId]);

  const serviceMap = useMemo(() => {
    const m = { __none__: tr("No service assigned") };
    services.forEach((s) => { m[String(s.id)] = s.serviceName; });
    return m;
  }, [services]);

  const filtered = useMemo(() =>
    allTasks.filter((t) =>
      t.id !== currentTaskId && (t.title || '').toLowerCase().includes(q.toLowerCase()),
    ), [allTasks, currentTaskId, q]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((t) => {
      const key = t.serviceId ? String(t.serviceId) : '__none__';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });

    const serviceKeys = services.map((s) => String(s.id)).filter((k) => map[k]);
    const noneKey     = map['__none__'] ? ['__none__'] : [];
    return [...serviceKeys, ...noneKey].map((k) => ({
      key: k,
      label: serviceMap[k] || (tr("Service #") + k),
      tasks: map[k],
      isSameService: currentTask && String(currentTask.serviceId) === k
    }));
  }, [filtered, services, serviceMap, currentTask]);

  const handleClose = useCallback(() => { setOpen(false); setQ(''); }, []);
  const CW = { status: 85, check: 24 };

  if (readOnly) {
    if (!cur) return React.createElement('span', { style: { fontSize: 12, fontFamily: FONT, color: '#bfbfbf' } }, '—');
    return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
      React.createElement(SBadge, { status: cur.status }),
      React.createElement('span', { style: { fontSize: 12, fontFamily: FONT, color: '#262626', fontWeight: 500 } }, cur.title),
    );
  }

  const renderTaskRow = (t) => {
    const isSelected = t.id === value;
    const st         = STATUS_CFG[t.status] || STATUS_CFG.toDo;
    const isDone     = t.status === 'done';
    const isBlocked  = t.status === 'blocked';
    return React.createElement('div', {
      key: t.id,
      onClick: () => { onChange(t.id); handleClose(); },
      style: {
        display: 'flex', alignItems: 'center', padding: '7px 12px', cursor: 'pointer',
        background: isSelected ? '#e6f4ff' : 'transparent',
        borderBottom: '1px solid #f5f5f5',
        borderLeft: '3px solid ' + (isBlocked ? '#722ed1' : isSelected ? '#1890ff' : 'transparent'),
      },
      onMouseEnter: (e) => { if (!isSelected) e.currentTarget.style.background = '#f5f5f5'; },
      onMouseLeave: (e) => { e.currentTarget.style.background = isSelected ? '#e6f4ff' : 'transparent'; },
    },
      React.createElement('div', { style: { width: CW.status, flexShrink: 0 } },
        React.createElement('span', { style: { fontSize: 11, fontFamily: FONT, fontWeight: 500, padding: '2px 6px', borderRadius: 3, background: st.bg, color: st.color, border: `1px solid ${st.border}`, whiteSpace: 'nowrap', display: 'inline-block' } }, st.label),
      ),
      React.createElement('div', { style: { flex: 1, paddingLeft: 8, paddingRight: 6, fontSize: 12, fontFamily: FONT, color: isDone ? '#bfbfbf' : isBlocked ? '#722ed1' : '#262626', textDecoration: isDone ? 'line-through' : 'none', overflow: 'hidden', overflowWrap: 'break-word', wordBreak: 'break-word', whiteSpace: 'normal', fontWeight: isSelected ? 600 : 500 } }, t.title),
      React.createElement('div', { style: { width: CW.check, flexShrink: 0, textAlign: 'center', fontSize: 12, color: '#1890ff', fontWeight: 700 } }, isSelected ? '✓' : ''),
    );
  };

  const renderDropdown = () => {
    if (!open) return null;
    return React.createElement('div', {
      style: {
        position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 10000,
        background: '#fff', border: '1px solid #e8e8e8', borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)', width: '100%',
        display: 'flex', flexDirection: 'column', maxHeight: 440, overflow: 'hidden'
      },
    },
      React.createElement('div', { style: { padding: '8px 10px 6px', flexShrink: 0 } },
        React.createElement('input', {
          autoFocus: true, value: q, onChange: (e) => setQ(e.target.value),
          placeholder: tr("Search tasks by name..."),
          style: { width: '100%', border: '1px solid #e8e8e8', borderRadius: 6, padding: '6px 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: FONT },
        }),
      ),
      React.createElement('div', { style: { overflowY: 'auto', flex: 1 } },
        grouped.length === 0
          ? React.createElement('div', { style: { padding: '16px', fontSize: 12, fontFamily: FONT, color: '#bfbfbf', textAlign: 'center' } }, tr("No tasks found"))
          : grouped.map((g) =>
              React.createElement('div', { key: g.key },
                React.createElement('div', {
                  style: { padding: '10px 12px', fontSize: 12, fontFamily: FONT, fontWeight: 700, color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 0.5, background: '#f5f5f5', borderTop: '1px solid #efefef', borderBottom: '1px solid #efefef', display: 'flex', alignItems: 'center', gap: 6 },
                },
                  React.createElement('span', { style: { fontSize: 11 } }, '🗂'),
                  React.createElement('span', null, g.label),
                  React.createElement('span', { style: { marginLeft: 'auto', background: '#e0e0e0', borderRadius: 8, padding: '0 6px', fontSize: 12 } }, String(g.tasks.length)),
                ),
                g.tasks.map(renderTaskRow),
              ),
            ),
      ),
    );
  };

  return React.createElement('div', { style: { position: 'relative' } },
    open && React.createElement('div', { style: { position: 'fixed', inset: 0, zIndex: 9998 }, onClick: handleClose }),
    React.createElement('div', {
      onClick: () => setOpen((v) => !v),
      style: {
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
        border: `1px solid ${open ? '#1890ff' : '#e8e8e8'}`, borderRadius: 6,
        cursor: 'pointer', background: '#fff', minWidth: 280, position: 'relative', zIndex: 9999, minHeight: 36,
      },
    },
      cur
        ? React.createElement(React.Fragment, null,
            React.createElement('div', { style: { width: 8, height: 8, borderRadius: '50%', background: (STATUS_CFG[cur.status] || STATUS_CFG.toDo).color, flexShrink: 0 } }),
            React.createElement('span', { style: { fontSize: 13, fontFamily: FONT, color: '#262626', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 } }, cur.title),
            React.createElement(SBadge, { status: cur.status }),
            React.createElement('span', {
              onClick: (e) => { e.stopPropagation(); onChange(null); },
              style: { fontSize: 14, color: '#cf1322', fontWeight: 700, flexShrink: 0, lineHeight: 1 },
            }, '×'),
          )
        : React.createElement('span', { style: { fontSize: 13, fontFamily: FONT, color: '#bfbfbf', flex: 1 } }, tr("Select a prerequisite task...")),
    ),
    renderDropdown(),
  );
};



// ── Reject Reason Modal ──
const RejectModal = ({ open, onClose, onConfirm }) => {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setReason("");
  }, [open]);
  const handleConfirm = async () => {
    setSaving(true);
    await onConfirm(reason.trim());
    setSaving(false);
  };
  return React.createElement(
    Modal,
    {
      open,
      onCancel: onClose,
      footer: null,
      width: 400,
      centered: true,
      title: React.createElement(
        Text,
        { strong: true, style: { fontFamily: FONT, fontSize: 14 } },
        tr("❌ Reject timesheet"),
      ),
    },
    React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        { style: { marginBottom: 12 } },
        React.createElement(
          Text,
          {
            style: {
              fontSize: 12,
              fontFamily: FONT,
              color: "#8c8c8c",
              display: "block",
              marginBottom: 6,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            },
          },
          tr("Rejection reason"),
        ),
        React.createElement("textarea", {
          value: reason,
          onChange: (e) => setReason(e.target.value),
          placeholder: tr("Enter a reason (optional)..."),
          rows: 3,
          autoFocus: true,
          style: {
            width: "100%",
            border: "1px solid #ffa39e",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 13,
            fontFamily: FONT,
            outline: "none",
            resize: "vertical",
            boxSizing: "border-box",
            color: "#262626",
          },
          onFocus: (e) => (e.currentTarget.style.borderColor = "#cf1322"),
          onBlur: (e) => (e.currentTarget.style.borderColor = "#ffa39e"),
        }),
      ),
      React.createElement(
        "div",
        { style: { display: "flex", justifyContent: "flex-end", gap: 8 } },
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
          tr("Cancel"),
        ),
        React.createElement(
          "div",
          {
            onClick: saving ? null : handleConfirm,
            style: {
              padding: "7px 24px",
              borderRadius: 6,
              background: saving ? "#f5f5f5" : "#cf1322",
              color: saving ? "#bfbfbf" : "#fff",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 13,
              fontFamily: FONT,
              fontWeight: 700,
            },
          },
          saving ? tr("Processing...") : tr("❌ Confirm rejection"),
        ),
      ),
    ),
  );
};

// ── Helpers ──
const toLocalDTStr = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}T${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
};
const nowLocalDTStr = () => toLocalDTStr(new Date());
const hasOverlap = (s1, e1, s2, e2) => s1 < e2 && s2 < e1;

// ── Timesheet Tab ──
const TimesheetTab = ({ item, type, myLawyer, isManager = false }) => {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editE, setEditE] = useState(null);
  const [del, setDel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [startInput, setStartInput] = useState("");
  const [durInput, setDurInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [overlapErr, setOverlapErr] = useState("");
  const fKey = type === "task" ? "taskId" : "subTaskId";
  const allSheetsRef = React.useRef([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchTS({
        $and: [
          { [fKey]: { $eq: item.id } },
          { lawyerId: { $eq: myLawyer.id } },
        ],
      }),
      fetchTS({ lawyerId: { $eq: myLawyer.id } }),
    ]).then(([taskSheets, allSheets]) => {
      setSheets(taskSheets);
      allSheetsRef.current = allSheets;
      setLoading(false);
    });
  }, [item.id, myLawyer.id, fKey]);

  const totalHours = useMemo(
    () => sheets.reduce((s, r) => s + (parseFloat(r.duration) || 0), 0),
    [sheets],
  );
  const aggregateWR = useMemo(
    () => calcWRFromTotal(item.estimatedDuration, totalHours),
    [item.estimatedDuration, totalHours],
  );
  const countByStatus = useMemo(() => {
    const c = { draft: 0, submitted: 0, approved: 0, rejected: 0 };
    sheets.forEach((s) => {
      if (c[s.status] !== undefined) c[s.status]++;
    });
    return c;
  }, [sheets]);

  const computedStart = startInput ? new Date(startInput) : null;
  const dur = parseFloat(durInput || 0);
  const computedEnd =
    computedStart && dur > 0
      ? new Date(computedStart.getTime() + dur * 3600000)
      : null;

  const overlapInfo = useMemo(() => {
    if (!computedStart || !computedEnd || dur <= 0) return null;
    const s1 = computedStart.getTime();
    const e1 = computedEnd.getTime();
    const conflicting = allSheetsRef.current.filter((s) => {
      if (editE && s.id === editE.id) return false;
      if (!s.startTime || !s.endTime) return false;
      const s2 = new Date(s.startTime).getTime();
      const e2 = new Date(s.endTime).getTime();
      return hasOverlap(s1, e1, s2, e2);
    });
    return conflicting.length > 0 ? conflicting : null;
  }, [startInput, durInput, editE]);

  const activeSheet = useMemo(() => {
    if (editE) return null;
    const now = Date.now();
    return allSheetsRef.current.find((s) => {
      if (!s.startTime || !s.endTime) return false;
      return (
        now >= new Date(s.startTime).getTime() &&
        now < new Date(s.endTime).getTime()
      );
    });
  }, [modal, sheets]);

  const openModal = (e = null) => {
    if (e) {
      setStartInput(toLocalDTStr(e.startTime) || "");
      setDurInput(e.duration ? String(e.duration) : "");
      setDescInput(e.description || "");
    } else {
      setStartInput(nowLocalDTStr());
      setDurInput("");
      setDescInput("");
    }
    setOverlapErr("");
    setEditE(e);
    setModal(true);
  };

  const reloadSheets = async () => {
    const [taskSheets, allSheets] = await Promise.all([
      fetchTS({
        $and: [
          { [fKey]: { $eq: item.id } },
          { lawyerId: { $eq: myLawyer.id } },
        ],
      }),
      fetchTS({ lawyerId: { $eq: myLawyer.id } }),
    ]);
    setSheets(taskSheets);
    allSheetsRef.current = allSheets;
  };

  const save = async () => {
    if (!startInput) {
      message.warning(tr("Please select the start time"));
      return;
    }
    if (!dur || dur <= 0) {
      message.warning(tr("Please enter the hours worked"));
      return;
    }
    if (dur > 24) {
      message.warning(tr("Hours must not exceed 24"));
      return;
    }
    const startTime = new Date(startInput);
    const endTime = new Date(startTime.getTime() + dur * 3600000);
    const now = new Date();
    if (startTime > new Date(now.getTime() + 24 * 3600000)) {
      message.warning(
        tr("The start time cannot be more than 24 hours in the future"),
      );
      return;
    }
    if (overlapInfo && overlapInfo.length > 0) {
      const cf = overlapInfo[0];
      message.error(
        tr("⛔ Overlaps timesheet {0} → {1}", { 0: fmt(cf.startTime, "full"), 1: fmt(cf.endTime, "full") }),
      );
      return;
    }
    setSaving(true);
    try {
      if (editE) {
        await updateTS(editE.id, {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          workingDay: startTime.toISOString(),
          duration: dur,
          description: descInput.trim() || null,
        });
        message.success(tr("✅ Updated"));
      } else {
        await createTS({
          lawyerId: myLawyer.id,
          workingDay: startTime.toISOString(),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: dur,
          hourlyRate: myLawyer.unitPrice,
          amount: dur * myLawyer.unitPrice,
          description: descInput.trim() || null,
          billable: false,
          status: "draft",
          [fKey]: item.id,
          projectId: item.projectId ? parseInt(item.projectId) : null,
        });
        message.success(tr("✅ Saved (Draft)"));
      }
      setModal(false);
      setEditE(null);
      await reloadSheets();
    } catch (e) {
      message.error(tr("Error: ") + (e?.message || tr("Please try again")));
    }
    setSaving(false);
  };

  const handleSubmit = async (id) => {
    setActionLoading(id);
    try {
      await updateTS(id, { status: "submitted" });
      message.success(tr("📤 Sent for approval"));
      await reloadSheets();
    } catch {
      message.error(tr("Error"));
    }
    setActionLoading(null);
  };
  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await updateTS(id, { status: "approved" });
      message.success(tr("✅ Approved"));
      await reloadSheets();
    } catch {
      message.error(tr("Error"));
    }
    setActionLoading(null);
  };
  const handleRejectConfirm = async (reason) => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget);
    try {
      await updateTS(rejectTarget, {
        status: "rejected",
        rejectionReason: reason || null,
      });
      message.success(tr("❌ Rejected"));
      await reloadSheets();
    } catch {
      message.error(tr("Error"));
    }
    setActionLoading(null);
    setRejectModal(false);
    setRejectTarget(null);
  };
  const handleReDraft = async (id) => {
    setActionLoading(id);
    try {
      await updateTS(id, { status: "draft", rejectionReason: null });
      message.success(tr("📝 Moved back to draft"));
      await reloadSheets();
    } catch {
      message.error(tr("Error"));
    }
    setActionLoading(null);
  };
  const remove = async (id) => {
    setDel(id);
    try {
      await deleteTS(id);
      message.success(tr("Deleted"));
      await reloadSheets();
    } catch {
      message.error(tr("Error"));
    }
    setDel(null);
  };

  const inpS = {
    width: "100%",
    border: "1px solid #e8e8e8",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 14,
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
          fontWeight: 600,
          letterSpacing: 0.5,
        },
      },
      t,
    );
  const fld = (l, c) =>
    React.createElement("div", { style: { marginBottom: 14 } }, lbl(l), c);
  const fb = (e) => (e.currentTarget.style.borderColor = "#1890ff");
  const bb = (e) => (e.currentTarget.style.borderColor = "#e8e8e8");

  const previewTotal =
    dur > 0
      ? totalHours + (editE ? dur - (parseFloat(editE.duration) || 0) : dur)
      : totalHours;
  const previewWR = calcWRFromTotal(item.estimatedDuration, previewTotal);

  return React.createElement(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 12 } },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          },
        },
        totalHours > 0
          ? React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#e6f4ff",
                  borderRadius: 8,
                  padding: "6px 12px",
                  border: "1px solid #91caff",
                },
              },
              React.createElement(
                "span",
                { style: { fontSize: 12, fontFamily: FONT, color: "#8c8c8c" } },
                tr("⏱ Total hours:"),
              ),
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 14,
                    fontFamily: FONT,
                    fontWeight: 700,
                    color: "#096dd9",
                  },
                },
                fmtHours(totalHours),
              ),
              item.estimatedDuration > 0 &&
                React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(
                    "span",
                    { style: { color: "#bfbfbf", fontSize: 12 } },
                    "／",
                  ),
                  React.createElement(
                    "span",
                    {
                      style: {
                        fontSize: 12,
                        fontFamily: FONT,
                        color: "#8c8c8c",
                      },
                    },
                    tr("estimated {0}", { 0: fmtHours(item.estimatedDuration) }),
                  ),
                ),
            )
          : item.estimatedDuration > 0
            ? React.createElement(
                "div",
                {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#f5f5f5",
                    borderRadius: 8,
                    padding: "6px 12px",
                    border: "1px solid #e8e8e8",
                  },
                },
                React.createElement(
                  "span",
                  {
                    style: { fontSize: 12, fontFamily: FONT, color: "#8c8c8c" },
                  },
                  tr("⏱ Estimated:"),
                ),
                React.createElement(
                  "span",
                  {
                    style: {
                      fontSize: 13,
                      fontFamily: FONT,
                      fontWeight: 600,
                      color: "#595959",
                    },
                  },
                  fmtHours(item.estimatedDuration),
                ),
              )
            : React.createElement("span", null),
        aggregateWR !== null &&
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 8,
                padding: "6px 12px",
                border: `1px solid ${wrCfg(aggregateWR).color}40`,
                background: wrCfg(aggregateWR).bg,
              },
            },
            React.createElement(
              "span",
              { style: { fontSize: 11, fontFamily: FONT, color: "#8c8c8c" } },
              tr("⚡ Productivity:"),
            ),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 13,
                  fontFamily: FONT,
                  fontWeight: 700,
                  color: wrCfg(aggregateWR).color,
                },
              },
              wrCfg(aggregateWR).label,
            ),
          ),
      ),
      React.createElement(
        "div",
        {
          onClick: () => openModal(),
          style: {
            fontSize: 12,
            padding: "5px 14px",
            borderRadius: 6,
            background: "#1890ff",
            color: "#fff",
            cursor: "pointer",
            fontFamily: FONT,
            fontWeight: 600,
            flexShrink: 0,
          },
        },
        tr("＋ Add"),
      ),
    ),
    activeSheet &&
      React.createElement(
        "div",
        {
          style: {
            padding: "8px 12px",
            background: "#fff7e6",
            border: "1px solid #ffd591",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
          },
        },
        React.createElement("span", { style: { fontSize: 14 } }, "⚠️"),
        React.createElement(
          "div",
          { style: { flex: 1 } },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                fontWeight: 600,
                color: "#d46b08",
              },
            },
            tr("A timesheet is still running"),
          ),
          React.createElement(
            "div",
            { style: { fontSize: 11, fontFamily: FONT, color: "#8c8c8c" } },
            `${fmt(activeSheet.startTime, "full")} → ${fmt(activeSheet.endTime, "full")} (${fmtHours(parseFloat(activeSheet.duration) || 0)})`,
          ),
        ),
      ),
    sheets.length > 0 &&
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 0,
            background: "#fafafa",
            borderRadius: 8,
            padding: "10px 14px",
            border: "1px solid #f0f0f0",
          },
        },
        ["draft", "submitted", "approved"].map((key, i) => {
          const cfg = TS_STATUS_CFG[key];
          const cnt = countByStatus[key];
          return React.createElement(
            React.Fragment,
            { key },
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  flex: 1,
                },
              },
              React.createElement(
                "div",
                {
                  style: {
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: cnt > 0 ? cfg.bg : "#f5f5f5",
                    border: `2px solid ${cnt > 0 ? cfg.color : "#e8e8e8"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                  },
                },
                cfg.icon,
              ),
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 10,
                    fontFamily: FONT,
                    fontWeight: 600,
                    color: cnt > 0 ? cfg.color : "#bfbfbf",
                  },
                },
                cfg.label,
              ),
              cnt > 0 &&
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 10,
                      fontFamily: FONT,
                      color: "#fff",
                      background: cfg.color,
                      borderRadius: "50%",
                      width: 14,
                      height: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                    },
                  },
                  cnt,
                ),
            ),
            i < 2 &&
              React.createElement("div", {
                style: {
                  width: 24,
                  height: 2,
                  background: "#e8e8e8",
                  flexShrink: 0,
                  margin: "0 2px",
                  marginBottom: 16,
                },
              }),
          );
        }),
        countByStatus.rejected > 0 &&
          React.createElement(
            React.Fragment,
            null,
            React.createElement("div", {
              style: {
                width: 2,
                height: 20,
                background: "#e8e8e8",
                margin: "0 8px",
                flexShrink: 0,
                marginBottom: 16,
              },
            }),
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                },
              },
              React.createElement(
                "div",
                {
                  style: {
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: TS_STATUS_CFG.rejected.bg,
                    border: `2px solid ${TS_STATUS_CFG.rejected.color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                  },
                },
                TS_STATUS_CFG.rejected.icon,
              ),
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 10,
                    fontFamily: FONT,
                    fontWeight: 600,
                    color: TS_STATUS_CFG.rejected.color,
                  },
                },
                TS_STATUS_CFG.rejected.label,
              ),
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 10,
                    fontFamily: FONT,
                    color: "#fff",
                    background: TS_STATUS_CFG.rejected.color,
                    borderRadius: "50%",
                    width: 14,
                    height: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  },
                },
                countByStatus.rejected,
              ),
            ),
          ),
      ),
    loading
      ? React.createElement(Spin, { size: "small" })
      : sheets.length === 0
        ? React.createElement(
            "div",
            {
              style: {
                textAlign: "center",
                padding: "20px 0",
                color: "#bfbfbf",
                fontSize: 12,
                fontFamily: FONT,
                border: "2px dashed #f0f0f0",
                borderRadius: 8,
              },
            },
            tr("No timesheet yet — press ＋ Add to start"),
          )
        : React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: 6 } },
            ...sheets.map((s) => {
              const st = TS_STATUS_CFG[s.status] || TS_STATUS_CFG.draft;
              const isAL = actionLoading === s.id;
              const canEdit = s.status === "draft" || s.status === "rejected";
              const canDelete = s.status === "draft" || s.status === "rejected";
              const canSubmit = s.status === "draft";
              const canReDraft = s.status === "rejected";
              const canApprove = isManager && s.status === "submitted";
              const canReject = isManager && s.status === "submitted";
              const isActive = s.endTime && new Date(s.endTime) > new Date();
              return React.createElement(
                "div",
                {
                  key: s.id,
                  style: {
                    background: "#fff",
                    borderRadius: 8,
                    padding: "12px 14px",
                    border: `1px solid ${isActive ? "#ffd591" : st.border}`,
                    borderLeft: `4px solid ${isActive ? "#d46b08" : st.color}`,
                  },
                },
                React.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    },
                  },
                  React.createElement(
                    "div",
                    {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      },
                    },
                    React.createElement(TsBadge, { status: s.status }),
                    isActive &&
                      React.createElement(
                        "span",
                        {
                          style: {
                            fontSize: 10,
                            fontFamily: FONT,
                            fontWeight: 600,
                            padding: "2px 7px",
                            borderRadius: 8,
                            background: "#fff7e6",
                            color: "#d46b08",
                            border: "1px solid #ffd591",
                          },
                        },
                        tr("⏳ Running"),
                      ),
                  ),
                  React.createElement(
                    "span",
                    {
                      style: {
                        fontSize: 14,
                        fontFamily: FONT,
                        fontWeight: 700,
                        color: "#096dd9",
                      },
                    },
                    fmtHours(parseFloat(s.duration) || 0),
                  ),
                ),
                s.startTime &&
                  s.endTime &&
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: 12,
                        fontFamily: FONT,
                        color: "#595959",
                        marginBottom:
                          s.description || s.rejectionReason ? 6 : 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      },
                    },
                    React.createElement(
                      "span",
                      { style: { color: "#8c8c8c" } },
                      "🕐",
                    ),
                    React.createElement("span", null, fmt(s.startTime, "full")),
                    React.createElement(
                      "span",
                      { style: { color: "#d9d9d9" } },
                      "→",
                    ),
                    React.createElement("span", null, fmt(s.endTime, "full")),
                  ),
                s.description &&
                  React.createElement(
                    Text,
                    {
                      style: {
                        fontSize: 12,
                        fontFamily: FONT,
                        color: "#595959",
                        display: "block",
                        marginBottom: 6,
                        fontStyle: "italic",
                      },
                    },
                    `"${s.description}"`,
                  ),
                s.rejectionReason &&
                  React.createElement(
                    "div",
                    {
                      style: {
                        padding: "6px 10px",
                        background: "#fff1f0",
                        borderRadius: 6,
                        fontSize: 12,
                        fontFamily: FONT,
                        color: "#cf1322",
                        marginBottom: 8,
                        border: "1px solid #ffa39e",
                        display: "flex",
                        gap: 6,
                      },
                    },
                    React.createElement("span", null, "❌"),
                    React.createElement(
                      "span",
                      null,
                      React.createElement("strong", null, tr("Rejection reason: ")),
                      s.rejectionReason,
                    ),
                  ),
                React.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      gap: 6,
                      paddingTop: 8,
                      borderTop: "1px solid #f5f5f5",
                      flexWrap: "wrap",
                    },
                  },
                  canSubmit &&
                    React.createElement(
                      "div",
                      {
                        onClick: isAL ? null : () => handleSubmit(s.id),
                        style: {
                          fontSize: 11,
                          fontFamily: FONT,
                          padding: "4px 11px",
                          borderRadius: 6,
                          background: isAL ? "#f5f5f5" : "#fff7e6",
                          color: isAL ? "#bfbfbf" : "#d46b08",
                          border: `1px solid ${isAL ? "#e8e8e8" : "#ffd591"}`,
                          cursor: isAL ? "not-allowed" : "pointer",
                          fontWeight: 600,
                        },
                      },
                      tr("📤 Send for approval"),
                    ),
                  canApprove &&
                    React.createElement(
                      "div",
                      {
                        onClick: isAL ? null : () => handleApprove(s.id),
                        style: {
                          fontSize: 11,
                          fontFamily: FONT,
                          padding: "4px 11px",
                          borderRadius: 6,
                          background: isAL ? "#f5f5f5" : "#f6ffed",
                          color: isAL ? "#bfbfbf" : "#389e0d",
                          border: `1px solid ${isAL ? "#e8e8e8" : "#b7eb8f"}`,
                          cursor: isAL ? "not-allowed" : "pointer",
                          fontWeight: 600,
                        },
                      },
                      tr("✅ Approve"),
                    ),
                  canReject &&
                    React.createElement(
                      "div",
                      {
                        onClick: isAL
                          ? null
                          : () => {
                              setRejectTarget(s.id);
                              setRejectModal(true);
                            },
                        style: {
                          fontSize: 11,
                          fontFamily: FONT,
                          padding: "4px 11px",
                          borderRadius: 6,
                          background: "#fff1f0",
                          color: "#cf1322",
                          border: "1px solid #ffa39e",
                          cursor: isAL ? "not-allowed" : "pointer",
                          fontWeight: 600,
                        },
                      },
                      tr("❌ Reject"),
                    ),
                  canEdit &&
                    React.createElement(
                      "div",
                      {
                        onClick: () => openModal(s),
                        style: {
                          fontSize: 11,
                          fontFamily: FONT,
                          padding: "4px 11px",
                          borderRadius: 6,
                          border: "1px solid #e8e8e8",
                          color: "#595959",
                          cursor: "pointer",
                        },
                      },
                      tr("✏️ Edit"),
                    ),
                  canReDraft &&
                    React.createElement(
                      "div",
                      {
                        onClick: isAL ? null : () => handleReDraft(s.id),
                        style: {
                          fontSize: 11,
                          fontFamily: FONT,
                          padding: "4px 11px",
                          borderRadius: 6,
                          background: "#f5f5f5",
                          color: "#8c8c8c",
                          border: "1px solid #e8e8e8",
                          cursor: isAL ? "not-allowed" : "pointer",
                        },
                      },
                      tr("📝 Back to draft"),
                    ),
                  canDelete &&
                    React.createElement(
                      "div",
                      {
                        onClick: () => remove(s.id),
                        style: {
                          fontSize: 11,
                          fontFamily: FONT,
                          padding: "4px 11px",
                          borderRadius: 6,
                          border: "1px solid #ffa39e",
                          color: "#cf1322",
                          cursor: "pointer",
                          background: del === s.id ? "#fff1f0" : "transparent",
                          marginLeft: "auto",
                        },
                      },
                      del === s.id ? "..." : tr("🗑 Delete"),
                    ),
                ),
              );
            }),
          ),
    modal &&
      React.createElement(
        Modal,
        {
          open: true,
          onCancel: () => {
            setModal(false);
            setEditE(null);
          },
          footer: null,
          width: 460,
          centered: true,
          title: React.createElement(
            Text,
            { strong: true, style: { fontFamily: FONT, fontSize: 15 } },
            editE ? tr("✏️ Update timesheet") : tr("⏱ Log work hours"),
          ),
        },
        React.createElement(
          "div",
          null,
          fld(
            tr("👨‍⚖️ Lawyer"),
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
                name: myLawyer.lawyerName,
                color: "#096dd9",
                size: 20,
              }),
              React.createElement(
                "span",
                { style: { fontWeight: 600 } },
                myLawyer.lawyerName,
              ),
              React.createElement(
                "span",
                {
                  style: { marginLeft: "auto", fontSize: 11, color: "#bfbfbf" },
                },
                tr("(you)"),
              ),
            ),
          ),
          React.createElement(
            "div",
            { style: { marginBottom: 14 } },
            lbl(tr("🕐 Start time *")),
            React.createElement("input", {
              type: "datetime-local",
              value: startInput,
              onChange: (e) => {
                setStartInput(e.target.value);
                setOverlapErr("");
              },
              style: { ...inpS, fontSize: 13, cursor: "pointer" },
              onFocus: fb,
              onBlur: bb,
            }),
            !editE &&
              React.createElement(
                "div",
                {
                  onClick: () => setStartInput(nowLocalDTStr()),
                  style: {
                    fontSize: 11,
                    fontFamily: FONT,
                    color: "#1890ff",
                    cursor: "pointer",
                    marginTop: 5,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  },
                },
                tr("⚡ Use the current time"),
              ),
          ),
          React.createElement(
            "div",
            { style: { marginBottom: 14 } },
            lbl(tr("⏱ Hours worked *")),
            React.createElement(
              "div",
              { style: { position: "relative" } },
              React.createElement("input", {
                type: "number",
                step: "0.5",
                min: "0.5",
                max: "24",
                placeholder: tr("e.g. 2 or 1.5"),
                value: durInput,
                onChange: (e) => {
                  setDurInput(e.target.value);
                  setOverlapErr("");
                },
                style: {
                  ...inpS,
                  textAlign: "right",
                  paddingRight: 48,
                  border: overlapInfo
                    ? "2px solid #cf1322"
                    : dur > 0
                      ? "2px solid #1890ff"
                      : "1px solid #e8e8e8",
                },
                onFocus: fb,
                onBlur: bb,
              }),
              React.createElement(
                "span",
                {
                  style: {
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 14,
                    color: "#8c8c8c",
                    fontFamily: FONT,
                    pointerEvents: "none",
                  },
                },
                tr("hours"),
              ),
            ),
            computedStart &&
              dur > 0 &&
              React.createElement(
                "div",
                {
                  style: {
                    marginTop: 8,
                    padding: "10px 14px",
                    background: overlapInfo ? "#fff1f0" : "#e6f4ff",
                    borderRadius: 8,
                    border: `1px solid ${overlapInfo ? "#ffa39e" : "#91caff"}`,
                  },
                },
                React.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom:
                        overlapInfo || item.estimatedDuration > 0 ? 6 : 0,
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
                    "🕐",
                  ),
                  React.createElement(
                    "span",
                    {
                      style: {
                        fontSize: 13,
                        fontFamily: FONT,
                        fontWeight: 600,
                        color: overlapInfo ? "#cf1322" : "#096dd9",
                      },
                    },
                    `${computedStart.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })} → ${computedEnd.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}`,
                  ),
                  React.createElement(
                    "span",
                    {
                      style: {
                        marginLeft: "auto",
                        fontSize: 13,
                        fontFamily: FONT,
                        fontWeight: 700,
                        color: overlapInfo ? "#cf1322" : "#096dd9",
                      },
                    },
                    fmtHours(dur),
                  ),
                ),
                overlapInfo &&
                  React.createElement(
                    "div",
                    {
                      style: {
                        padding: "6px 10px",
                        background: "#fff1f0",
                        borderRadius: 6,
                        border: "1px solid #ffa39e",
                        marginBottom: 6,
                      },
                    },
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 12,
                          fontFamily: FONT,
                          fontWeight: 700,
                          color: "#cf1322",
                          marginBottom: 3,
                        },
                      },
                      tr("⛔ Overlaps:"),
                    ),
                    ...overlapInfo
                      .slice(0, 3)
                      .map((cf, i) =>
                        React.createElement(
                          "div",
                          {
                            key: i,
                            style: {
                              fontSize: 11,
                              fontFamily: FONT,
                              color: "#cf1322",
                            },
                          },
                          `• ${fmt(cf.startTime, "full")} → ${fmt(cf.endTime, "full")}`,
                        ),
                      ),
                  ),
                !overlapInfo &&
                  item.estimatedDuration > 0 &&
                  React.createElement(
                    "div",
                    {
                      style: { paddingTop: 6, borderTop: "1px solid #bae0ff" },
                    },
                    React.createElement(
                      "div",
                      {
                        style: {
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 3,
                        },
                      },
                      React.createElement(
                        "span",
                        {
                          style: {
                            fontSize: 10,
                            fontFamily: FONT,
                            color: "#8c8c8c",
                          },
                        },
                        tr("📊 Total after saving:"),
                      ),
                      React.createElement(
                        "span",
                        {
                          style: {
                            fontSize: 13,
                            fontFamily: FONT,
                            fontWeight: 700,
                            color: "#096dd9",
                          },
                        },
                        fmtHours(previewTotal),
                      ),
                    ),
                    React.createElement(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        },
                      },
                      React.createElement(
                        "span",
                        {
                          style: {
                            fontSize: 10,
                            fontFamily: FONT,
                            color: "#8c8c8c",
                          },
                        },
                        tr("⚡ Productivity (estimated {0}):", { 0: fmtHours(item.estimatedDuration) }),
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
                            background: wrCfg(previewWR).bg,
                            color: wrCfg(previewWR).color,
                          },
                        },
                        wrCfg(previewWR).label,
                      ),
                    ),
                  ),
              ),
          ),
          fld(
            tr("📝 Description"),
            React.createElement("textarea", {
              value: descInput,
              onChange: (e) => setDescInput(e.target.value),
              placeholder: tr("Short description..."),
              rows: 3,
              style: { ...inpS, resize: "vertical", lineHeight: 1.6 },
              onFocus: fb,
              onBlur: bb,
            }),
          ),
          !editE &&
            React.createElement(
              "div",
              {
                style: {
                  padding: "8px 12px",
                  background: "#f5f5f5",
                  borderRadius: 6,
                  border: "1px solid #e8e8e8",
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                },
              },
              React.createElement("span", { style: { fontSize: 13 } }, "📝"),
              React.createElement(
                "span",
                { style: { fontSize: 12, fontFamily: FONT, color: "#595959" } },
                tr("The timesheet will be saved with status "),
                React.createElement("strong", null, tr("\"Draft\"")),
              ),
            ),
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                paddingTop: 12,
                borderTop: "1px solid #f0f0f0",
              },
            },
            React.createElement(
              "div",
              {
                onClick: () => {
                  setModal(false);
                  setEditE(null);
                },
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
              tr("Cancel"),
            ),
            React.createElement(
              "div",
              {
                onClick: saving || overlapInfo ? null : save,
                style: {
                  padding: "7px 24px",
                  borderRadius: 6,
                  background: saving
                    ? "#f5f5f5"
                    : overlapInfo
                      ? "#f5f5f5"
                      : "#1890ff",
                  color: saving || overlapInfo ? "#bfbfbf" : "#fff",
                  cursor: saving || overlapInfo ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontFamily: FONT,
                  fontWeight: 700,
                },
              },
              saving ? tr("Saving...") : editE ? tr("Update") : tr("💾 Save draft"),
            ),
          ),
        ),
      ),
    React.createElement(RejectModal, {
      open: rejectModal,
      onClose: () => {
        setRejectModal(false);
        setRejectTarget(null);
      },
      onConfirm: handleRejectConfirm,
    }),
  );
};

const ActivityTab = ({ collectionName, recordId, lawyers = [] }) => {
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
    (n?.createdById ? tr("User #{0}", { 0: n.createdById }) : tr("Anonymous"));

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
      return tr("edited a comment");
    if (isCommentLayout && action === "deleted")
      return tr("deleted a comment");

    const layoutLabels = {
      fileOnly: tr("uploaded files"),
      commentGroup: tr("commented"),
      commentOnly: tr("commented"),
      mentionOnly: tr("commented"),
    };
    const actionLabels = {
      created: tr("commented"),
      commented: tr("commented"),
      updated: tr("edited"),
      deleted: tr("deleted"),
      uploaded: tr("uploaded"),
    };
    return (
      layoutLabels[layoutType] ||
      actionLabels[action] ||
      tr("acted")
    );
  };

  const getLayoutBadge = (layoutType, files) => {
    const fileCount = (files || []).length;
    if (layoutType === "commentGroup") {
      return fileCount > 0
        ? tr("Comment + {0} files", { 0: fileCount })
        : tr("Comment + mentions");
    }
    if (layoutType === "commentOnly") return tr("Comment");
    if (layoutType === "fileOnly")
      return fileCount > 1
        ? tr("{0} files", { 0: fileCount })
        : tr("Attached file");
    if (layoutType === "mentionOnly") return tr("Mention");
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
          const relatedParentNote =
            relatedNote?.parentId
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
          tr("replied to {0}:", { 0: parentAuthor }),
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
            tr("Comment content:"),
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
                tr("↓ changed to ↓"),
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
                    tr("(Note mentions someone)"),
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
            tr("Mentioned people:"),
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
            tr("Attached file:"),
          ),
          files.map((f) => {
            const att = Array.isArray(f.fileAttachment)
              ? f.fileAttachment[0]
              : f.fileAttachment;
            const rawName =
              f.title || att?.title || att?.filename || tr("(No name yet)");
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
                  tr("DOWNLOAD"),
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
    const fieldLabel = tF(a.fieldName || tr("data"));
    const user = a.changedByName || tr("System");
    const actionLabel =
      a.action === "created"
        ? tr("created {0}", { 0: fieldLabel })
      : a.action === "deleted"
          ? tr("deleted {0}", { 0: fieldLabel })
          : tr("updated {0}", { 0: fieldLabel });
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
            tr(" {0} at ", { 0: actionLabel }),
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
          tr("Value:"),
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
        return tr("Edited the comment and its mentions");
      if (hasBodyLog) return tr("Edited the comment");
      if (hasAssigneeLog)
        return tr("Updated the comment's mentions");
    }

    if (collectionName === "Note" && action === "deleted")
      return tr("Deleted the comment");

    if (firstUnified?.parentAuthor)
      return tr("Replied to {0}'s comment", { 0: firstUnified.parentAuthor });

    if (layoutType === "fileOnly")
      return fileCount > 1
        ? tr("Uploaded {0} attached files", { 0: fileCount })
        : tr("Uploaded an attached file");

    if (layoutType === "commentGroup")
      return tr("Created a comment with related details");

    if (layoutType === "commentOnly") return tr("Created a comment");

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
        tr("Action:"),
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
    const { items, latestTime, action, isDeleted, layoutType = "logGroup" } = group;
    const firstIt = items[0];
    const filesInGroup = items.flatMap((it) => it.files || []);
    const isOnlyLayout =
      layoutType === "commentOnly" || layoutType === "fileOnly";
    const badge = getLayoutBadge(layoutType, filesInGroup);

    // Tên user hiển thị
    const user =
      firstIt._kind === "log"
        ? firstIt.data.changedByName || tr("System")
        : firstIt.note
          ? authorName(firstIt.note)
          : tr("System");

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
            tr("{0} at {1}", { 0: actionLabel, 1: fmt(latestTime, "full") || "\u2014" }),
          ),
          badge &&
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 11,
                  color: layoutType === "fileOnly" ? "#531dab" : "#006d75",
                  background:
                    layoutType === "fileOnly" ? "#f9f0ff" : "#e6fffb",
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
          tr("Attached file:"),
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
        isUpd ? tr("updated [{0}]", { 0: label }) : tr("deleted [{0}]", { 0: label }),
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
        tr("Activity history"),
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
              tr("No activity yet"),
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
                    ? tr("▲ Collapse (showing {0} of {1})", { 0: INITIAL_COUNT, 1: items.length })
                    : tr("▼ View {0} more activities ({1} total)", { 0: items.length - INITIAL_COUNT, 1: items.length }),
                ),
            ),
    ),
  );
};



const DetailModal = ({
  item, type, lawyers, allTasksInProject, tasksInService, services,
  projectManagerId, onClose, onUpdate, currentUser, isManager = false,
  onStatusChange, isAssignedToThis = false, projectFolderId, myLawyer,
}) => {
  if (!item) return null;
  const name             = type === 'subtask' ? item.subTaskName : item.title;
  const collectionName   = type === 'subtask' ? 'SubTask' : 'Task';
  const st               = STATUS_CFG[item.status] || STATUS_CFG.toDo;
  
  const canEdit  = isManager || isAssignedToThis;
  const canManage = isManager;
  
  const _pool = tasksInService || allTasksInProject || [];
  const [editName, setEditName]   = useState(false);
  const [nameVal, setNameVal]     = useState(name);
  const [estDurVal, setEstDurVal] = useState(item.estimatedDuration || '');
  const [openTimesheet, setOpenTimesheet] = useState(false);
  const [openActivity, setOpenActivity]   = useState(false);
  const [previewDoc, setPreviewDoc]       = useState(null); 
  
  const [allFiles, setAllFiles]           = useState([]);
  const [loadingFiles, setLoadingFiles]   = useState(true);

  useEffect(() => {
    if (!item?.id) return;
    let isMounted = true;
    const load = async () => {
      setLoadingFiles(true);
      try {
        const colName = type === 'subtask' ? 'SubTask' : 'Task';
        const p1 = fetchFiles(colName, item.id);
        const p2 = (type === 'subtask' && item.taskId) 
          ? fetchFiles('Task', item.taskId) 
          : Promise.resolve([]);
          
        const [files1, files2] = await Promise.all([p1, p2]);
        if (!isMounted) return;
        
        const map = {};
        [...files1, ...files2].forEach(f => { if (f && f.id) map[f.id] = f; });
        setAllFiles(Object.values(map));
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoadingFiles(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [item.id, item.taskId, type]);

  const templateFiles = allFiles.filter(f => f.documentType && f.documentType.toLowerCase().trim() === 'file mẫu');
  const regularFiles = allFiles.filter(f => !f.documentType || f.documentType.toLowerCase().trim() !== 'file mẫu');

  const inpStyle    = { border: '1px solid #e8e8e8', borderRadius: 4, padding: '6px 10px', fontSize: 12, fontFamily: FONT, outline: 'none', color: '#262626', background: '#fff', width: '100%', boxSizing: 'border-box' };
  
  const toLocalDT = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  
  const handleStatus = async (newSt) => {
    if (!canEdit) return;
    if (type === 'task' && item.previousTaskId) {
      const prevTask = _pool.find((t) => extractId(t.id) === extractId(item.previousTaskId));
      if (prevTask && prevTask.status !== 'done' && prevTask.status !== 'cancelled') {
        if (!['cancelled', 'blocked'].includes(newSt)) { message.warning(tr("Must complete \"{0}\" first", { 0: prevTask.title })); return; }
      }
    }
    const resolvedSt = resolveStatus(newSt, item);
    const url  = type === 'subtask' ? `subTasks:update?filterByTk=${extractId(item.id)}` : `tasks:update?filterByTk=${extractId(item.id)}`;
    const data = resolvedSt === 'done' ? { status: resolvedSt, closedDate: new Date().toISOString() } : { status: resolvedSt, closedDate: null };
    
    onUpdate({ ...item, ...data });

    try {
      await apiReq(url, 'POST', data);
      await logAct(collectionName, extractId(item.id), 'updated', 'status', st.label, STATUS_CFG[resolvedSt]?.label, userName(currentUser));
      if (onStatusChange) onStatusChange(extractId(item.id), resolvedSt, type, data);
      message.success(tr("Status: {0}", { 0: STATUS_CFG[resolvedSt]?.label }));
    } catch (error) {
      message.error(tr("Update failed!"));
      onUpdate({ ...item }); 
    }
  };
  
  const handleAssign = async (id, n, c) => {
    if (!canManage) return;
    const url = type === 'subtask' ? `subTasks:update?filterByTk=${extractId(item.id)}` : `tasks:update?filterByTk=${extractId(item.id)}`;
    await apiReq(url, 'POST', { lawyerId: id });
    onUpdate({ ...item, lawyerId: id, _ln: n, _lc: c || '#8c8c8c' });
  };
  
  const handlePriority = async (newPr) => {
    if (!canEdit) return;
    const url = type === 'subtask' ? `subTasks:update?filterByTk=${extractId(item.id)}` : `tasks:update?filterByTk=${extractId(item.id)}`;
    onUpdate({ ...item, priority: newPr });
    try {
      await apiReq(url, 'POST', { priority: newPr });
      message.success(tr("Priority updated"));
    } catch(e) {
      message.error(tr("Could not update"));
      onUpdate({ ...item }); 
    }
  };

  const saveName = async () => {
    if (!canEdit) { setEditName(false); return; }
    setEditName(false);
    if (!nameVal.trim() || nameVal === name) return;
    const url   = type === 'subtask' ? `subTasks:update?filterByTk=${extractId(item.id)}` : `tasks:update?filterByTk=${extractId(item.id)}`;
    const field = type === 'subtask' ? 'subTaskName' : 'title';
    onUpdate({ ...item, [field]: nameVal.trim() });
    try {
      await apiReq(url, 'POST', { [field]: nameVal.trim() });
      message.success(tr("Name updated"));
    } catch(e) {
      message.error(tr("Could not update"));
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
      const url = type === 'subtask' ? `subTasks:update?filterByTk=${extractId(item.id)}` : `tasks:update?filterByTk=${extractId(item.id)}`;
      await apiReq(url, 'POST', { estimatedDuration: newVal });
      message.success(tr("Estimated duration updated"));
    } catch (e) {
      message.error(tr("Could not update"));
      onUpdate({ ...item });
      setEstDurVal(oldVal || '');
    }
  };
  
  const modalTitle = React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingRight: 20 } },
    React.createElement('span', { style: { fontSize: 18, marginRight: 4 } }, type === 'subtask' ? '↳' : '📋'),
    canEdit && editName
      ? React.createElement('input', { value: nameVal, onChange: (e) => setNameVal(e.target.value), autoFocus: true, onKeyDown: (e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditName(false); }, onBlur: saveName, style: { fontSize: 16, fontWeight: 600, fontFamily: FONT, border: 'none', borderBottom: '2px solid #1890ff', outline: 'none', background: 'transparent', padding: '2px 4px', minWidth: 300 } })
      : React.createElement('span', { onClick: canEdit ? () => setEditName(true) : undefined, style: { fontSize: 16, fontWeight: 600, fontFamily: FONT, color: '#1a1a1a', cursor: canEdit ? 'text' : 'default' } }, nameVal || name),
    item.isRequiredApproval && React.createElement('span', { style: { fontSize: 11, padding: '2px 6px', borderRadius: 3, background: '#fff7e6', color: '#d46b08', border: '1px solid #ffd591' } }, tr("Requires approval")),
    item._od && React.createElement('span', { style: { fontSize: 11, padding: '2px 6px', borderRadius: 3, background: '#fff1f0', color: '#cf1322', border: '1px solid #ffa39e' } }, tr("Overdue")),
  );

  const renderFileList = (files, emptyMsg = tr("No attached files yet."), hideTime = false) => {
    if (loadingFiles) return React.createElement('div', { style: { padding: '10px 0' } }, React.createElement(Spin, { size: 'small' }));
    if (files.length === 0) return React.createElement('div', { style: { fontSize: 12, color: '#bfbfbf', fontStyle: 'italic', fontFamily: FONT } }, emptyMsg);
    return React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 } },
      ...files.map(f => {
        const att = Array.isArray(f.fileAttachment) ? f.fileAttachment[0] : f.fileAttachment;
        let originalName = att?.filename || tr("File"); 
        let ext = att?.extname ? (att.extname.startsWith('.') ? att.extname.toLowerCase() : '.' + att.extname.toLowerCase()) : '';
        if (ext && originalName.toLowerCase().endsWith(ext)) originalName = originalName.slice(0, -ext.length);
        const finalFileName = originalName + ext;
        const customTitle = (f.title && f.title !== originalName && f.title !== finalFileName) ? f.title : null;
        const fullUrl = getFullUrl(att?.url || att?.preview);
        return React.createElement('div', {
          key: f.id, onClick: fullUrl ? () => setPreviewDoc(f) : undefined,
          style: { display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 6, cursor: fullUrl ? 'pointer' : 'default', transition: 'all 0.2s' },
          onMouseEnter: (e) => e.currentTarget.style.borderColor = '#1890ff', onMouseLeave: (e) => e.currentTarget.style.borderColor = '#e8e8e8',
        },
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } }, 
            React.createElement('div', { style: { flex: 1, minWidth: 0 } },
              React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: '#096dd9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, finalFileName),
              !hideTime && React.createElement('div', { style: { fontSize: 11, color: '#8c8c8c', marginTop: 2 } }, timeAgo(f.createdAt))
            )
          ),
          customTitle && React.createElement('div', { style: { fontSize: 11, color: '#262626', marginTop: 2 } }, React.createElement('span', { style: { fontWeight: 600, color: '#8c8c8c' } }, tr("Document name: ")), customTitle),
          f.note && React.createElement('div', { style: { fontSize: 11, color: '#262626', marginTop: 4, padding: '6px 10px', background: '#fff', borderRadius: 4, border: '1px solid #f0f0f0' } }, React.createElement('span', { style: { fontWeight: 700, color: '#8c8c8c', marginRight: 6 } }, tr("Note:")), f.note)
        );
      })
    );
  };

  const headerBar = (txt) => React.createElement('div', { style: { padding: '12px 24px', borderBottom: '1px solid #f0f0f0', background: '#fafafa', fontSize: 14, fontWeight: 600, color: '#262626', flexShrink: 0 } }, txt);
  
  return React.createElement(React.Fragment, null,
    React.createElement(Modal, {
      open: true, onCancel: onClose, footer: null, width: 1200, centered: true, title: modalTitle,
      bodyStyle: { padding: 0, height: '85vh', display: 'flex', flexDirection: 'column' },
      style: { fontFamily: FONT, top: 20 },
      closeIcon: React.createElement('span', { style: { fontSize: 20, color: '#8c8c8c' } }, '×')
    },
      // ACTION BAR
      React.createElement('div', { style: { display: 'flex', gap: 10, padding: '12px 24px', borderBottom: '1px solid #f0f0f0', background: '#fff', flexShrink: 0 } },
        React.createElement('div', {
          style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', background: '#e6f4ff', color: '#096dd9', border: '1px solid #91caff', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: '0.2s' },
          onClick: () => setOpenTimesheet(true), onMouseEnter: e => e.currentTarget.style.background = '#bae0ff', onMouseLeave: e => e.currentTarget.style.background = '#e6f4ff',
        }, tr("Log Timesheet")),
        React.createElement('div', {
          style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', background: '#f5f5f5', color: '#595959', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: '0.2s' },
          onClick: () => setOpenActivity(true), onMouseEnter: e => e.currentTarget.style.background = '#e8e8e8', onMouseLeave: e => e.currentTarget.style.background = '#f5f5f5',
        }, tr("Activity history"))
      ),

      // GRID LAYOUT (40/60 split)
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '4fr 6fr', flex: 1, overflow: 'hidden' } },
        // LEFT COLUMN (40%)
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', borderRight: '1px solid #f0f0f0', overflow: 'hidden' } },
          headerBar(tr("General information")),
          React.createElement('div', { style: { padding: '20px 24px', overflowY: 'auto', flex: 1 } },
            React.createElement('div', { style: { background: '#fafafa', padding: 16, borderRadius: 8, border: '1px solid #f0f0f0', marginBottom: 24 } },
              
              // Status & Priority Grid
              React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 } },
                React.createElement('div', null, 
                  React.createElement('div', { style: { fontSize: 12, color: '#8c8c8c', fontFamily: FONT, fontWeight: 600, marginBottom: 4 } }, tr("Status")),
                  React.createElement(Select, { value: item.status, onChange: canEdit ? handleStatus : undefined, disabled: !canEdit, style: { width: '100%', fontFamily: FONT }, options: getStatusKeys(item.isRequiredApproval).map(k => ({ label: React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } }, React.createElement('div', { style: { width: 10, height: 10, borderRadius: '50%', background: STATUS_CFG[k].color } }), STATUS_CFG[k].label), value: k })) })
                ),
                React.createElement('div', null, 
                  React.createElement('div', { style: { fontSize: 12, color: '#8c8c8c', fontFamily: FONT, fontWeight: 600, marginBottom: 4 } }, tr("Priority")),
                  React.createElement(Select, { value: item.priority || 'medium', onChange: canEdit ? handlePriority : undefined, disabled: !canEdit, style: { width: '100%', fontFamily: FONT }, options: Object.entries(PRIORITY_CFG).map(([k, v]) => ({ label: `${v.label}`, value: k })) })
                ),
              ),

              // Estimated Duration & Assignee Grid
              React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 } },
                React.createElement('div', null, 
                  React.createElement('div', { style: { fontSize: 12, color: '#8c8c8c', fontFamily: FONT, fontWeight: 600, marginBottom: 4 } }, tr("Estimated duration")),
                  React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                    React.createElement('input', { type: 'number', step: '0.5', min: '0', value: estDurVal, onChange: canEdit ? e => setEstDurVal(e.target.value) : undefined, readOnly: !canEdit, placeholder: tr("Number of hours..."), style: { ...inpStyle, width: '100%' }, onBlur: canEdit ? saveEstDur : undefined }),
                    React.createElement('span', { style: { color: '#8c8c8c', fontSize: 12, flexShrink: 0 } }, tr("hours"))
                  )
                ),
                React.createElement('div', null, 
                  React.createElement('div', { style: { fontSize: 12, color: '#8c8c8c', fontFamily: FONT, fontWeight: 600, marginBottom: 4 } }, tr("Assignee")),
                  React.createElement('div', { style: { border: '1px solid #e8e8e8', borderRadius: 4, padding: '4px 10px', background: canManage ? '#fff' : '#fafafa', minHeight: 32, display: 'flex', alignItems: 'center', boxSizing: 'border-box' } },
                    React.createElement(LawyerPicker, { lawyers, value: extractId(item.lawyerId), size: 20, readOnly: !canManage, onChange: handleAssign })
                  )
                )
              ),

              // Approval Required & Approver Grid
              React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 } },
                React.createElement('div', null,
                  React.createElement('div', { style: { fontSize: 12, color: '#8c8c8c', fontFamily: FONT, fontWeight: 600, marginBottom: 4 } }, tr("Approval required")),
                  React.createElement('label', {
                    style: {
                      display: 'flex', alignItems: 'center', gap: 8, cursor: canManage ? 'pointer' : 'default',
                      fontSize: 12, fontFamily: FONT, color: '#595959',
                      padding: '6px 10px', borderRadius: 6, border: '1px solid #f0f0f0',
                      background: item.isRequiredApproval ? '#fff7e6' : '#fafafa',
                      minHeight: 32, boxSizing: 'border-box',
                    },
                  },
                    React.createElement('input', {
                      type: 'checkbox',
                      checked: !!item.isRequiredApproval,
                      disabled: !canManage,
                      onChange: canManage ? async (e) => {
                        const newVal = e.target.checked;
                        const payload = { isRequiredApproval: newVal };
                        if (!newVal) payload.approvedById = null;
                        const url = type === 'subtask' ? `subTasks:update?filterByTk=${extractId(item.id)}` : `tasks:update?filterByTk=${extractId(item.id)}`;
                        await apiReq(url, 'POST', payload);
                        onUpdate({ ...item, ...payload });
                      } : undefined,
                      style: { width: 14, height: 14, cursor: canManage ? 'pointer' : 'not-allowed', accentColor: '#d46b08' },
                    }),
                    React.createElement('span', {
                      style: { color: item.isRequiredApproval ? '#d46b08' : '#8c8c8c', fontWeight: item.isRequiredApproval ? 600 : 400 },
                    }, item.isRequiredApproval ? tr("Requires approval") : tr("Not required")),
                  ),
                ),
                React.createElement('div', null,
                  React.createElement('div', { style: { fontSize: 12, color: '#8c8c8c', fontFamily: FONT, fontWeight: 600, marginBottom: 4 } }, tr("Approver")),
                  React.createElement('div', {
                    style: {
                      border: '1px solid #e8e8e8', borderRadius: 4, padding: '4px 10px',
                      background: (canManage && item.isRequiredApproval) ? '#fff' : '#fafafa',
                      minHeight: 32, display: 'flex', alignItems: 'center', boxSizing: 'border-box',
                      opacity: item.isRequiredApproval ? 1 : 0.45,
                    },
                  },
                    React.createElement(LawyerPicker, {
                      lawyers,
                      value: extractId(item.approvedById),
                      size: 20,
                      readOnly: !canManage || !item.isRequiredApproval,
                      onChange: (canManage && item.isRequiredApproval) ? async (id) => {
                        const url = type === 'subtask' ? `subTasks:update?filterByTk=${extractId(item.id)}` : `tasks:update?filterByTk=${extractId(item.id)}`;
                        await apiReq(url, 'POST', { approvedById: id });
                        onUpdate({ ...item, approvedById: id });
                      } : undefined,
                    }),
                    !item.approvedById && item.isRequiredApproval && React.createElement('span', { style: { fontSize: 12, fontFamily: FONT, color: '#bfbfbf', marginLeft: 4 } }, tr("Select...")),
                  )
                )
              ),

              // Duration Grid
              React.createElement('div', null, 
                React.createElement('div', { style: { fontSize: 12, color: '#8c8c8c', fontFamily: FONT, fontWeight: 600, marginBottom: 4 } }, tr("Time worked")),
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                  React.createElement('input', { type: 'datetime-local', value: toLocalDT(type === 'subtask' ? item.date : item.startDate), readOnly: !canEdit, onChange: canEdit ? async e => { const val = e.target.value ? new Date(e.target.value).toISOString() : null; const field = type === 'subtask' ? 'date' : 'startDate'; await apiReq(type === 'subtask' ? `subTasks:update?filterByTk=${extractId(item.id)}` : `tasks:update?filterByTk=${extractId(item.id)}`, 'POST', { [field]: val }); onUpdate({ ...item, [field]: val }); } : undefined, style: { ...inpStyle, flex: 1, minWidth: 0 } }),
                  React.createElement('span', { style: { color: '#bfbfbf' } }, '→'),
                  React.createElement('input', { type: 'datetime-local', value: toLocalDT(type === 'subtask' ? item.deadline : item.dueDate), readOnly: !canEdit, onChange: canEdit ? async e => { const val = e.target.value ? new Date(e.target.value).toISOString() : null; const field = type === 'subtask' ? 'deadline' : 'dueDate'; await apiReq(type === 'subtask' ? `subTasks:update?filterByTk=${extractId(item.id)}` : `tasks:update?filterByTk=${extractId(item.id)}`, 'POST', { [field]: val }); onUpdate({ ...item, [field]: val }); } : undefined, style: { ...inpStyle, flex: 1, minWidth: 0, color: item._od ? '#cf1322' : '#262626' } })
                )
              )
            ),

            // MAIN CONTENT (Editors)
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 24 } },
              React.createElement('div', null,
                React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: '#262626', marginBottom: 12 } }, tr("Work description")),
                React.createElement(DescriptionInlineEditor, { item, type, onUpdate, readOnly: !canEdit }),
              ),
              type !== 'subtask' && React.createElement('div', null,
                React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: '#262626', marginBottom: 12 } }, tr("Prerequisite task (Pending Issue)")),
                React.createElement(TaskPicker, { allTasks: allTasksInProject || [], currentTaskId: extractId(item.id), value: extractId(item.previousTaskId), services, readOnly: !canEdit, onChange: async newPrevId => { 
                  const found = (allTasksInProject || []).find(t => extractId(t.id) === extractId(newPrevId));
                  const newStatus = newPrevId ? (found?.status !== 'done' && found?.status !== 'cancelled' ? 'blocked' : item.status) : (item.status === 'blocked' ? 'toDo' : item.status);
                  const payload = { previousTaskId: newPrevId || null, status: newStatus };
                  await apiReq(`tasks:update?filterByTk=${extractId(item.id)}`, 'POST', payload); 
                  onUpdate({ ...item, ...payload }); 
                } }),
              ),
              React.createElement('div', null,
                React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: '#262626', marginBottom: 12 } }, tr("Next step")),
                React.createElement(NextStepInlineEditor, { item, onUpdate, currentUser, readOnly: !canEdit }),
              ),
              React.createElement('div', null,
                React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: '#262626', marginBottom: 12 } }, tr("Template files")),
                renderFileList(templateFiles, tr("No template files yet."), true),
                React.createElement('div', { style: { fontSize: 14, fontWeight: 600, color: '#262626', marginBottom: 12, marginTop: 24 } }, tr("Attached file")),
                renderFileList(regularFiles, tr("No attached files yet.")),
              ),
            )
          )
        ),
        // RIGHT COLUMN (60%)
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' } },
          headerBar(tr("Comments & Reports")),
          React.createElement('div', { style: { flex: 1, overflow: 'hidden' } },
            React.createElement(UnifiedNoteThread, { 
              collectionName: type === 'subtask' ? 'SubTask' : 'Task', 
              recordId: extractId(item.id), 
              currentUser, 
              lawyers, 
              canEdit,
              projectFolderId,
            })
          )
        ),
      )
    ),

    // Drawers for Timesheet & Activity
    React.createElement(Drawer, { title: tr("Work hour history"), placement: 'right', width: 500, open: openTimesheet, onClose: () => setOpenTimesheet(false), bodyStyle: { padding: 20 } },
      React.createElement(TimesheetTab, { item, type, myLawyer, isManager, canAccess: true })
    ),
    React.createElement(Drawer, { title: tr("Activity history"), placement: 'right', width: 700, open: openActivity, onClose: () => setOpenActivity(false), bodyStyle: { padding: 0 } },
      React.createElement(ActivityTab, { collectionName: type === 'subtask' ? 'SubTask' : 'Task', recordId: extractId(item.id), lawyers })
    ),
    previewDoc && React.createElement(PreviewModal, { doc: previewDoc, onClose: () => setPreviewDoc(null) })
  );
};

// ==================== TABLE VIEW COLUMNS ====================
const buildTableColumns = (myLawyer, onOpen, lawyerMap) => [
  {
    title: tr("Type"),
    key: "type",
    width: 44,
    align: "center",
    render: (_, r) =>
      React.createElement(
        Tooltip,
        { title: r._type === "subtask" ? tr("Subtask") : tr("Main task") },
        React.createElement(
          "span",
          { style: { fontSize: 14 } },
          r._type === "subtask" ? "📌" : "📋",
        ),
      ),
  },
  {
    title: tr("Task name"),
    key: "name",
    width: 220,
    render: (_, r) => {
      const name = r._type === "subtask" ? r.subTaskName : r.title;
      const od =
        r._type === "subtask"
          ? isOD(r.deadline, r.status)
          : isOD(r.dueDate, r.status);
      return React.createElement(
        "div",
        { style: { minWidth: 0 } },
        React.createElement(
          "div",
          {
            onClick: (e) => {
              e.stopPropagation();
              onOpen(r, r._type);
            },
            style: {
              fontSize: 13,
              fontFamily: FONT,
              fontWeight: 600,
              color:
                r.status === "done" ? "#bfbfbf" : od ? "#cf1322" : "#1890ff",
              lineHeight: 1.4,
              cursor: "pointer",
              textDecoration: r.status === "done" ? "line-through" : "none",
            },
          },
          name || "—",
        ),
        r._type === "subtask" &&
          r._parentTitle &&
          React.createElement(
            "div",
            {
              style: {
                fontSize: 11,
                fontFamily: FONT,
                color: "#8c8c8c",
                marginTop: 2,
              },
            },
            `↳ ${r._parentTitle}`,
          ),
      );
    },
  },
  {
    title: tr("Description"),
    key: "description",
    width: 200,
    render: (_, r) => {
      if (!r.description)
        return React.createElement(
          "span",
          { style: { color: "#d9d9d9", fontSize: 12 } },
          "—",
        );
      return React.createElement(
        Tooltip,
        { title: r.description, overlayStyle: { maxWidth: 380 } },
        React.createElement(
          "div",
          {
            style: {
              fontSize: 12,
              fontFamily: FONT,
              color: "#595959",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              cursor: "default",
            },
          },
          r.description,
        ),
      );
    },
  },
  {
    title: tr("Pending Issue"),
    key: "pendingIssue",
    width: 190,
    render: (_, r) => {
      const prev = r._pendingTask;
      if (!prev) {
        return React.createElement(
          "span",
          {
            style: {
              fontSize: 11,
              fontFamily: FONT,
              fontWeight: 500,
              color: "#389e0d",
              background: "#f6ffed",
              border: "1px solid #b7eb8f",
              borderRadius: 3,
              padding: "2px 8px",
            },
          },
          tr("✓ None"),
        );
      }
      const stCfg = STATUS_CFG[prev.status] || STATUS_CFG.toDo;
      const isBlocking =
        prev.status !== "done" &&
        prev.status !== "approval" &&
        prev.status !== "cancelled";
      if (!isBlocking) {
        return React.createElement(
          "span",
          {
            style: {
              fontSize: 11,
              fontFamily: FONT,
              fontWeight: 500,
              color: "#389e0d",
              background: "#f6ffed",
              border: "1px solid #b7eb8f",
              borderRadius: 3,
              padding: "2px 8px",
            },
          },
          tr("✓ Done"),
        );
      }
      return React.createElement(
        Tooltip,
        {
          title: `${prev.title} — ${stCfg.label}`,
          overlayStyle: { maxWidth: 320 },
        },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "#fff1f0",
              border: "1px solid #ffa39e",
              borderRadius: 3,
              padding: "3px 8px",
              cursor: "default",
            },
          },
          React.createElement("span", {
            style: {
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: stCfg.color,
              flexShrink: 0,
            },
          }),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 11,
                fontFamily: FONT,
                color: "#a8071a",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 148,
              },
            },
            prev.title,
          ),
        ),
      );
    },
  },
  {
    title: tr("Next Step"),
    key: "nextStep",
    width: 190,
    render: (_, r) => {
      if (!r.nextStepDescription)
        return React.createElement(
          "span",
          { style: { color: "#d9d9d9", fontSize: 12 } },
          "—",
        );
      return React.createElement(
        Tooltip,
        { title: r.nextStepDescription, overlayStyle: { maxWidth: 380 } },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "flex-start", gap: 6 } },
          React.createElement(
            "span",
            {
              style: {
                flexShrink: 0,
                marginTop: 1,
                width: 16,
                height: 16,
                background: "#e6f4ff",
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                color: "#1890ff",
                fontWeight: 700,
              },
            },
            "→",
          ),
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: "#096dd9",
                fontWeight: 500,
                lineHeight: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                cursor: "default",
              },
            },
            r.nextStepDescription,
          ),
        ),
      );
    },
  },
  {
    title: tr("Status"),
    key: "status",
    width: 130,
    align: "center",
    render: (_, r) => React.createElement(SBadge, { status: r.status }),
  },
  {
    title: tr("Start"),
    key: "startDate",
    width: 96,
    align: "center",
    render: (_, r) => {
      const sd = r._type === "subtask" ? r.date : r.startDate;
      if (!sd)
        return React.createElement(
          "span",
          { style: { color: "#d9d9d9", fontSize: 12 } },
          "—",
        );
      return React.createElement(
        "span",
        { style: { fontSize: 12, fontFamily: FONT, color: "#595959" } },
        fmt(sd, "date"),
      );
    },
  },
  {
    title: tr("Deadline"),
    key: "deadline",
    width: 100,
    align: "center",
    render: (_, r) => {
      const dl = r._type === "subtask" ? r.deadline : r.dueDate;
      const od = isOD(dl, r.status);
      const tod = isToday(dl);
      if (!dl)
        return React.createElement(
          "span",
          { style: { color: "#d9d9d9", fontSize: 12 } },
          "—",
        );
      return React.createElement(
        "span",
        {
          style: {
            fontSize: 12,
            fontFamily: FONT,
            color: od ? "#cf1322" : tod ? "#d46b08" : "#595959",
            fontWeight: od || tod ? 700 : 400,
          },
        },
        fmt(dl, "date"),
      );
    },
  },
  {
    title: tr("Approver"),
    key: "approver",
    width: 130,
    render: (_, r) => {
      if (!r.isRequiredApproval) {
        return React.createElement(
          "span",
          { style: { fontSize: 11, color: "#d9d9d9" } },
          "—",
        );
      }
      const approverName =
        r.approvedById && lawyerMap ? lawyerMap[String(r.approvedById)] : null;
      if (!approverName) {
        return React.createElement(
          "span",
          {
            style: {
              fontSize: 11,
              fontFamily: FONT,
              color: "#bfbfbf",
              fontStyle: "italic",
            },
          },
          tr("Not selected"),
        );
      }
      const lIdx = Object.keys(lawyerMap || {}).indexOf(String(r.approvedById));
      const color = LAWYER_COLORS[Math.max(0, lIdx) % LAWYER_COLORS.length];
      return React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 5 } },
        React.createElement(Av, { name: approverName, color, size: 18 }),
        React.createElement(
          "span",
          {
            style: {
              fontSize: 12,
              fontFamily: FONT,
              color: "#262626",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          },
          approverName,
        ),
      );
    },
  },
  {
    title: tr("Approval date"),
    key: "acceptedAt",
    width: 100,
    align: "center",
    render: (_, r) => {
      if (!r.acceptedAt)
        return React.createElement(
          "span",
          { style: { color: "#d9d9d9", fontSize: 12 } },
          "—",
        );
      return React.createElement(
        "span",
        {
          style: {
            fontSize: 12,
            fontFamily: FONT,
            color: "#389e0d",
            fontWeight: 500,
          },
        },
        fmt(r.acceptedAt, "date"),
      );
    },
  },
  {
    title: tr("Rejection reason"),
    key: "rejectionReason",
    width: 180,
    render: (_, r) => {
      const reason = r.rejectionReason || r.rejectReason;
      if (!reason)
        return React.createElement(
          "span",
          { style: { color: "#d9d9d9", fontSize: 12 } },
          "—",
        );
      return React.createElement(
        Tooltip,
        { title: reason, overlayStyle: { maxWidth: 360 } },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "flex-start", gap: 5 } },
          React.createElement(
            "span",
            { style: { flexShrink: 0, fontSize: 12 } },
            "❌",
          ),
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: "#cf1322",
                lineHeight: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                cursor: "default",
              },
            },
            reason,
          ),
        ),
      );
    },
  },
];

// ── MAIN ──
const MyTaskTab = () => {
  const [myTasks, setMyTasks] = useState([]);
  const [mySubs, setMySubs] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [myLawyer, setMyLawyer] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [stFilter, setStFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [caseFilter, setCaseFilter] = useState("all");
  const [visibleCases, setVisibleCases] = useState(5);
  const [view, setView] = useState("table");
  const [lawyerMap, setLawyerMap] = useState({});
  const [lawyers, setLawyers]     = useState([]);
  const [services, setServices]   = useState([]);
  const [projects, setProjects]   = useState([]);
  // ── NEW: track whether current user is admin / root ──
  const [isAdminView, setIsAdminView] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const user = await getCurrentUser();
    setCurrentUser(user);
    if (!user) {
      setLoading(false);
      return;
    }

    const lawyersData = await fetchAll(
      "lawyers:list",
      "id,lawyerName,unitPrice,lawyerType,userId",
    );
    setLawyers(lawyersData);
    const resolveUid = (l) => {
      if (l.userId == null) return null;
      if (typeof l.userId === "object") return l.userId?.id;
      return l.userId;
    };
    const me = lawyersData.find((l) => String(resolveUid(l)) === String(user.id));

    // ── NEW: detect admin / root roles ──
    const roles = user.roles || [];
    const roleNames = roles
      .map((r) => (typeof r === "string" ? r : r?.name || ""))
      .map((s) => s.toLowerCase());
    const isAdmin = roleNames.some(
      (r) =>
        r === "admin" ||
        r === "root" ||
        r === "super admin" ||
        r === "superadmin",
    );
    setIsAdminView(isAdmin);

    const lMap = {};
    lawyersData.forEach((l) => {
      lMap[String(l.id)] = l.lawyerName;
    });
    setLawyerMap(lMap);

    // ── NEW: if admin has no lawyer profile, set a synthetic placeholder so the UI still renders ──
    const effectiveLawyer =
      me ||
      (isAdmin
        ? {
            id: -1,
            lawyerName: user.nickname || user.username || "Admin",
            lawyerType: "partner",
            unitPrice: 0,
          }
        : null);

    setMyLawyer(effectiveLawyer || null);

    if (!effectiveLawyer) {
      setLoading(false);
      return;
    }

    // ── NEW: admin sees ALL tasks; regular lawyers see only their own ──
    const taskFilter =
      isAdmin && !me ? {} : { lawyerId: { $eq: effectiveLawyer.id } };
    const subFilter =
      isAdmin && !me ? {} : { lawyerId: { $eq: effectiveLawyer.id } };

    const [tasks, subs, allT] = await Promise.all([
      fetchAll(
        "tasks:list",
        "id,title,status,priority,startDate,dueDate,closedDate,lawyerId,projectId,serviceId,description,estimatedDuration,previousTaskId,nextStepDescription,isRequiredApproval,approvedById,acceptedAt,rejectionReason,createdAt",
        Object.keys(taskFilter).length > 0 ? taskFilter : undefined,
      ),
      fetchAll(
        "subTasks:list",
        "id,subTaskName,status,priority,date,deadline,closedDate,lawyerId,taskId,description,estimatedDuration,isRequiredApproval,approvedById,acceptedAt,rejectionReason,createdAt",
        Object.keys(subFilter).length > 0 ? subFilter : undefined,
      ),
      fetchAll("tasks:list", "id,title,status"),
    ]);

    setAllTasks(allT);

    const taskMap = {};
    allT.forEach((t) => {
      taskMap[t.id] = t;
    });

    const resolvePending = (previousTaskId) => {
      if (!previousTaskId) return null;
      const item = Array.isArray(previousTaskId)
        ? previousTaskId[0]
        : previousTaskId;
      if (item && typeof item === "object") return item;
      return taskMap[item] || null;
    };

    const projectIds = [
      ...new Set(tasks.map((t) => t.projectId).filter(Boolean)),
    ];
    const serviceIds = [
      ...new Set(tasks.map((t) => t.serviceId).filter(Boolean)),
    ];

    let caseCodeMap = {};
    let projectNameMap = {};
    let serviceNameMap = {};
    let projectFolderMap = {};

    const [projs, foldersRes] = await Promise.all([
      fetchAll("projects:list", "id,caseCode,projectName,createdAt"),
      ctx.api.request({
        url: 'folders:list',
        params: {
          pageSize: 500,
          filter: JSON.stringify({
            $and: [
              { projectId: { $in: projectIds } },
              { type: { $eq: 'cases' } }
            ]
          })
        }
      }).catch(() => null)
    ]);

      projs.forEach((p) => {
        caseCodeMap[p.id] = p.caseCode || null;
        projectNameMap[p.id] = p.projectName || null;
      });

      if (foldersRes?.data?.data) {
        foldersRes.data.data.forEach((f) => {
          if (!projectFolderMap[f.projectId]) {
            projectFolderMap[f.projectId] = f.id;
          }
        });
      }

    if (serviceIds.length > 0) {
      const svcs = await fetchAll("services:list", "id,serviceName", {
        id: { $in: serviceIds },
      });
      svcs.forEach((s) => {
        serviceNameMap[s.id] = s.serviceName || null;
      });
    }

    // ── NEW: build assignee name lookup for admin view ──
    const lawyerNameById = {};
    lawyersData.forEach((l) => {
      lawyerNameById[String(l.id)] = l.lawyerName;
    });

    const taskTitleMap = {};
    tasks.forEach((t) => {
      taskTitleMap[t.id] = t.title;
    });

    setMyTasks(
      tasks.map((t) => ({
        ...t,
        _type: "task",
        _od: isOD(t.dueDate, t.status),
        _today: isToday(t.dueDate),
        _caseCode: caseCodeMap[t.projectId] || null,
        _projectName: projectNameMap[t.projectId] || null,
        _projectFolderId: projectFolderMap[t.projectId] || null,
        _serviceName: serviceNameMap[t.serviceId] || null,
        _pendingTask: resolvePending(t.previousTaskId),
        // ── NEW: resolved assignee name for admin view ──
        _assigneeName: lawyerNameById[String(t.lawyerId)] || null,
      })),
    );

    setMySubs(
      subs.map((s) => {
        const parent =
          tasks.find(
            (t) => t.id === s.taskId || String(t.id) === String(s.taskId),
          ) || {};
        return {
          ...s,
          _type: "subtask",
          _od: isOD(s.deadline, s.status),
          _today: isToday(s.deadline),
          _pendingTask: null,
          _parentTitle: taskTitleMap[s.taskId] || null,
          _caseCode: caseCodeMap[parent.projectId] || null,
          _projectName: projectNameMap[parent.projectId] || null,
          _projectFolderId: projectFolderMap[parent.projectId] || null,
          _serviceName: serviceNameMap[parent.serviceId] || null,
          _assigneeName: lawyerNameById[String(s.lawyerId)] || null,
          projectId: parent.projectId,
          serviceId: parent.serviceId,
        };
      }),
    );

    fetchAll("projects:list", "id,caseCode,projectName,customer,projectManagerId,createdAt")
      .then(list => {
        const sorted = list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setProjects(sorted);
      });
    if (serviceIds.length > 0) {
      fetchAll("services:list", "id,serviceName", { id: { $in: serviceIds } }).then(setServices);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, []);

  const handleStatusChange = useCallback(async (item, type, newStatus) => {
    const url =
      type === "subtask"
        ? `subTasks:update?filterByTk=${item.id}`
        : `tasks:update?filterByTk=${item.id}`;
    const data =
      newStatus === "done"
        ? { status: newStatus, closedDate: new Date().toISOString() }
        : { status: newStatus, closedDate: null };
    try {
      await apiReq(url, "POST", data);
      if (type === "task")
        setMyTasks((p) =>
          p.map((t) =>
            t.id === item.id
              ? { ...t, ...data, _od: isOD(t.dueDate, newStatus) }
              : t,
          ),
        );
      else
        setMySubs((p) =>
          p.map((s) => (s.id === item.id ? { ...s, ...data } : s)),
        );
      message.success(`→ ${STATUS_CFG[newStatus]?.label}`);
    } catch {
      message.error(tr("Update failed"));
    }
  }, []);

  const upd = useCallback((u) => {
    setMyTasks((p) => p.map((t) => (t.id === u.id ? { ...t, ...u } : t)));
    setMySubs((p) => p.map((s) => (s.id === u.id ? { ...s, ...u } : s)));
    setDetail((d) => (d ? { ...d, item: { ...d.item, ...u } } : null));
  }, []);

  const fTask = useMemo(
    () =>
      myTasks
        .filter((t) => stFilter === "all" || t.status === stFilter)
        .filter((t) => caseFilter === "all" || String(t.projectId) === String(caseFilter))
        .filter(
          (t) =>
            !search.trim() ||
            t.title?.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [myTasks, stFilter, caseFilter, search],
  );

  const fSub = useMemo(
    () =>
      mySubs
        .filter((s) => stFilter === "all" || s.status === stFilter)
        .filter((s) => caseFilter === "all" || String(s.projectId) === String(caseFilter))
        .filter(
          (s) =>
            !search.trim() ||
            s.subTaskName?.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [mySubs, stFilter, caseFilter, search],
  );

  const grouped = useMemo(() => {
    const allRows = [
      ...fTask.map((t) => ({
        ...t,
        _projectKey: String(t.projectId || "__none__"),
        _serviceKey: String(t.serviceId || "__none__"),
        _projectLabel:
          [t._caseCode, t._projectName].filter(Boolean).join(" — ") ||
          tr("No project linked"),
        _serviceLabel:
          t._serviceName ||
          (t.serviceId ? tr("Service #{0}", { 0: t.serviceId }) : tr("No service assigned")),
      })),
      ...fSub.map((s) => ({
        ...s,
        _projectKey: String(s.projectId || "__none__"),
        _serviceKey: String(s.serviceId || "__none__"),
        _projectLabel:
          [s._caseCode, s._projectName].filter(Boolean).join(" — ") ||
          tr("No project linked"),
        _serviceLabel:
          s._serviceName ||
          (s.serviceId ? tr("Service #{0}", { 0: s.serviceId }) : tr("No service assigned")),
      })),
    ];
    const map = {};
    allRows.forEach((r) => {
      if (!map[r._projectKey])
        map[r._projectKey] = { label: r._projectLabel, services: {} };
      if (!map[r._projectKey].services[r._serviceKey]) {
        const svcIdx = Object.keys(map[r._projectKey].services).length;
        map[r._projectKey].services[r._serviceKey] = {
          label: r._serviceLabel,
          colorCfg: SERVICE_COLORS[svcIdx % SERVICE_COLORS.length],
          rows: [],
        };
      }
      map[r._projectKey].services[r._serviceKey].rows.push(r);
    });
    return Object.entries(map).sort((a, b) => {
      const pA = projects.find((p) => String(p.id) === String(a[0]));
      const pB = projects.find((p) => String(p.id) === String(b[0]));
      return new Date(pB?.createdAt || 0) - new Date(pA?.createdAt || 0);
    });
  }, [fTask, fSub, projects]);

  const tableColumns = useMemo(() => {
    const base = buildTableColumns(
      myLawyer,
      (item, type) => setDetail({ item, type }),
      lawyerMap,
    );
    if (!isAdminView) return base;
    // Insert assignee column after "Loại" column (index 1)
    const assigneeCol = {
      title: tr("Lawyer"),
      key: "assignee",
      width: 130,
      render: (_, r) => {
        const name = r._assigneeName;
        if (!name)
          return React.createElement(
            "span",
            { style: { color: "#d9d9d9", fontSize: 12 } },
            "—",
          );
        const lIdx = Object.values(lawyerMap).indexOf(name);
        const color = LAWYER_COLORS[Math.max(0, lIdx) % LAWYER_COLORS.length];
        return React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 5 } },
          React.createElement(Av, { name, color, size: 18 }),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: "#262626",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            },
            name,
          ),
        );
      },
    };
    return [base[0], assigneeCol, ...base.slice(1)];
  }, [isAdminView, myLawyer, lawyerMap]);

  const tDone =
    myTasks.filter((t) => t.status === "done").length +
    mySubs.filter((s) => s.status === "done").length;
  const total = myTasks.length + mySubs.length;
  const pct = total > 0 ? Math.round((tDone / total) * 100) : 0;
  const overdue = [...myTasks, ...mySubs].filter((i) => i._od).length;
  const todayDue = [...myTasks, ...mySubs].filter((i) => i._today).length;

  const lt = myLawyer
    ? LAWYER_TYPE_CFG[myLawyer.lawyerType] || {
        label: myLawyer.lawyerType || tr("Admin"),
        color: "#531dab",
        bg: "#f9f0ff",
      }
    : { label: tr("Unknown"), color: "#8c8c8c", bg: "#f5f5f5" };

  const bS = (active) => ({
    fontSize: 12,
    padding: "5px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: FONT,
    userSelect: "none",
    fontWeight: active ? 600 : 400,
    background: active ? "#1890ff" : "#fff",
    color: active ? "#fff" : "#595959",
    border: `1px solid ${active ? "#1890ff" : "#e8e8e8"}`,
    transition: "all 0.15s",
  });

  const skeletonColumns = buildTableColumns(null, () => {}, {});
  return React.createElement(
    "div",
    {
      style: {
        fontFamily: FONT,
        background: "#f5f5f5",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      },
    },

    // ── Toolbar ──
    React.createElement(
      "div",
      {
        style: {
          background: "#fff",
          borderBottom: "1px solid #e8e8e8",
          padding: "16px 24px",
          flexShrink: 0,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          },
        },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 12 } },
          React.createElement(Av, {
            name: myLawyer?.lawyerName || "—",
            color: lt.color,
            size: 40,
          }),
          React.createElement(
            "div",
            null,
            React.createElement(
              Text,
              {
                strong: true,
                style: {
                  fontSize: 18,
                  fontFamily: FONT,
                  color: "#1a1a1a",
                  display: "block",
                },
              },
              loading
                ? "..."
                : myLawyer?.lawyerName || tr("No lawyer profile linked"),
            ),
          ),
        ),
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 8 } },
          React.createElement(
            "div",
            {
              onClick: reload,
              style: {
                padding: "6px 14px",
                borderRadius: 4,
                border: "1px solid #e8e8e8",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: FONT,
                color: "#595959",
              },
            },
            tr("↻ Refresh"),
          ),
        ),
      ),

      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 14,
          },
        },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 8 } },
          React.createElement(
            "div",
            {
              style: {
                width: 140,
                height: 6,
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
            loading ? tr("Loading...") : tr("{0}/{1} done ({2}%)", { 0: tDone, 1: total, 2: pct }),
          ),
        ),
        todayDue > 0 &&
          React.createElement(
            "span",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: "#d46b08",
                background: "#fff7e6",
                padding: "2px 10px",
                borderRadius: 8,
                border: "1px solid #ffd591",
              },
            },
            tr("📅 {0} due today", { 0: todayDue }),
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
                padding: "2px 10px",
                borderRadius: 8,
                border: "1px solid #ffa39e",
              },
            },
            tr("⚠ {0} overdue", { 0: overdue }),
          ),
      ),

      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          },
        },
        React.createElement("input", {
          value: search,
          onChange: (e) => setSearch(e.target.value),
          placeholder: tr("🔍 Search task name..."),
          style: {
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #e8e8e8",
            fontSize: 12,
            fontFamily: FONT,
            outline: "none",
            minWidth: 220,
          },
          onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
          onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
        }),
        React.createElement(Select, {
          value: caseFilter,
          onChange: setCaseFilter,
          style: { width: 240, fontFamily: FONT },
          options: [
            { value: "all", label: tr("📁 All cases") },
            ...projects.map((p) => ({
              value: String(p.id),
              label: `📁 ${p.caseCode || "N/A"} - ${p.projectName || tr("Untitled")}`,
            })),
          ],
        }),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
          [
            ["all", tr("All")],
            ["toDo", tr("To do")],
            ["inProgress", tr("In progress")],
            ["blocked", tr("Blocked")],
            ["pending", tr("Pending approval")],
            ["done", tr("Done")],
            ["cancelled", tr("Cancelled")],
          ].map(([k, label]) =>
            React.createElement(
              "div",
              {
                key: k,
                onClick: () => setStFilter(k),
                style: bS(stFilter === k),
              },
              label,
            ),
          ),
        ),
      ),
    ),
    // ── Content ──
    React.createElement(
      "div",
      { style: { flex: 1, padding: "16px 24px", overflowY: "auto" } },
      React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 16 } },
        loading &&
          React.createElement(
            "div",
            {
              style: {
                borderRadius: 10,
                border: "1px solid #e8e8e8",
                overflow: "hidden",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              },
            },
            React.createElement(
              "div",
              {
                style: {
                  padding: "10px 16px",
                  background: "#1890ff",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                },
              },
              React.createElement("span", { style: { fontSize: 16 } }, "📁"),
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 14,
                    fontFamily: FONT,
                    fontWeight: 700,
                    color: "#fff",
                    flex: 1,
                  },
                },
                tr("Loading data..."),
              ),
            ),
            React.createElement(
              "div",
              {
                style: {
                  background: "#fff",
                  padding: "8px 16px",
                  borderBottom: "1px solid #e6f4ff",
                },
              },
              React.createElement(
                "div",
                { style: { display: "flex", alignItems: "center", gap: 8 } },
                React.createElement("div", {
                  style: {
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#1890ff",
                  },
                }),
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
                  tr("Loading..."),
                ),
                React.createElement(Spin, { size: "small" }),
              ),
            ),
            React.createElement(Table, {
              rowKey: (_, i) => i,
              dataSource: [],
              columns: skeletonColumns,
              size: "small",
              pagination: false,
              scroll: { x: 1700 },
              locale: {
                emptyText: React.createElement(
                  "div",
                  {
                    style: {
                      padding: "32px 0",
                      textAlign: "center",
                      color: "#bfbfbf",
                      fontFamily: FONT,
                    },
                  },
                  React.createElement(Spin, { size: "default" }),
                  React.createElement(
                    "div",
                    { style: { marginTop: 10, fontSize: 13 } },
                    tr("Loading data..."),
                  ),
                ),
              },
              style: { fontFamily: FONT },
            }),
          ),

        // ── Normal content after loading ──
        !loading && fTask.length === 0 && fSub.length === 0
          ? React.createElement(
              "div",
              {
                style: {
                  textAlign: "center",
                  padding: "80px 0",
                  fontFamily: FONT,
                },
              },
              React.createElement(
                "div",
                { style: { fontSize: 48, marginBottom: 16 } },
                "📭",
              ),
              React.createElement(
                Text,
                {
                  style: {
                    fontSize: 15,
                    fontFamily: FONT,
                    color: "#bfbfbf",
                    display: "block",
                  },
                },
                search || stFilter !== "all"
                  ? tr("No results found")
                  : tr("No tasks assigned yet."),
              ),
            )
          : !loading &&
              React.createElement(
                React.Fragment,
                null,
                grouped.slice(0, visibleCases).map(([projectKey, projectGroup]) =>
                React.createElement(
                  "div",
                  {
                    key: projectKey,
                    style: {
                      borderRadius: 10,
                      border: "1px solid #e8e8e8",
                      overflow: "hidden",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    },
                  },
                  React.createElement(
                    "div",
                    {
                      style: {
                        padding: "10px 16px",
                        background: "#1890ff",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      },
                    },
                    React.createElement(
                      "span",
                      { style: { fontSize: 16 } },
                      "📁",
                    ),
                    React.createElement(
                      "span",
                      {
                        style: {
                          fontSize: 14,
                          fontFamily: FONT,
                          fontWeight: 700,
                          color: "#fff",
                          flex: 1,
                        },
                      },
                      projectGroup.label,
                    ),
                    React.createElement(
                      "span",
                      {
                        style: {
                          fontSize: 11,
                          fontFamily: FONT,
                          color: "#e6f4ff",
                          background: "rgba(255,255,255,0.2)",
                          borderRadius: 10,
                          padding: "2px 10px",
                        },
                      },
                      tr("{0} items", { 0: Object.values(projectGroup.services).reduce((s, g) => s + g.rows.length, 0) }),
                    ),
                  ),
                  React.createElement(
                    "div",
                    { style: { background: "#fff" } },
                    ...Object.entries(projectGroup.services).map(
                      ([serviceKey, serviceGroup], svcIdx) =>
                        React.createElement(
                          "div",
                          { key: serviceKey },
                          React.createElement(
                            "div",
                            {
                              style: {
                                padding: "8px 16px",
                                background: serviceGroup.colorCfg.bg,
                                borderTop:
                                  svcIdx > 0
                                    ? `1px solid ${serviceGroup.colorCfg.border}`
                                    : "none",
                                borderBottom: `1px solid ${serviceGroup.colorCfg.border}`,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              },
                            },
                            React.createElement("div", {
                              style: {
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: serviceGroup.colorCfg.dot,
                                flexShrink: 0,
                              },
                            }),
                            React.createElement(
                              "span",
                              {
                                style: {
                                  fontSize: 12,
                                  fontFamily: FONT,
                                  fontWeight: 700,
                                  color: serviceGroup.colorCfg.text,
                                  flex: 1,
                                },
                              },
                              serviceGroup.label,
                            ),
                            serviceGroup.rows.some((r) => r._od) &&
                              React.createElement(
                                "span",
                                {
                                  style: {
                                    fontSize: 11,
                                    fontFamily: FONT,
                                    fontWeight: 600,
                                    color: "#cf1322",
                                    background: "#fff1f0",
                                    border: "1px solid #ffa39e",
                                    borderRadius: 10,
                                    padding: "1px 8px",
                                  },
                                },
                                tr("⚠ {0} overdue", { 0: serviceGroup.rows.filter((r) => r._od).length }),
                              ),
                            serviceGroup.rows.some((r) => r._today && !r._od) &&
                              React.createElement(
                                "span",
                                {
                                  style: {
                                    fontSize: 11,
                                    fontFamily: FONT,
                                    fontWeight: 600,
                                    color: "#d46b08",
                                    background: "#fff7e6",
                                    border: "1px solid #ffd591",
                                    borderRadius: 10,
                                    padding: "1px 8px",
                                  },
                                },
                                tr("📅 {0} today", { 0: serviceGroup.rows.filter((r) => r._today && !r._od).length }),
                              ),
                            React.createElement(
                              "span",
                              {
                                style: {
                                  fontSize: 11,
                                  fontFamily: FONT,
                                  color: serviceGroup.colorCfg.text,
                                  background: "rgba(0,0,0,0.06)",
                                  borderRadius: 10,
                                  padding: "1px 8px",
                                },
                              },
                              tr("{0} items", { 0: serviceGroup.rows.length }),
                            ),
                          ),
                          React.createElement(Table, {
                            rowKey: (r) => `${r._type}-${r.id}`,
                            dataSource: serviceGroup.rows,
                            columns: tableColumns,
                            size: "small",
                            pagination: { 
                              pageSize: 10, 
                              showSizeChanger: true, 
                              pageSizeOptions: ["10", "20", "50", "100"],
                              showTotal: (total) => tr("{0} items in total", { 0: total }) 
                            },
                            scroll: { x: 1700 },
                            onRow: (r) => ({
                              onClick: () => setDetail({ item: r, type: r._type }),
                              style: { cursor: "pointer" },
                            }),
                            rowClassName: (r) =>
                              (
                                r._type === "subtask"
                                  ? isOD(r.deadline, r.status)
                                  : isOD(r.dueDate, r.status)
                              )
                                ? "row-overdue"
                                : "",
                            style: { fontFamily: FONT },
                          }),
                        ),
                  ),
                ),
              ),
            ),
          grouped.length > 5 &&
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  justifyContent: "center",
                  marginTop: 20,
                  gap: 12,
                  paddingBottom: 16
                },
              },
              visibleCases < grouped.length &&
                React.createElement(
                  Button,
                  {
                    type: "primary",
                    onClick: () => setVisibleCases((prev) => prev + 5),
                    style: { fontFamily: FONT },
                  },
                  tr("Show 5 more cases ⬇")
                ),
              visibleCases > 5 &&
                React.createElement(
                  Button,
                  {
                    onClick: () => setVisibleCases(5),
                    style: { fontFamily: FONT },
                  },
                  tr("Show less ⬆")
                )
            )
        ),
    ),
),

    detail &&
      React.createElement(DetailModal, {
        item: detail.item,
        type: detail.type,
        lawyers,
        services,
        allTasksInProject: allTasks.filter(t => String(t.projectId) === String(detail.item.projectId)),
        currentUser,
        myLawyer,
        isManager: isAdminView,
        onClose: () => setDetail(null),
        onUpdate: upd,
        isAssignedToThis: String(detail.item.lawyerId) === String(myLawyer?.id),
        projectFolderId: detail.item._projectFolderId || null,
      }),

    React.createElement(
      "style",
      null,
      `
      .row-overdue td { background: #fff1f0 !important; }
      .row-overdue:hover td { background: #ffe9e9 !important; }
      .ant-table-small .ant-table-thead > tr > th {
        background: #fafafa !important;
        font-family: ${FONT};
        font-size: 12px;
        font-weight: 700;
        color: #8c8c8c;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .ant-table-small .ant-table-tbody > tr > td {
        font-family: ${FONT};
        vertical-align: middle;
      }
      .ant-table-small .ant-table-tbody > tr:hover > td {
        background: #f0f7ff !important;
      }
    `,
    ),
  );
};

ctx.render(React.createElement(MyTaskTab, null));
