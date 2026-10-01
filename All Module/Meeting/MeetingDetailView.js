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
  "Scheduled": "Đã lên lịch",
  "Ongoing": "Đang diễn ra",
  "Completed": "Đã hoàn tất",
  "Cancelled": "Đã hủy",
  "Internal": "Nội bộ",
  "Case review": "Rà soát hồ sơ",
  "Strategy": "Chiến lược",
  "Training": "Đào tạo",
  "Other": "Khác",
  "Pending": "Chờ gửi",
  "Confirmed": "Đã xác nhận",
  "Absent": "Vắng mặt",
  "Excused": "Vắng có phép",
  "User #{0}": "Người dùng #{0}",
  "Unassigned": "Chưa phân công",
  "Case #{0}": "Hồ sơ #{0}",
  "Task #{0}": "Công việc #{0}",
  "Contract #{0}": "Hợp đồng #{0}",
  "Quotation #{0}": "Báo giá #{0}",
  "Customer #{0}": "Khách hàng #{0}",
  "Only the meeting host can edit this meeting.": "Chỉ người chủ trì mới sửa được cuộc họp này.",
  "Meeting is missing.": "Không có cuộc họp.",
  "Host is required.": "Bắt buộc có người chủ trì.",
  "Meeting time is invalid.": "Thời gian họp không hợp lệ.",
  "End time must be after start time.": "Giờ kết thúc phải sau giờ bắt đầu.",
  "Meeting updated.": "Đã cập nhật cuộc họp.",
  "Could not update meeting.": "Không thể cập nhật cuộc họp.",
  "Edit meeting": "Sửa cuộc họp",
  "Save": "Lưu",
  "Title": "Tiêu đề",
  "Title is required.": "Bắt buộc có tiêu đề.",
  "Meeting title": "Tiêu đề cuộc họp",
  "Host": "Chủ trì",
  "Select host": "Chọn người chủ trì",
  "Start time": "Giờ bắt đầu",
  "Start time is required.": "Bắt buộc có giờ bắt đầu.",
  "End time": "Giờ kết thúc",
  "End time is required.": "Bắt buộc có giờ kết thúc.",
  "Case": "Hồ sơ",
  "Select case": "Chọn hồ sơ",
  "Status": "Trạng thái",
  "Type": "Loại",
  "Location": "Địa điểm",
  "Room, address or meeting link": "Phòng, địa chỉ hoặc link họp",
  "Agenda / Description": "Chương trình / Mô tả",
  "Write meeting agenda or notes...": "Viết chương trình họp hoặc ghi chú...",
  "Could not load meeting detail.": "Không thể tải chi tiết cuộc họp.",
  "Only the meeting host can add attendees.": "Chỉ người chủ trì mới thêm được người tham dự.",
  "Selected users are already attendees.": "Người đã chọn đã là người tham dự.",
  "Attendees added.": "Đã thêm người tham dự.",
  "Could not add attendees.": "Không thể thêm người tham dự.",
  "You can only update your own attendance status.": "Bạn chỉ cập nhật được trạng thái tham dự của mình.",
  "Attendee updated.": "Đã cập nhật người tham dự.",
  "Could not update attendee.": "Không thể cập nhật người tham dự.",
  "Only the meeting host can remove attendees.": "Chỉ người chủ trì mới gỡ được người tham dự.",
  "Edit host before removing the host attendee.": "Hãy đổi người chủ trì trước khi gỡ người chủ trì khỏi danh sách tham dự.",
  "Attendee removed.": "Đã gỡ người tham dự.",
  "Could not remove attendee.": "Không thể gỡ người tham dự.",
  "Meeting id was not provided.": "Chưa có ID cuộc họp.",
  "Meeting was not found.": "Không tìm thấy cuộc họp.",
  "Task": "Công việc",
  "Contract": "Hợp đồng",
  "Quotation": "Báo giá",
  "User": "Người dùng",
  "Attendance": "Tham dự",
  "Content": "Nội dung",
  "Remove attendee?": "Gỡ người tham dự?",
  "Remove": "Gỡ",
  "Cancel": "Hủy",
  "Delete": "Xóa",
  "Date": "Ngày",
  "Time": "Thời gian",
  "Customer": "Khách hàng",
  "No agenda yet.": "Chưa có chương trình họp.",
  "Meeting": "Cuộc họp",
  "Refresh": "Làm mới",
  "Overview": "Tổng quan",
  "Attendees ({0})": "Người tham dự ({0})",
  "Add attendees": "Thêm người tham dự",
  "Add": "Thêm",
};
// ---- end ui language ----
const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);

const { React } = ctx;
const { useCallback, useEffect, useMemo, useState } = React;
const {
  Avatar,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
  theme,
} = ctx.antd;

const { Text, Title, Link } = Typography;
const { TextArea } = Input;

const LOOKUP_FETCH_LIMIT = 1000;
const MEETING_CHANGED_EVENT = "law-meeting:changed";

const MEETING_FIELDS =
  "id,title,meetingDate,startTime,endTime,location,status,type,description,hostId,caseId,createdAt,updatedAt";
