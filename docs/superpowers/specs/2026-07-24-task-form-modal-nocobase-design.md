# Đồng bộ AddTaskModal / AddSubtaskModal theo Nocobase Form system (Design)

## Mục đích

`AddTaskModal` (dòng 2235-2779) và `AddSubtaskModal` (dòng 2781-3174) trong
`All Module/Task/TaskManagement.js` hiện dựng UI hoàn toàn thủ công: `<input>`,
`<select>`, `<textarea>` HTML thô kèm helper `inp()`/`sel()`/`lbl()`/`fld()`
tự viết inline style, priority là `<div>` tự vẽ pill, "Approval required" là
`<input type="checkbox">` custom. Cách này lệch hẳn với pattern Nocobase mà
các module khác trong repo đang dùng (antd `Modal` + antd `Form` +
`Form.Item`), gây rời rạc về layout/spacing/validation so với phần còn lại
của hệ thống.

Mục tiêu: viết lại 2 modal này để dùng đúng antd `Form` ecosystem, giữ
nguyên 100% logic nghiệp vụ (payload gửi API, điều kiện hiển thị, validation
rule) — chỉ đổi lớp UI.

## Bối cảnh & pattern tham chiếu (đã research trong codebase)

- **`All Module/Case/CaseServices.js:4755-4862`** — modal "Add service to
  case": `Modal` với `open`/`onCancel`/`onOk: () => form.submit()`/
  `confirmLoading`/`okButtonProps`/`cancelButtonProps` style theo token cục
  bộ (`DS.primaryButton`, `DS.secondaryButton`), bên trong là `Form`
  (`form`, `layout: "vertical"`, `onFinish`) chứa `Form.Item` cho từng field,
  dùng `Select`/`Input`/`InputNumber`/`Input.TextArea` thật của antd. Có
  pattern `Form.Item({ noStyle: true, shouldUpdate })` render-prop để 1 field
  phụ thuộc giá trị field khác (basePrice phụ thuộc currencyId) — dùng lại
  ý tưởng này (thay bằng `Form.useWatch`, đơn giản hơn) cho field Approver
  phụ thuộc `isRequiredApproval`.
- **`All Module/Meeting/MeetingCreateForm.js`** — form tạo Meeting: `Form`
  đặt trong CSS grid (`gridTemplateColumns: "repeat(4, minmax(0,1fr))"`),
  từng `Form.Item` set `style.gridColumn` (`"span 2"`, `"1 / -1"`) để control
  layout responsive nhiều cột; nút Cancel/primary action đặt cuối form bằng
  `Button` (antd) thật, không phải `<div onClick>`.
- **`All Module/Case/CaseCreateForm.js`** — dùng `Segmented` (antd) cho field
  dạng lựa chọn ngắn (pricing mode) — mẫu cho việc chuyển Priority pill tự vẽ
  sang `Segmented`.
- Trong `TaskManagement.js`, `LawyerPicker` (dòng ~1607-1993) và `TaskPicker`
  (dòng ~1993-2232) đã là custom dropdown component nhận props `value`/
  `onChange` chuẩn — tương thích trực tiếp với `Form.Item` (antd tự inject
  `value`/`onChange` cho child nếu không set `valuePropName`/`trigger`
  khác). Giữ nguyên 2 component này, chỉ bọc trong `Form.Item`, **không**
  thay bằng `Select` chuẩn (đã chốt với user — mất avatar/nhóm theo loại
  luật sư/status badge nếu đổi).
- `STATUS_CFG`/`PRIORITY_CFG` (đầu file, §1 CONFIG) đã định nghĩa màu cho
  từng priority (`high #cf1322`, `medium #d46b08`, `low #389e0d`) — tái dùng
  màu này khi build option cho `Segmented`, không tự bịa màu mới.

## Phạm vi

- `AddTaskModal` (2235-2779) và `AddSubtaskModal` (2781-3174): viết lại phần
  render (JSX/markup) theo antd `Form`.