const ATTENDEE_FIELDS =
  "id,userId,meetingId,attendanceStatus,isHost,content,createdAt,updatedAt";
const MEETING_TASK_FIELDS =
  "id,taskId,meetingId,addedAt,createdAt,updatedAt";
const USER_FIELDS = "id,nickname,username,email";
const PROJECT_FIELDS = "id,caseCode,projectName,customerId,createdAt";
const CUSTOMER_FIELDS = "id,customerName,shortName";
const TASK_FIELDS = "id,title,status,projectId,createdAt";

const FALLBACK_TOKEN = {
  colorBgContainer: "#fff",
  colorFillAlter: "#fafafa",
  colorTextSecondary: "#8c8c8c",
  colorBorder: "#d9d9d9",
  colorSplit: "#f0f0f0",
  colorPrimary: "#1677ff",
  borderRadius: 6,
  paddingXS: 8,
  paddingSM: 12,
  padding: 16,
  marginXS: 8,
  marginSM: 12,
  margin: 16,
  fontSizeSM: 12,
};

const STATUS_CFG = {
  scheduled: { label: tr("Scheduled"), color: "processing" },
  ongoing: { label: tr("Ongoing"), color: "warning" },
  completed: { label: tr("Completed"), color: "success" },
  cancelled: { label: tr("Cancelled"), color: "default" },
  canceled: { label: tr("Cancelled"), color: "default" },
};

const TYPE_CFG = {
  internal: { label: tr("Internal"), color: "blue" },
  case_review: { label: tr("Case review"), color: "purple" },
  strategy: { label: tr("Strategy"), color: "cyan" },
  training: { label: tr("Training"), color: "green" },
  other: { label: tr("Other"), color: "default" },
};

const ATTENDANCE_CFG = {
  pending: { label: tr("Pending"), color: "default" },
  confirmed: { label: tr("Confirmed"), color: "success" },
  absent: { label: tr("Absent"), color: "error" },
  excused: { label: tr("Excused"), color: "warning" },
};