- **Không đổi**: chữ ký component (props nhận vào), `handleSave` business
  logic (field nào gửi lên API, điều kiện `if (form.previousTaskId) ...`,
  auto-xóa `approvedById` khi tắt `isRequiredApproval`, cách tính
  `finalStatus` dựa trên `previousTaskId`), cách 2 modal này được mount ở
  §10 MAIN (dòng 5529, 5543) — props truyền vào (`open`, `projectId`,
  `lawyers`, `services`, `allTasksInProject`, `onSave`, `onClose`,
  `currentUser`, `parentTaskId`) giữ nguyên.
- Không đụng `TaskRow`, `ServiceSection`, `ListView`, hay bất kỳ phần nào
  khác của file ngoài 2 modal này.

## Thiết kế chi tiết

### Modal chrome (cả 2 modal)

```javascript
React.createElement(Modal, {
  open,
  onCancel: () => { onClose(); form.resetFields(); },
  onOk: () => form.submit(),
  confirmLoading: saving,
  okText: saving ? "Saving..." : "Created Task" /* hoặc "Create Subtask" */,
  cancelText: "Cancel",
  width: 900 /* AddTaskModal */ | 640 /* AddSubtaskModal */,
  title: "📋 New task" /* hoặc "New subtask" */,
  okButtonProps: { style: TASK_DS.primaryButton },
  cancelButtonProps: { style: TASK_DS.secondaryButton },
}, formElement)
```

`TASK_DS` là object token cục bộ mới, định nghĩa ở §1 CONFIG cạnh
`STATUS_CFG`/`PRIORITY_CFG` (file là single-file block, không import được
token từ `CaseServices.js` — xem memory `nocobase_single_file_constraint`):

```javascript
const TASK_DS = {
  radius: 6,
  primaryButton: { background: "#1890ff", borderColor: "#1890ff", borderRadius: 6, fontWeight: 600 },
  secondaryButton: { borderColor: "#e8e8e8", borderRadius: 6 },
  infoBox: { padding: "10px 14px", background: "#e6f4ff", border: "1px solid #91caff", borderRadius: 6, color: "#0958d9", fontSize: 12 },
  warnBox: { padding: "10px 14px", background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 6, color: "#d46b08", fontSize: 12 },
};
```

(Màu `#1890ff` khớp màu primary đã dùng trong `STATUS_CFG.inProgress` và nút
"＋ New Task" hiện tại — giữ nhất quán trong chính file này thay vì copy màu
từ `CaseServices.js`.)

### Form + layout

`const [form] = Form.useForm();` thay cho `useState(INIT_FORM)` +
`set(k, v)`. Bỏ hoàn toàn `INIT_FORM`/`set`/`inp`/`sel`/`lbl`/`fld` helper.

Grid: `<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "12px 16px" }}>` bọc `Form` content, mỗi `Form.Item`
set `style: { marginBottom: 12, gridColumn: fullWidth ? "1 / -1" : "auto" }`
— cùng convention `fieldStyle`/`fullFieldStyle` trong `MeetingCreateForm.js`.

### Field mapping — AddTaskModal

| Field | name | Component | Ghi chú |
|---|---|---|---|
| Title | `title` | `Input` | `rules: [{ required: true, message: "Please enter a title" }]`, full width |
| Assignee | `lawyerId` | `LawyerPicker` | bọc `Form.Item`, props `lawyers`, `size: 22` |
| Service | `serviceId` | `Select` | options từ `services` (giữ logic disable khi `isDeletedServiceRecord`, hiển thị "🔒" — giữ y hệt label hiện tại) |
| Start date | `startDate` | `DatePicker` | format hiển thị `DD/MM/YYYY`, value convert Dayjs ↔ ISO string lúc submit |
| Deadline | `dueDate` | `DatePicker` | như trên |
| Estimated duration | `estimatedDuration` | `InputNumber` | `addonAfter: "hours"`, `min: 0` |
| Pending Issue | `previousTaskId` | `TaskPicker` | bọc `Form.Item`, full width; giữ nguyên khối info hiển thị task được chọn (đổi style sang `TASK_DS.infoBox`/màu theo status) |
| Priority | `priority` | `Segmented` | 3 option High/Medium/Low, `icon` + label lấy từ `PRIORITY_CFG`, `initialValue: "medium"` |
| Approval required | `isRequiredApproval` | `Switch` | `valuePropName: "checked"`; `onChange` phụ: khi tắt, `form.setFieldValue("approvedById", null)` (thay cho logic auto-clear hiện có trong `set()`) |
| Approver | `approvedById` | `LawyerPicker` | chỉ render `Form.Item` này khi `Form.useWatch("isRequiredApproval", form)` true |
| Description | `description` | `Input.TextArea` | `rows: 3`, full width |
| Next Step | `nextStepDescription` | `Input.TextArea` | `rows: 2`, full width |

Field `serviceId` giữ effect hiện có: đổi `serviceId` → nếu `previousTaskId`
đang chọn thuộc service khác thì tự clear (`form.setFieldValue("previousTaskId", null)`), dùng `Form.useWatch("serviceId", form)` + `useEffect` thay cho
effect cũ dựa trên `form.serviceId` state.

### Field mapping — AddSubtaskModal

Giống bảng trên nhưng **bỏ** `serviceId` và `previousTaskId` (subtask không
có 2 field này ở bản gốc). Các field còn lại (`title`, `lawyerId`,
`estimatedDuration`, `startDate`, `deadline`, `priority`,
`isRequiredApproval`, `approvedById`, `description`,
`nextStepDescription`) giữ đúng `name` như field gốc trong `INIT_FORM`/
`handleSave` hiện tại (không đổi tên field nào).

### Validate & submit

Thay:
```javascript
if (!form.title.trim()) { message.warning(...); return; }
```
bằng `Form.Item` `rules` + `await form.validateFields()` trong `handleSave`
(pattern giống `MeetingCreateForm.handleSubmit`) — nếu validate fail thì
`catch { return; }`, không tự show message (antd Form tự hiển thị lỗi dưới
field).

Toàn bộ phần build `payload` trong `handleSave` giữ nguyên cấu trúc, chỉ đổi
nguồn đọc giá trị từ `form.title`/`form.lawyerId`/... (state cũ) sang biến
`values` trả về từ `form.validateFields()`. Ngày tháng: `DatePicker` trả về
Dayjs object — convert bằng `values.startDate?.toDate().toISOString()` thay
cho `new Date(form.startDate).toISOString()`.

Sau khi tạo thành công: `form.resetFields()` thay cho `setForm(INIT_FORM)`.

### Không đổi

- API endpoint, field name gửi lên (`tasks:create`/`subTasks:create`),
  logic tính `finalStatus` dựa `previousTaskId`, `withTaskLinkedUrl` cho
  subtask.
- Danh sách `tasksForDependency` lọc theo `serviceId` cho `TaskPicker`.
- Cách 2 modal được gọi/mount ở §10 MAIN — không đổi props interface.

## Rủi ro / lưu ý khi implement

- `Form.useWatch` cần antd version hỗ trợ (đã xác nhận có sẵn, dùng trong
  `MeetingCreateForm.js`: `const hasFormWatch = !!Form.useWatch;`) — áp dụng
  guard tương tự nếu cần an toàn, nhưng vì `MeetingCreateForm.js` đã dùng
  thẳng `Form.useWatch` mà không lỗi trong runtime hiện tại, có thể dùng
  trực tiếp không cần guard thêm.
- §1 CONFIG hiện chỉ destructure `Spin, Typography, Select, message, Modal,
  Input, Button, Tooltip, Empty` từ `ctx.antd` (dòng 6-15). Cần bổ sung vào
  đúng khối destructure module-level này: `Form, DatePicker, InputNumber,
  Segmented, Switch` — không destructure lại cục bộ trong từng modal (tránh
  shadow biến, đồng nhất với cách file này tổ chức import).
- Giữ nguyên toàn bộ msg text (tiếng Anh) đang dùng trong `message.success`/
  `message.warning`/`message.error` của 2 modal — không đổi nội dung.