const STATUS_OPTIONS = Object.entries(STATUS_CFG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

const TYPE_OPTIONS = Object.entries(TYPE_CFG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

const ATTENDANCE_OPTIONS = Object.entries(ATTENDANCE_CFG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

const useNocoToken = () => {
  const result =
    theme && typeof theme.useToken === "function" ? theme.useToken() : null;
  return result?.token || FALLBACK_TOKEN;
};

const extractId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.length ? extractId(value[0]) : null;
  const raw = value && typeof value === "object" ? value.id || value._id : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const compact = (items) =>
  (items || [])
    .map((item) =>
      item === undefined || item === null ? "" : String(item).trim(),
    )
    .filter(Boolean);

const uniqueIds = (items) =>
  Array.from(new Set((items || []).map(extractId).filter(Boolean)));

const unwrapList = (res) => {
  const data = res?.data?.data ?? res?.data ?? [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
};

const unwrapRecord = (res) => res?.data?.data || res?.data || res || null;

const getResponseRecord = (res) => {
  const data = res?.data?.data ?? res?.data ?? res;
  if (Array.isArray(data)) return data[0] || null;
  if (Array.isArray(data?.data)) return data.data[0] || null;
  return data && typeof data === "object" ? data : null;
};

const getCurrentUserFromCtx = () => {
  try {
    return (
      ctx.currentUser ||
      ctx.state?.currentUser ||
      ctx.user ||
      ctx.auth?.user ||
      ctx.app?.currentUser ||
      ctx.store?.getState?.()?.currentUser ||
      null
    );
  } catch {
    return null;
  }
};

const stripHtml = (value) =>
  String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const isUrl = (value) => {
  if (!value) return false;
  try {
    const u = new URL(String(value).trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

const isValidDate = (value) =>
  value instanceof Date && !Number.isNaN(value.getTime());

const parseDateText = (value) => {
  const text = String(value || "").trim();
  if (!text || text === "Invalid date") return null;

  const localMatch = text.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (localMatch) {
    const [, year, month, day, hour = "0", minute = "0", second = "0"] =
      localMatch;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
    return isValidDate(date) ? date : null;
  }

  const viMatch = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (viMatch) {
    const [, day, month, year, hour = "0", minute = "0", second = "0"] =
      viMatch;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
    return isValidDate(date) ? date : null;
  }

  const date = new Date(text);
  return isValidDate(date) ? date : null;
};

const toNativeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isValidDate(value) ? value : null;
  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return isValidDate(date) ? date : null;
  }
  if (value.$d) return isValidDate(value.$d) ? value.$d : null;
  if (typeof value === "string") return parseDateText(value);
  const date = new Date(value);
  return isValidDate(date) ? date : null;
};

const pad2 = (value) => String(value).padStart(2, "0");

const toDateTimeString = (value) => {
  const date = toNativeDate(value);
  if (!date) return null;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
};

const toApiDateTimeValue = (value) => {
  const date = toNativeDate(value);
  if (!date) return null;
  return date.toISOString();
};

const formatDate = (value, mode = "date") => {
  const date = toNativeDate(value);
  if (!date) return "-";
  if (mode === "datetime") {
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "-";
  if (typeof value === "string") {
    const match = value.match(/(\d{1,2}):(\d{2})/);
    if (match) return `${pad2(match[1])}:${match[2]}`;
  }
  const date = toNativeDate(value);
  if (!date) return String(value);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

const toTimeString = (value) => {
  if (typeof value === "string") {
    const match = value.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (match) return `${pad2(match[1])}:${match[2]}:${pad2(match[3] || 0)}`;
  }
  const date = toNativeDate(value);
  if (!date) return null;
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
};

const formatTimeRange = (start, end) =>
  end ? `${formatTime(start)} - ${formatTime(end)}` : formatTime(start);

const tagByConfig = (cfgMap, value, fallback) => {
  const key = String(value || fallback || "").trim();
  const cfg = cfgMap[key] || { label: key || "-", color: "default" };
  return React.createElement(Tag, { color: cfg.color, style: { marginInlineEnd: 0 } }, cfg.label);
};

const statusTag = (value) => tagByConfig(STATUS_CFG, value, "scheduled");
const typeTag = (value) => tagByConfig(TYPE_CFG, value, "internal");
const attendanceTag = (value) => tagByConfig(ATTENDANCE_CFG, value, "pending");

const userLabel = (record) =>
  record?.nickname ||
  record?.displayName ||
  record?.username ||
  record?.name ||
  record?.email ||
  (record?.id ? tr("User #{0}", { 0: record.id }) : tr("Unassigned"));

const userInitial = (record) => {
  const label = userLabel(record);
  return label && label !== tr("Unassigned") ? label.charAt(0).toUpperCase() : "?";
};

const isSelectableUser = (record) => extractId(record?.id) !== 1;

const caseLabel = (record) =>
  compact([
    record?.caseCode || record?.projectCode || record?.code,
    record?.projectName || record?.caseName || record?.title || record?.name,
  ]).join(" - ") || (record?.id ? tr("Case #{0}", { 0: record.id }) : "-");

const taskLabel = (record) =>
  record?.title ||
  record?.taskName ||
  record?.name ||
  (record?.id ? tr("Task #{0}", { 0: record.id }) : "");

const contractLabel = (record) =>
  compact([
    record?.contractCode || record?.contractNumber || record?.code,
    record?.contractName || record?.name || record?.title,
  ]).join(" - ") || (record?.id ? tr("Contract #{0}", { 0: record.id }) : "");

const quotationLabel = (record) =>
  compact([
    record?.quotationNumber || record?.quotationCode || record?.code,
    record?.quotationName || record?.name || record?.title,
  ]).join(" - ") || (record?.id ? tr("Quotation #{0}", { 0: record.id }) : "");

const customerLabel = (record) =>
  record?.customerName ||
  record?.shortName ||
  record?.name ||
  record?.fullName ||
  record?.companyName ||
  (record?.id ? tr("Customer #{0}", { 0: record.id }) : "");

const caseCustomerLabel = (record, customerMap = {}) => {
  const directCustomer = record?.customer || record?.customers;
  if (directCustomer && typeof directCustomer === "object") {
    const directLabel = customerLabel(directCustomer);
    if (directLabel) return directLabel;
  }
  const customerId = extractId(record?.customerId) || extractId(directCustomer);
  return customerLabel(customerMap[customerId]);
};

const relatedCustomerId = (record) =>
  extractId(record?.customerId || record?.customer || record?.customers);

const collectIds = (...values) => {
  const flattened = [];
  values.forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => flattened.push(item));
    } else {
      flattened.push(value);
    }
  });
  return uniqueIds(flattened);
};

const joinLabels = (items, getLabel) =>
  compact((items || []).map((item) => getLabel(item))).join(", ");

const caseOption = (record, customerMap = {}) => {
  const primary = caseLabel(record);
  const customer = caseCustomerLabel(record, customerMap);
  return {
    value: String(extractId(record?.id)),
    searchText: compact([primary, customer]).join(" "),
    label: React.createElement(
      "div",
      { style: { display: "grid", gap: 2, minWidth: 0 } },
      React.createElement(
        "span",
        {
          style: {
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        },
        primary,
      ),
      customer
        ? React.createElement(
            "span",
            {
              style: {
                color: FALLBACK_TOKEN.colorTextSecondary,
                fontSize: FALLBACK_TOKEN.fontSizeSM,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            },
            customer,
          )
        : null,
    ),
  };
};

const toDatetimeLocalValue = (dateValue, timeValue) => {
  const date = toNativeDate(dateValue);
  if (!date) return "";
  const timeMatch = String(timeValue || "").match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const hour = timeMatch ? Number(timeMatch[1]) : date.getHours();
  const minute = timeMatch ? Number(timeMatch[2]) : date.getMinutes();
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(hour)}:${pad2(minute)}`;
};

const toDateInputValue = (value) => {
  const date = toNativeDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const buildMapById = (items) => {
  const map = {};
  (items || []).forEach((item) => {
    const id = extractId(item?.id);
    if (id) map[id] = item;
  });
  return map;
};

const getRuntimeInput = () => {
  try {
    const inputArgs = ctx.view?.inputArgs || ctx.inputArgs || {};
    return {
      ...(inputArgs || {}),
      ...(inputArgs.params || {}),
      ...(ctx.action?.params || {}),
      ...(ctx.modal?.params || {}),
      ...(ctx.view?.params || {}),
      ...(ctx.popup?.params || {}),
      ...(ctx.router?.params || {}),
      ...(ctx.params || {}),
      ...(ctx.record || {}),
    };
  } catch {
    return {};
  }
};

const resolveMeetingId = () => {
  const input = getRuntimeInput();
  return extractId(
    input.meetingId ||
      input.recordId ||
      input.sourceRecordId ||
      input.filterByTk ||
      input.filterbytk ||
      input.id ||
      ctx.record?.id,
  );
};

const safeFetchList = async (url, params = {}, pageSize = LOOKUP_FETCH_LIMIT) => {
  try {
    const res = await ctx.api.request({
      url,
      method: "GET",
      params: { page: 1, pageSize, ...params },
    });
    return unwrapList(res);
  } catch (error) {
    console.warn(`[MeetingDetailView] ${url} failed`, error);
    return [];
  }
};

const fetchCurrentUser = async () => {
  try {
    const existing = getCurrentUserFromCtx();
    if (existing) return getResponseRecord(existing) || existing;
    const res = await ctx.api.request({ url: "auth:check", method: "GET" });
    return getResponseRecord(res);
  } catch (error) {
    console.warn("[MeetingDetailView] auth:check failed", error);
    return null;
  }
};

const fetchRowsByIds = async (url, ids, fields) => {
  const safeIds = uniqueIds(ids);
  if (!safeIds.length) return [];
  const params = {
    filter: JSON.stringify({ id: { $in: safeIds } }),
    sort: ["id"],
  };
  if (fields) params.fields = fields;
  return safeFetchList(url, params, Math.max(safeIds.length, 50));
};

const emitMeetingChanged = (payload = {}) => {
  const detail = { ...payload, changedAt: Date.now() };
  try {
    ctx.eventBus?.emit?.(MEETING_CHANGED_EVENT, detail);
  } catch {}
  try {
    ctx.view?.emit?.(MEETING_CHANGED_EVENT, detail);
  } catch {}
};

const InfoBox = ({ label, value, href }) => {
  const token = useNocoToken();
  const valueNode = href
    ? React.createElement(
        Link,
        {
          href,
          target: "_blank",
          rel: "noopener noreferrer",
          style: {
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textDecoration: "underline",
          },
        },
        value || href,
      )
    : React.createElement(
        Text,
        {
          style: {
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        },
        value || "-",
      );
  return React.createElement(
    "div",
    {
      style: {
        border: `1px solid ${token.colorSplit}`,
        borderRadius: token.borderRadius,
        padding: token.paddingSM,
        background: token.colorBgContainer,
        minWidth: 0,
      },
    },
    React.createElement(
      Text,
      { type: "secondary", style: { display: "block", fontSize: token.fontSizeSM } },
      label,
    ),
    valueNode,
  );
};

const MeetingEditModal = ({
  open,
  meeting,
  users,
  cases,
  customersById,
  canEdit,
  onCancel,
  onSaved,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !meeting) return;
    form.setFieldsValue({
      title: meeting.title || "",
      hostId: meeting.hostId ? String(extractId(meeting.hostId)) : undefined,
      startDateTime: toDatetimeLocalValue(meeting.meetingDate, meeting.startTime),
      endDateTime: toDatetimeLocalValue(meeting.meetingDate, meeting.endTime),
      caseId: meeting.caseId ? String(extractId(meeting.caseId)) : undefined,
      status: meeting.status || "scheduled",
      type: meeting.type || "internal",
      location: meeting.location || "",
      description: stripHtml(meeting.description) || "",
    });
  }, [form, meeting, open]);

  const userOptions = users.filter(isSelectableUser).map((user) => ({
    value: String(extractId(user.id)),
    label: userLabel(user),
  }));

  const caseOptions = cases.map((item) => caseOption(item, customersById));

  const handleSubmit = async () => {
    if (!canEdit) {
      message.warning(tr("Only the meeting host can edit this meeting."));
      return;
    }
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const meetingId = extractId(meeting?.id);
    const hostId = extractId(values.hostId);
    const startAt = toNativeDate(values.startDateTime);
    const endAt = toNativeDate(values.endDateTime);

    if (!meetingId) {
      message.error(tr("Meeting is missing."));
      return;
    }
    if (!hostId) {
      message.error(tr("Host is required."));
      return;
    }
    if (!startAt || !endAt) {
      message.error(tr("Meeting time is invalid."));
      return;
    }
    if (endAt < startAt) {
      message.error(tr("End time must be after start time."));
      return;
    }

    setSubmitting(true);
    try {
      await ctx.api.request({
        url: `meetings:update?filterByTk=${meetingId}`,
        method: "POST",
        data: {
          title: String(values.title || "").trim(),
          meetingDate: toDateTimeString(startAt),
          startTime: toTimeString(startAt),
          endTime: toTimeString(endAt),
          location: String(values.location || "").trim() || null,
          status: values.status || "scheduled",
          type: values.type || "internal",
          description: String(values.description || "").trim() || null,
          hostId,
          caseId: extractId(values.caseId),
        },
      });

      const attendeeRows = meeting._attendees || [];
      const oldHostRows = attendeeRows.filter(
        (row) => row.isHost && extractId(row.userId) !== hostId,
      );
      for (const row of oldHostRows) {
        const rowId = extractId(row.id);
        if (!rowId) continue;
        await ctx.api.request({
          url: `meetingAttendees:update?filterByTk=${rowId}`,
          method: "POST",
          data: { isHost: false },
        });
      }

      const nextHostRow = attendeeRows.find(
        (row) => extractId(row.userId) === hostId,
      );
      if (nextHostRow) {
        await ctx.api.request({
          url: `meetingAttendees:update?filterByTk=${extractId(nextHostRow.id)}`,
          method: "POST",
          data: { isHost: true, attendanceStatus: "confirmed" },
        });
      } else {
        await ctx.api.request({
          url: "meetingAttendees:create",
          method: "POST",
          data: {
            meetingId,
            userId: hostId,
            isHost: true,
            attendanceStatus: "confirmed",
          },
        });
      }

      message.success(tr("Meeting updated."));
      emitMeetingChanged({ action: "updated", meetingId });
      onSaved?.();
    } catch (error) {
      console.error("[MeetingDetailView] update meeting failed", error);
      message.error(error?.message || tr("Could not update meeting."));
    } finally {
      setSubmitting(false);
    }
  };

  return React.createElement(
    Modal,
    {
      open,
      title: tr("Edit meeting"),
      onCancel,
      onOk: handleSubmit,
      okText: tr("Save"),
      okButtonProps: { disabled: !canEdit },
      confirmLoading: submitting,
      destroyOnClose: true,
      width: 820,
    },
    React.createElement(
      Form,
      { form, layout: "vertical", requiredMark: false },
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          },
        },
        React.createElement(
          Form.Item,
          {
            name: "title",
            label: tr("Title"),
            rules: [{ required: true, message: tr("Title is required.") }],
          },
          React.createElement(Input, { placeholder: tr("Meeting title") }),
        ),
        React.createElement(
          Form.Item,
          {
            name: "hostId",
            label: tr("Host"),
            rules: [{ required: true, message: tr("Host is required.") }],
          },
          React.createElement(Select, {
            showSearch: true,
            optionFilterProp: "label",
            options: userOptions,
            placeholder: tr("Select host"),
          }),
        ),
        React.createElement(
          "div",
          {
            style: {
              gridColumn: "1 / -1",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
            },
          },
          React.createElement(
            Form.Item,
            {
              name: "startDateTime",
              label: tr("Start time"),
              rules: [{ required: true, message: tr("Start time is required.") }],
            },
            React.createElement(Input, { type: "datetime-local", step: 300 }),
          ),
          React.createElement(
            Form.Item,
            {
              name: "endDateTime",
              label: tr("End time"),
              rules: [{ required: true, message: tr("End time is required.") }],
            },
            React.createElement(Input, { type: "datetime-local", step: 300 }),
          ),
        ),
        React.createElement(
          Form.Item,
          { name: "caseId", label: tr("Case") },
          React.createElement(Select, {
            allowClear: true,
            showSearch: true,
            optionFilterProp: "searchText",
            options: caseOptions,
            placeholder: tr("Select case"),
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "status", label: tr("Status"), initialValue: "scheduled" },
          React.createElement(Select, { options: STATUS_OPTIONS }),
        ),
        React.createElement(
          Form.Item,
          { name: "type", label: tr("Type"), initialValue: "internal" },
          React.createElement(Select, { options: TYPE_OPTIONS }),
        ),
        React.createElement(
          Form.Item,
          { name: "location", label: tr("Location") },
          React.createElement(Input, { placeholder: tr("Room, address or meeting link") }),
        ),
        React.createElement(
          Form.Item,
          {
            name: "description",
            label: tr("Agenda / Description"),
            style: { gridColumn: "1 / -1" },
          },
          React.createElement(TextArea, {
            rows: 4,
            placeholder: tr("Write meeting agenda or notes..."),
          }),
        ),
      ),
    ),
  );
};

const MeetingDetailView = () => {
  const token = useNocoToken();
  const meetingId = resolveMeetingId();
  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUserFromCtx());
  const [users, setUsers] = useState([]);
  const [cases, setCases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [attendeeUserIds, setAttendeeUserIds] = useState([]);
  const [savingAttendees, setSavingAttendees] = useState(false);
  const [updatingKey, setUpdatingKey] = useState(null);

  const usersById = useMemo(() => buildMapById(users), [users]);
  const casesById = useMemo(() => buildMapById(cases), [cases]);
  const customersById = useMemo(() => buildMapById(customers), [customers]);
  const selectableUsers = useMemo(() => users.filter(isSelectableUser), [users]);
  const currentUserId = useMemo(
    () => extractId(currentUser?.id || currentUser),
    [currentUser],
  );
  const isCurrentUserHost = useMemo(() => {
    if (!currentUserId || !meeting) return false;
    if (extractId(meeting.hostId) === currentUserId) return true;
    return (meeting._attendees || []).some(
      (row) => !!row?.isHost && extractId(row?.userId) === currentUserId,
    );
  }, [currentUserId, meeting]);
  const canUpdateAttendeeRow = useCallback(
    (row, patch = {}) => {
      if (!row || !currentUserId) return false;
      if (isCurrentUserHost) return true;
      const patchKeys = Object.keys(patch || {});
      const attendanceOnly =
        patchKeys.length === 1 && patchKeys[0] === "attendanceStatus";
      return attendanceOnly && extractId(row.userId) === currentUserId;
    },
    [currentUserId, isCurrentUserHost],
  );

  const reload = useCallback(async () => {
    if (!meetingId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const meetingRes = await ctx.api.request({
        url: `meetings:get?filterByTk=${meetingId}`,
        method: "GET",
      });
      const baseMeeting = unwrapRecord(meetingRes);
      if (!extractId(baseMeeting?.id)) {
        setMeeting(null);
        return;
      }

      const filter = JSON.stringify({ meetingId: { $eq: meetingId } });
      const [currentUserRecord, attendeeRows, meetingTaskRows, userRows, caseRows] = await Promise.all([
        fetchCurrentUser(),
        safeFetchList("meetingAttendees:list", {
          fields: ATTENDEE_FIELDS,
          filter,
          sort: ["isHost", "createdAt"],
        }),
        safeFetchList("meetingTasks:list", {
          fields: MEETING_TASK_FIELDS,
          filter,
          sort: ["createdAt"],
        }),
        safeFetchList("users:list", {
          fields: USER_FIELDS,
          sort: ["nickname", "username"],
        }),
        safeFetchList("projects:list", {
          fields: PROJECT_FIELDS,
          sort: ["-createdAt"],
        }),
      ]);
      const linkedTaskIds = collectIds(
        baseMeeting.taskId,
        baseMeeting.tasksId,
        baseMeeting.tasks,
        meetingTaskRows.map((row) => row.taskId),
      );
      const linkedContractIds = collectIds(
        baseMeeting.contractId,
        baseMeeting.contractsId,
        baseMeeting.contracts,
      );
      const linkedQuotationIds = collectIds(
        baseMeeting.quotationId,
        baseMeeting.quotationsId,
        baseMeeting.quotations,
      );
      const [taskRows, contractRows, quotationRows] = await Promise.all([
        fetchRowsByIds("tasks:list", linkedTaskIds, TASK_FIELDS),
        fetchRowsByIds("contracts:list", linkedContractIds),
        fetchRowsByIds("quotations:list", linkedQuotationIds),
      ]);
      const customerIds = uniqueIds(
        [
          ...caseRows.map((row) => row.customerId || row.customer || row.customers),
          ...contractRows.map((row) => row.customerId || row.customer || row.customers),
          ...quotationRows.map((row) => row.customerId || row.customer || row.customers),
        ],
      );
      const customerRows = await fetchRowsByIds(
        "customers:list",
        customerIds,
        CUSTOMER_FIELDS,
      );

      setCurrentUser(currentUserRecord || getCurrentUserFromCtx());
      setUsers(userRows);
      setCases(caseRows);
      setCustomers(customerRows);
      setMeeting({
        ...baseMeeting,
        _attendees: attendeeRows,
        _meetingTaskLinks: meetingTaskRows,
        _linkedTasks: taskRows,
        _linkedContracts: contractRows,
        _linkedQuotations: quotationRows,
      });
    } catch (error) {
      console.error("[MeetingDetailView] reload failed", error);
      message.error(error?.message || tr("Could not load meeting detail."));
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addAttendees = async () => {
    const selectedIds = uniqueIds(attendeeUserIds);
    const meetingSafeId = extractId(meeting?.id) || meetingId;
    if (!meetingSafeId || !selectedIds.length) return;
    if (!isCurrentUserHost) {
      message.warning(tr("Only the meeting host can add attendees."));
      return;
    }

    const existingIds = new Set(
      (meeting?._attendees || []).map((row) => extractId(row.userId)).filter(Boolean),
    );
    const nextIds = selectedIds.filter((id) => !existingIds.has(id));
    if (!nextIds.length) {
      message.info(tr("Selected users are already attendees."));
      return;
    }

    setSavingAttendees(true);
    try {
      for (const userId of nextIds) {
        await ctx.api.request({
          url: "meetingAttendees:create",
          method: "POST",
          data: {
            meetingId: meetingSafeId,
            userId,
            attendanceStatus: "pending",
            isHost: false,
          },
        });
      }
      setAttendeeUserIds([]);
      message.success(tr("Attendees added."));
      emitMeetingChanged({ action: "attendees_added", meetingId: meetingSafeId });
      reload();
    } catch (error) {
      console.error("[MeetingDetailView] add attendees failed", error);
      message.error(error?.message || tr("Could not add attendees."));
    } finally {
      setSavingAttendees(false);
    }
  };

  const updateAttendee = async (row, patch) => {
    const rowId = extractId(row?.id);
    if (!rowId) return;
    if (!canUpdateAttendeeRow(row, patch)) {
      message.warning(tr("You can only update your own attendance status."));
      return;
    }
    setUpdatingKey(`attendee:${rowId}`);
    try {
      await ctx.api.request({
        url: `meetingAttendees:update?filterByTk=${rowId}`,
        method: "POST",
        data: patch,
      });
      message.success(tr("Attendee updated."));
      emitMeetingChanged({ action: "attendee_updated", meetingId });
      reload();
    } catch (error) {
      console.error("[MeetingDetailView] update attendee failed", error);
      message.error(error?.message || tr("Could not update attendee."));
    } finally {
      setUpdatingKey(null);
    }
  };

  const deleteAttendee = async (row) => {
    const rowId = extractId(row?.id);
    if (!rowId) return;
    if (!isCurrentUserHost) {
      message.warning(tr("Only the meeting host can remove attendees."));
      return;
    }
    if (row?.isHost) {
      message.warning(tr("Edit host before removing the host attendee."));
      return;
    }
    setUpdatingKey(`attendee:${rowId}`);
    try {
      await ctx.api.request({
        url: `meetingAttendees:destroy?filterByTk=${rowId}`,
        method: "POST",
      });
      message.success(tr("Attendee removed."));
      emitMeetingChanged({ action: "attendee_removed", meetingId });
      reload();
    } catch (error) {
      console.error("[MeetingDetailView] delete attendee failed", error);
      message.error(error?.message || tr("Could not remove attendee."));
    } finally {
      setUpdatingKey(null);
    }
  };

  if (!meetingId) {
    return React.createElement(Empty, {
      image: Empty.PRESENTED_IMAGE_SIMPLE,
      description: tr("Meeting id was not provided."),
      style: { padding: 60 },
    });
  }

  if (loading && !meeting) {
    return React.createElement(
      "div",
      { style: { padding: 60, textAlign: "center" } },
      React.createElement(Spin, null),
    );
  }

  if (!meeting) {
    return React.createElement(Empty, {
      image: Empty.PRESENTED_IMAGE_SIMPLE,
      description: tr("Meeting was not found."),
      style: { padding: 60 },
    });
  }

  const host = usersById[extractId(meeting.hostId)];
  const caseRecord = casesById[extractId(meeting.caseId)];
  const customer = caseCustomerLabel(caseRecord, customersById);
  const attendees = meeting._attendees || [];
  const linkedTasks = meeting._linkedTasks?.length
    ? meeting._linkedTasks
    : Array.isArray(meeting.tasks)
      ? meeting.tasks
      : meeting.tasks
        ? [meeting.tasks]
        : [];
  const linkedContracts = meeting._linkedContracts?.length
    ? meeting._linkedContracts
    : Array.isArray(meeting.contracts)
      ? meeting.contracts
      : meeting.contracts
        ? [meeting.contracts]
        : [];
  const linkedQuotations = meeting._linkedQuotations?.length
    ? meeting._linkedQuotations
    : Array.isArray(meeting.quotations)
      ? meeting.quotations
      : meeting.quotations
        ? [meeting.quotations]
        : [];
  const relationInfoBoxes = [
    linkedTasks.length
      ? React.createElement(InfoBox, {
          key: "task",
          label: tr("Task"),
          value: joinLabels(linkedTasks, taskLabel) || "-",
        })
      : null,
    linkedContracts.length
      ? React.createElement(InfoBox, {
          key: "contract",
          label: tr("Contract"),
          value: joinLabels(linkedContracts, contractLabel) || "-",
        })
      : null,
    linkedQuotations.length
      ? React.createElement(InfoBox, {
          key: "quotation",
          label: tr("Quotation"),
          value: joinLabels(linkedQuotations, quotationLabel) || "-",
        })
      : null,
  ].filter(Boolean);
  const attendeeUserOptions = selectableUsers
    .filter((user) => {
      const userId = extractId(user.id);
      return !attendees.some((row) => extractId(row.userId) === userId);
    })
    .map((user) => ({
      value: String(extractId(user.id)),
      label: userLabel(user),
    }));

  const attendeeColumns = [
    {
      title: tr("User"),
      dataIndex: "userId",
      render: (value, row) => {
        const user = usersById[extractId(value)];
        return React.createElement(
          Space,
          { size: 8 },
          React.createElement(Avatar, { size: 24 }, userInitial(user)),
          React.createElement(Text, null, userLabel(user)),
          row.isHost ? React.createElement(Tag, { color: "blue" }, tr("Host")) : null,
        );
      },
    },
    {
      title: tr("Attendance"),
      dataIndex: "attendanceStatus",
      width: 160,
      render: (value, row) => {
        const nextPatch = { attendanceStatus: value || "pending" };
        const canEditAttendance = canUpdateAttendeeRow(row, nextPatch);
        if (!canEditAttendance) return attendanceTag(value);
        return React.createElement(Select, {
          size: "small",
          value: value || "pending",
          options: ATTENDANCE_OPTIONS,
          style: { width: 140 },
          disabled: updatingKey === `attendee:${extractId(row.id)}`,
          onChange: (nextValue) =>
            updateAttendee(row, { attendanceStatus: nextValue || "pending" }),
        });
      },
    },
    { title: tr("Content"), dataIndex: "content", render: (value) => stripHtml(value) || "-" },
    {
      title: "",
      key: "actions",
      width: 90,
      render: (_, row) => {
        if (!isCurrentUserHost) return null;
        return React.createElement(
          Popconfirm,
          {
            title: tr("Remove attendee?"),
            okText: tr("Remove"),
            cancelText: tr("Cancel"),
            disabled: !!row.isHost,
            onConfirm: () => deleteAttendee(row),
          },
          React.createElement(
            Button,
            {
              size: "small",
              danger: true,
              disabled: !!row.isHost,
              loading: updatingKey === `attendee:${extractId(row.id)}`,
            },
            tr("Delete"),
          ),
        );
      },
    },
  ];

  const overview = React.createElement(
    "div",
    { style: { display: "grid", gap: token.margin } },
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: token.marginSM,
        },
      },
      React.createElement(InfoBox, { label: tr("Date"), value: formatDate(meeting.meetingDate) }),
      React.createElement(InfoBox, { label: tr("Time"), value: formatTimeRange(meeting.startTime, meeting.endTime) }),
      React.createElement(InfoBox, { label: tr("Host"), value: userLabel(host) }),
      React.createElement(InfoBox, { label: tr("Case"), value: caseLabel(caseRecord) }),
      React.createElement(InfoBox, { label: tr("Customer"), value: customer || "-" }),
      ...relationInfoBoxes,
      React.createElement(InfoBox, {
        label: tr("Location"),
        value: meeting.location || "-",
        href: isUrl(meeting.location) ? meeting.location : undefined,
      }),
    ),
    React.createElement(
      Card,
      { size: "small", title: tr("Agenda / Description") },
      React.createElement(Text, null, stripHtml(meeting.description) || tr("No agenda yet.")),
    ),
  );

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      Card,
      {
        size: "small",
        title: React.createElement(
          "div",
          { style: { display: "grid", gap: 4, minWidth: 0 } },
          React.createElement(
            Space,
            { size: 8, wrap: true },
            React.createElement(Title, { level: 5, style: { margin: 0 } }, meeting.title || tr("Meeting")),
            statusTag(meeting.status),
            typeTag(meeting.type),
          ),
          React.createElement(
            Text,
            { type: "secondary", style: { fontSize: token.fontSizeSM } },
            compact([
              formatDate(meeting.meetingDate),
              formatTimeRange(meeting.startTime, meeting.endTime),
              caseLabel(caseRecord),
              customer,
            ]).join(" - "),
          ),
        ),
        extra: React.createElement(
          Space,
          { size: 8 },
          isCurrentUserHost
            ? React.createElement(Button, { onClick: () => setEditOpen(true) }, tr("Edit meeting"))
            : null,
          React.createElement(Button, { loading, onClick: reload }, tr("Refresh")),
        ),
        bodyStyle: { padding: token.paddingSM },
      },
      React.createElement(Tabs, {
        defaultActiveKey: "overview",
        items: [
          { key: "overview", label: tr("Overview"), children: overview },
          {
            key: "attendees",
            label: tr("Attendees ({0})", { 0: attendees.length }),
            children: React.createElement(
              "div",
              { style: { display: "grid", gap: token.marginSM } },
              isCurrentUserHost
                ? React.createElement(
                    "div",
                    {
                      style: {
                        display: "grid",
                        gridTemplateColumns: "minmax(220px, 1fr) auto",
                        gap: token.marginXS,
                        alignItems: "center",
                      },
                    },
                    React.createElement(Select, {
                      mode: "multiple",
                      allowClear: true,
                      showSearch: true,
                      maxTagCount: "responsive",
                      optionFilterProp: "label",
                      value: attendeeUserIds,
                      options: attendeeUserOptions,
                      placeholder: tr("Add attendees"),
                      onChange: setAttendeeUserIds,
                    }),
                    React.createElement(
                      Button,
                      {
                        type: "primary",
                        loading: savingAttendees,
                        disabled: !attendeeUserIds.length,
                        onClick: addAttendees,
                      },
                      tr("Add"),
                    ),
                  )
                : null,
              React.createElement(Table, {
                size: "small",
                rowKey: "id",
                columns: attendeeColumns,
                dataSource: attendees,
                pagination: false,
                scroll: { x: 820 },
              }),
            ),
          },
        ],
      }),
    ),
    React.createElement(MeetingEditModal, {
      open: editOpen && isCurrentUserHost,
      meeting,
      users: selectableUsers,
      cases,
      customersById,
      canEdit: isCurrentUserHost,
      onCancel: () => setEditOpen(false),
      onSaved: () => {
        setEditOpen(false);
        reload();
      },
    }),
  );
};

ctx.render(React.createElement(MeetingDetailView, null));
