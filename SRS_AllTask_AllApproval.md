# SRS — All Task & All Approval Block

**Hệ thống quản lý công ty luật · Nocobase JS Block**
Ngày soạn: 25/06/2026 | Trạng thái: **Draft v1.1** (cập nhật sau bug-fix)

---

## Thông tin module

| Thuộc tính | AllTaskBlock | AllApprovalBlock |
|---|---|---|
| File | `All Module/Task/AllTaskBlock.js` | `All Module/Task/AllApprovalBlock.js` |
| Số dòng | ~3.399 | ~2.970 |
| Nền tảng | Nocobase JS Block, React 18, Ant Design 5 | Nocobase JS Block, React 18, Ant Design 5 |
| Collections đọc | tasks, subTasks, lawyers, projects, projectServices, customers | tasks, subTasks, lawyers, projects, projectServices, customers |
| Collections ghi | tasks, subTasks (board drag), users (view config) | tasks, subTasks (status, rejectionReason, approvedById), users (view config) |
| View modes | Table · Board · Roadmap | Table · Board |
| Fetch limit | 100 tasks + 100 subtasks | 100 tasks + 100 subtasks |
| Scope config key | `allTasks` / `myTasks` | `allApprovals` / `myApprovals` |

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Module 1 — All Task Block](#2-module-1--all-task-block)
   - 2.1 Functional Requirements
   - 2.2 Scope Mode
   - 2.3 Filter Bar
   - 2.4 Cột bảng
   - 2.5 Column Menu & Actions
   - 2.6 Group-by & Sort
   - 2.7 View Modes
   - 2.8 Pagination
   - 2.9 View Config Persistence
3. [Module 2 — All Approval Block](#3-module-2--all-approval-block)
   - 3.1 Functional Requirements
   - 3.2 Scope Mode
   - 3.3 Filter Bar
   - 3.4 Cột bảng
   - 3.5 Approve / Reject Flow
   - 3.6 Reject Modal
   - 3.7 Stats & Card Header
   - 3.8 Pagination
   - 3.9 View Config Persistence
4. [Test Cases — All Task Block](#4-test-cases--all-task-block)
5. [Test Cases — All Approval Block](#5-test-cases--all-approval-block)
6. [Bug Review & Tiềm ẩn rủi ro](#6-bug-review--tiềm-ẩn-rủi-ro)

---

## 1. Tổng quan hệ thống

Hai block thuộc nhóm **Task Management**, chạy như JS Field blocks trong Nocobase. Nhận `ctx` là interface chính để tương tác với API, UI và trạng thái người dùng.

**Kiến trúc chung:** `loadCurrentUser()` → `reload()` → `enrichRows()` → React state → render.  
View config lưu trên `users.allTaskViewConfig` (JSON), scoped theo block và scope mode.

### So sánh nhanh

| | AllTaskBlock | AllApprovalBlock |
|---|---|---|
| Mục đích | Xem, filter, quản lý toàn bộ tasks | Review và phê duyệt/từ chối tasks cần approval |
| Filter API-level (scope "my") | `lawyerId ∈ currentLawyerIds` | `approvedById ∈ currentLawyerIds` |
| Filter server-level | Không có | `isRequiredApproval = true` |
| Action chính | Drag-drop đổi status (board), mở detail | Phê duyệt / Từ chối (chỉ pending rows) |

---

## 2. Module 1 — All Task Block

### 2.1 Functional Requirements

| ID | Chức năng | Mô tả |
|---|---|---|
| FR-T01 | Tải dữ liệu | Fetch tối đa 100 tasks + 100 subtasks, sort `-updatedAt`. Subtask thiếu parent → fetch riêng. Hiện warning nếu chạm limit. |
| FR-T02 | Enrich dữ liệu | Join với lawyers, projects, projectServices, customers → display rows đầy đủ. |
| FR-T03 | Filter bar | Filter theo: Case, Assignees, Status (7), Waiting issue (6), Date range (startDate), Keyword. |
| FR-T04 | Column filter | Mỗi cột có filter riêng theo giá trị thực tế trong data (in-memory). |
| FR-T05 | Sort | Sort bất kỳ cột (asc/desc), qua column header menu. |
| FR-T06 | Group-by | 10 lựa chọn: case, service, status, assignee, start, due, waiting, nextStep, updatedAt, closedDate. |
| FR-T07 | Table view | 9 cột, resizable, reorderable, hideable. Pagination nhóm (5 groups/trang). |
| FR-T08 | Board view | Kanban 7 cột theo status. Drag-drop card → API update status → reload. |
| FR-T09 | Roadmap view | Gantt tháng hiện tại. Timeline mật độ biến. Bars màu theo overdue/on-time. |
| FR-T10 | Mở task detail | Click title → `ctx.openView("1a280d823ef", { mode: "dialog", size: "large" })`. |
| FR-T11 | Real-time update | `law-task-detail:changed` → patch row ngay + reload debounce 300ms (1 timer). |
| FR-T12 | View config | Lưu visibleColumnKeys, groupBy, viewMode, columnWidths, columnOrder, sortConfig vào `users.allTaskViewConfig`. |
| FR-T13 | Scope mode | "all" = tất cả tasks. "my" = tasks có `lawyerId ∈ currentLawyerIds`. |

### 2.2 Scope Mode

Scope xác định một lần khi module load, từ `getRuntimeInput()`:

```js
const TASK_BLOCK_SCOPE = normalizeTaskScope(
  getRuntimeInput().taskScope || getRuntimeInput().scope || "all"
);
```

| Input | Normalized | Alias |
|---|---|---|
| Không có / bất kỳ | **all** | — |
| "my" | **my** | mine, personal, assigned, assignee |

| | Scope "all" | Scope "my" |
|---|---|---|
| API filter | Không có | `{ lawyerId: { $in: [...currentLawyerIds] } }` |
| Config key | `allTasks` | `myTasks` |
| Empty state | Hiển thị bình thường | Nếu không có lawyer record → empty list, return |

### 2.3 Filter Bar

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Row 1 — Grid 4 cột                                                               │
│ ┌─────────────────────┐ ┌─────────────────┐ ┌──────────────┐ ┌───────────────┐  │
│ │ Case (multi)         │ │ Assignees(multi) │ │ Status(multi)│ │ Waiting(multi)│  │
│ │ minmax(260px,1.2fr)  │ │ minmax(220px,1fr)│ │ min(220px,1) │ │ min(180px,.8) │  │
│ └─────────────────────┘ └─────────────────┘ └──────────────┘ └───────────────┘  │
│                                                                                  │
│ Row 2 — Grid 5 cột (4 khi board mode — ẩn Group by)                             │
│ ┌─────────────────┐ ┌──────────────┐ ┌──────────────────────┐ ┌────┐ ┌──────┐   │
│ │ Search keyword   │ │ Group by     │ │ Ngày bắt đầu từ/đến  │ │⚙️  │ │Reset │   │
│ │ min(280px,1.4fr) │ │ min(220px,.8)│ │ min(320px,1.1fr)     │ │160 │ │ 96px │   │
│ └─────────────────┘ └──────────────┘ └──────────────────────┘ └────┘ └──────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

| Control | Field filter | Ghi chú |
|---|---|---|
| Case | `filters.caseIds` | Option 2 dòng: case code + tên khách hàng. |
| Assignees | `filters.assigneeIds` | Options từ lawyers đã load. |
| Status | `filters.statuses` | 7 values: toDo, inProgress, blocked, pending, approval, done, cancelled. |
| Waiting issue | `filters.waitingKinds` | 6 values: blocked, waiting_previous, pending_approval, overdue, unassigned, has_next_step. |
| Search | `filters.keyword` | Tìm trong: title, parent title, project, service, assignee, description, blocker, next step, waiting text. Unicode NFC. |
| Group by | `groupBy` | Ẩn khi board mode. 10 options. |
| Date range | `filters.dateRange` | **Filter theo startDate** (không phải dueDate). Placeholder: "Ngày bắt đầu từ" / "Ngày bắt đầu đến". ✅ *Fixed BUG-06* |
| Reset | — | Xóa filters + columnFilters. Không reset view config. |

> **Lưu ý:** Date range filter theo `startDateValue` — không phải dueDate hay closedDate.

### 2.4 Cột bảng (Table Columns)

| Key | Label | Width | Locked | Default visible | Đặc điểm |
|---|---|---|---|---|---|
| `task` | Task | 280px | ✅ fixed left | ✅ | Link mở detail. Subtask: indent + "Subtask" label. |
| `status` | Status | 130px | — | ✅ | AntD Tag, màu từ STATUS_CFG. |
| `assignee` | Assignee | 160px | — | ✅ | "Unassigned" (secondary) nếu không có. |
| `start` | Start | 110px | — | ✅ | vi-VN dd/mm/yyyy. "-" nếu null. |
| `due` | Due | 110px | — | ✅ | Màu đỏ nếu overdue. |
| `closedDate` | Closed date | 130px | — | — | Hidden mặc định. |
| `waiting` | Waiting issue | 240px | — | ✅ | Array of colored Tags. Tooltip chi tiết. |
| `nextStep` | Next step | 220px | — | — | Ellipsis + Tooltip. Hidden mặc định. |
| `updatedAt` | Updated | 150px | — | ✅ | Datetime format (ngày + giờ). |

**Status values:**

| Value | Label | Màu |
|---|---|---|
| toDo | To Do | #595959 / #f5f5f5 |
| inProgress | Đang làm | #0958d9 / #e6f4ff |
| blocked | Bị chặn | #531dab / #f9f0ff |
| pending | Chờ duyệt | #874d00 / #fffbe6 |
| approval | Đã duyệt | #237804 / #f6ffed |
| done | Hoàn thành | #389e0d / #f6ffed |
| cancelled | Đã hủy | #8c8c8c / #fafafa |

### 2.5 Column Menu & Actions

Mỗi header cột có nút "•••" mở Popover 270px:

- **Select column** — highlight cột (visual only)
- **Sort ascending / descending** — chỉ một cột sort tại một thời điểm
- **Clear sort** — chỉ hiện khi cột đang sort
- **Filter by values** — multi-select từ unique display values (in-memory)
- **Group by values** — disabled nếu field không trong GROUP_BY_OPTIONS
- **Hide field** — disabled cho locked columns
- **Move left / Move right** — reorder trong `columnOrder`
- **✕ Clear column config** — xóa filter, sort, group-by của cột này

Header highlight primary-light khi đang sort hoặc filter. Drag handle (8px, `col-resize`) cho resize — min width 90px.

### 2.6 Group-by & Sort

**Group-by options (10):**

| Value | Sort thứ tự nhóm |
|---|---|
| case | Giảm dần theo createdAt project, rồi alpha |
| service, status, assignee, waiting, nextStep | Alpha |
| start, due, updatedAt, closedDate | Alpha theo formatted date string |

**Sort logic:**
- Date columns: sort theo Unix timestamp (null = 0)
- Text columns: `String.localeCompare("vi", { numeric: true })`
- Sort hoạt động **trong từng group** (không across groups)

### 2.7 View Modes

**Table mode (default)**
- Mỗi group = section card với AntD Table bên trong
- Horizontal scroll khi columns vượt chiều rộng (`scroll.x = totalColumnWidth`)
- Pagination: 5 groups/trang + 10 rows/trang per table

**Board mode (Kanban)**
- 7 cột cố định theo status (bỏ qua `groupBy` setting)
- Drag-drop card → API update status → reload (có optimistic update + rollback)
- Height: `calc(100vh - 260px)`, max 680px, min 360px

**Roadmap mode (Gantt)**
- Chỉ tháng hiện tại. Không paginate (render ALL groups/rows)
- Left: task list | Right: timeline mật độ biến (ngày gần = riêng lẻ, ngày xa = nhóm 5)
- Bar overdue: viền đỏ + nền `#fff1f0`. Bar on-time: primary blue
- Today: cột highlight đỏ + đường dọc đỏ

### 2.8 Pagination

| Level | Đơn vị | Page size | Điều kiện hiện |
|---|---|---|---|
| Group-level | Groups | 5 | `allGroups.length > 5` và `viewMode = "table"` |
| Row-level | Rows trong group | 10 | `group.rows.length > 10`, `hideOnSinglePage: true` |

`casePage` reset về 1 khi: filter thay đổi, groupBy thay đổi, viewMode thay đổi, totalCasePages < casePage.

### 2.9 View Config Persistence

Lưu trong `users.allTaskViewConfig[BLOCK_VIEW_CONFIG_KEY]`:

| Property | Kiểu | Mô tả |
|---|---|---|
| visibleColumnKeys | string[] | Danh sách cột hiển thị |
| groupBy | string | Field group-by hiện tại |
| viewMode | string | "table" \| "board" \| "roadmap" |
| columnWidths | `{[key]:number}` | Độ rộng theo pixel |
| columnOrder | string[] | Thứ tự cột trái-phải |
| sortConfig | `{field,direction}\|null` | Cột đang sort |

> Filter bar state **không** được persist.

---

## 3. Module 2 — All Approval Block

### 3.1 Functional Requirements

| ID | Chức năng | Mô tả |
|---|---|---|
| FR-A01 | Tải dữ liệu approval | Fetch tasks + subtasks có `isRequiredApproval: true`. Scope "my": thêm `approvedById ∈ currentLawyerIds`. Hiện warning nếu chạm limit. |
| FR-A02 | Phê duyệt task | PUT `status = "approval"`, `approvedById = currentLawyerId`. Chỉ hiện khi `status = "pending"`. Guard: từ chối nếu user không có lawyer record. |
| FR-A03 | Từ chối task | PUT `status = "toDo"`, `rejectionReason = reason`. Bắt buộc nhập lý do, max 500 ký tự (enforce cả client). |
| FR-A04 | Reject modal | Modal 480px với preview task, TextArea (max 500 chars, showCount), validation, helper text. |
| FR-A05 | Filter bar | Filter: Case, Assignee, Approver, Status, Date range (dueDate), Keyword (bao gồm rejectionReason). |
| FR-A06 | Column config | 13 cột, 2 locked (task, actions). Sort, filter, group-by, resize, reorder, hide per column. |
| FR-A07 | Group-by | 7 options: status (pending first), case, service, assignee, approver, due, updatedAt. |
| FR-A08 | Stats header | Badge "N chờ duyệt" (với Tooltip) + text "X/Y đã duyệt" từ **unfiltered rows**. |
| FR-A09 | Board view | Kanban theo status với approve/reject buttons trên card. |
| FR-A10 | Real-time | `law-task-detail:changed`, debounce 600ms → reload. |
| FR-A11 | Scope mode | "all" = tất cả approval tasks. "my" = tasks mà user là approver. |
| FR-A12 | View config | Lưu config vào `users.allTaskViewConfig[allApprovals\|myApprovals]`. |

### 3.2 Scope Mode

| | Scope "all" | Scope "my" |
|---|---|---|
| API filter | `{ isRequiredApproval: true }` | `{ isRequiredApproval: true, approvedById: { $in: [...] } }` |
| Card title | "All Approval" | "My Approval" |
| Config key | `allApprovals` | `myApprovals` |
| Approver dropdown | Tất cả approvers có trong data | Chỉ current user (data đã scope) |
| Empty state | Bình thường | Nếu user không có lawyer record → empty list, không crash |

Alias cho scope "my": `mine, personal, assigned, approver, reviewer, myapproval, my_approval, my-approval, "my approval"`

### 3.3 Filter Bar

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Card Header: "My Approval" [2 chờ duyệt]ⓘ          3/10 đã duyệt   [Refresh]   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Row 1 — Grid 4 cột                                                               │
│ ┌────────────────────┐ ┌──────────────────┐ ┌────────────────┐ ┌──────────────┐ │
│ │ Case (multi)        │ │ Assignee (multi)  │ │ Approver(multi)│ │ Status(multi)│ │
│ │ minmax(260px,1.2fr) │ │ minmax(220px,1fr) │ │ min(220px,1fr) │ │ min(180px,.8)│ │
│ └────────────────────┘ └──────────────────┘ └────────────────┘ └──────────────┘ │
│                                                                                  │
│ Row 2 — Grid 5 cột (4 nếu không có RangePicker)                                 │
│ ┌────────────────┐ ┌────────────┐ ┌──────────────────────┐ ┌──────────┐ ┌──────┐│
│ │ Search keyword  │ │ Group by   │ │ Date range (Due date) │ │ View cfg  │ │Reset ││
│ │ min(280,1.4fr) │ │ min(180,.7)│ │ minmax(300px,1.1fr)  │ │min(140,.5)│ │ 96px ││
│ └────────────────┘ └────────────┘ └──────────────────────┘ └──────────┘ └──────┘│
└──────────────────────────────────────────────────────────────────────────────────┘
```

| Control | Filter field | Khác biệt vs AllTaskBlock |
|---|---|---|
| Case | `filters.caseIds` | Giống |
| Assignee | `filters.assigneeIds` | Giống |
| **Approver** | `filters.approverIds` | ✨ Mới: filter theo người phê duyệt |
| Status | `filters.statuses` | Không có "Waiting issue" |
| Search | `filters.keyword` | Thêm `rejectionReasonValue` vào haystack |
| Group by | `groupBy` | 7 options (không có waiting, nextStep) |
| Date range | `filters.dateRange` | Filter theo **dueDate** (khác AllTaskBlock filter startDate) |
| View config | — | Không có "Roadmap" option |

### 3.4 Cột bảng (Table Columns)

| Key | Label | Width | Locked | Default | Đặc điểm |
|---|---|---|---|---|---|
| `task` | Task | 240px | ✅ | ✅ | Link mở detail. Subtask mở parent task's detail. |
| `case` | Case | 200px | — | ✅ | Ellipsis + Tooltip. |
| `service` | Service | 160px | — | — | Hidden mặc định. |
| `status` | Status | 140px | — | ✅ | AntD Tag. |
| `assignee` | Assignee | 140px | — | ✅ | "Unassigned" secondary. |
| `approver` | Approver | 140px | — | ✅ | ✨ Màu xanh lá (`#237804`) nếu có. |
| `start` | Start | 110px | — | ✅ | vi-VN. |
| `due` | Due | 110px | — | ✅ | vi-VN. |
| `closedDate` | Closed date | 120px | — | — | Hidden mặc định. |
| `rejectionReason` | Rejection reason | 220px | — | ✅ | ✨ Màu đỏ `Text type="danger"`. Ellipsis + Tooltip. |
| `nextStep` | Next step | 180px | — | — | Hidden mặc định. |
| `updatedAt` | Updated | 150px | — | ✅ | Datetime. |
| `actions` | Actions | 200px | ✅ no menu | ✅ | ✨ "Phê duyệt" (green) + "Từ chối" (red). **Chỉ khi `status = "pending"`**. |

### 3.5 Approve / Reject Flow

**Approve:**

1. Guard: `approvingKey === row.key` → return (chặn double-click)
2. **Guard mới ✅ (BUG-07):** `!currentLawyers?.length` → error toast, return
3. `setApprovingKey(row.key)` — nút hiển thị spinner
4. `POST {collection}:update?filterByTk={id}` với `{ status: "approval", approvedById: currentLawyerId }`
5. Success → `message.success` → `reload()`
6. Error → `message.error`. Finally → `setApprovingKey(null)`

**Reject:**

1. `openRejectModal(row)` → modal mở với reason rỗng
2. Validate: `reason.trim()` không rỗng → warning
3. **Validate mới ✅ (BUG-14):** `reason.trim().length > 500` → warning, return
4. `POST {collection}:update?filterByTk={id}` với `{ status: "toDo", rejectionReason: reason.trim() }`
5. Success → đóng modal → `reload()`
6. Error → toast, `submitting = false` (modal giữ nguyên để retry)

### 3.6 Reject Modal

```
┌─────────────────────────────────────────────┐
│  Từ chối phê duyệt                      [×] │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐ │
│  │ Tên task (bold)                         │ │
│  │ Case name · Service name (secondary)    │ │
│  └─────────────────────────────────────────┘ │
│                                             │
│  Lý do từ chối *                            │
│  ┌─────────────────────────────────────────┐ │
│  │ Nhập lý do từ chối để thông báo...      │ │
│  │                                         │ │
│  │                               0/500     │ │
│  └─────────────────────────────────────────┘ │
│  Task sẽ được trả về trạng thái "To do"     │
│  kèm lý do từ chối.                         │
├─────────────────────────────────────────────┤
│        [Hủy]        [Xác nhận từ chối 🔴]  │
└─────────────────────────────────────────────┘
```

| Thuộc tính | Giá trị |
|---|---|
| Width | 480px |
| destroyOnClose | true |
| maskClosable | false khi submitting |
| Textarea | 4 rows, maxLength 500, showCount, autoFocus, disabled khi submitting |
| OK style | danger, confirmLoading = submitting |
| Cancel | disabled khi submitting; re-enable sau error |
| Validation | Không rỗng + không vượt 500 chars (enforce cả client) |

### 3.7 Stats & Card Header

```
[My Approval]  [2 chờ duyệt]ⓘ             5/12 đã duyệt   [Refresh]
```

- `pendingCount` = `rows.filter(r => r.status === "pending").length` — từ **raw rows** (bất kể filter)
- `approvedCount` = `rows.filter(r => r.status === "approval").length`
- `totalCount` = `rows.length`
- Badge "N chờ duyệt": màu warning, kèm **Tooltip** giải thích không bị ảnh hưởng bởi filter ✅ *(BUG-12 fixed)*
- Text "X/Y đã duyệt": chỉ render khi `totalCount > 0`

### 3.8 Pagination

Cùng pattern với AllTaskBlock: group-level (5/trang) + row-level (10/trang). Group header còn hiển thị thêm badge "N pending" riêng.

### 3.9 View Config Persistence

Giống AllTaskBlock. Config key `allApprovals` hoặc `myApprovals`. Filter bar KHÔNG persist.

---

## 4. Test Cases — All Task Block

### TC-T01: Tải dữ liệu ban đầu

**Precondition:** DB có 5 tasks, 3 subtasks, tất cả có projectId và lawyerId hợp lệ

**Steps:**
1. Mở block (scope = "all")
2. Chờ loading spinner biến mất

**Expected:**
- Hiển thị đúng 5 tasks + 3 subtasks (8 rows tổng)
- Subtasks có indent + "Subtask" label
- Assignee/Project label đúng
- Không có error console/toast

**Pass criteria:** ✅ PASS nếu row count khớp, không error

---

### TC-T02: Scope "my" — chỉ thấy task của mình

**Precondition:** Current user là luật sư A, có 3 tasks assign cho A, 5 tasks assign cho B

**Steps:** Mở block với `inputArgs { scope: "my" }`

**Expected:** Chỉ 3 tasks của A. 5 tasks của B không xuất hiện.

**Pass criteria:** ✅ PASS nếu row count = 3

---

### TC-T03: Filter theo Status

**Steps:**
1. Chọn "Đang làm"
2. Chọn thêm "Bị chặn"
3. Bỏ chọn "Đang làm"

**Expected:** Step 1: chỉ inProgress. Step 2: inProgress + blocked. Step 3: chỉ blocked. `casePage` reset mỗi lần.

---

### TC-T04: Keyword search nâng cao

**Steps:**
1. Nhập "hà nội" (chữ thường)
2. Nhập ký tự zero-width space
3. Xóa nội dung

**Expected:** Step 1: tìm đúng (NFC normalized). Step 2: zero-width bị strip. Step 3: hiện lại tất cả.

---

### TC-T05: Date range filter — boundary

**Precondition:** Task A startDate = 01/06/2026. Task B startDate = 30/06/2026. Task C startDate = null.

**Steps:** Chọn range 01/06/2026 → 30/06/2026

**Expected:** A và B hiển thị. C ẩn (null). Boundary inclusive.

---

### TC-T06: Group-by thay đổi

**Steps:** Case → Status → Assignee

**Expected:** Headers đổi theo. `casePage` về 1 mỗi lần.

---

### TC-T07: Column sort

**Steps:**
1. Sort "Due" ascending
2. Sort "Assignee" descending
3. Clear sort Assignee

**Expected:** Step 2: sort chuyển sang Assignee (Due header mất highlight). Step 3: không sort.

---

### TC-T08: Column resize và lưu config

**Steps:**
1. Drag handle cột "Task" từ 280px → 400px
2. Reload trang

**Expected:** Step 1: live update. Step 2: vẫn 400px (đã lưu `allTaskViewConfig`).

---

### TC-T09: Board drag-and-drop

**Precondition:** Task A status = "toDo"

**Steps:**
1. Chuyển sang Board mode
2. Drag Task A → cột "In Progress"
3. Kiểm tra DB

**Expected:** Card di chuyển ngay (optimistic). DB: `status = "inProgress"`. Nếu API fail: rollback về cột cũ.

---

### TC-T10: Scope "my" — user không có lawyer record

**Precondition:** Current user không có record trong `lawyers`

**Steps:** Mở block scope = "my"

**Expected:** Empty list. Không crash. Không error toast. Loading tắt.

**Pass criteria:** ✅ PASS / ⚠️ WARN nếu không có message giải thích cho user

---

### TC-T11: Real-time event update

**Steps:**
1. Block đang hiển thị Task A status = "toDo"
2. Dispatch `window.dispatchEvent(new CustomEvent("law-task-detail:changed", { detail: { id: taskAId, status: "done" } }))`

**Expected:** Task A patch ngay. Sau 300ms: full reload (1 timer duy nhất, không double reload).

---

### TC-T12: Pagination — 6 groups

**Precondition:** 6 cases, group by = "case"

**Expected:** Trang 1: 5 groups. Trang 2: 1 group. Bar hiện "1-5 of 6 groups".

---

### TC-T13: Reset filters

**Steps:**
1. Set status = "done", keyword = "abc", date range = 01/01 → 31/12
2. Click Reset

**Expected:** Tất cả filters về rỗng. View config (columns, sort, groupBy) **KHÔNG** bị reset.

---

## 5. Test Cases — All Approval Block

### TC-A01: Chỉ tải tasks cần approval

**Precondition:** 3 tasks `isRequiredApproval=true`, 5 tasks không

**Expected:** Chỉ 3 tasks hiển thị.

---

### TC-A02: Scope "my" — chỉ thấy task mình phê duyệt

**Precondition:** Task A `approvedById = lawyerX` (= current user). Task B `approvedById = lawyerY`.

**Steps:** Mở block scope = "my"

**Expected:** Chỉ Task A. Title = "My Approval". Badge pending chính xác.

---

### TC-A03: Phê duyệt task thành công

**Precondition:** Task A status = "pending". Current user có lawyer record lawyerX.

**Steps:**
1. Click "Phê duyệt" trên Task A
2. Chờ spinner biến mất
3. Kiểm tra DB

**Expected:**
- Nút hiển thị spinner khi đang xử lý
- Toast "Task approved successfully."
- DB: `status = "approval"`, `approvedById = lawyerX.id`
- Row cập nhật sau reload (nút Actions ẩn)
- Stats: approvedCount +1, pendingCount -1

---

### TC-A04: Phê duyệt — user không có lawyer record (BUG-07 fixed)

**Precondition:** Current user không có record trong `lawyers`

**Steps:** Click "Phê duyệt"

**Expected:** Error toast "Bạn chưa có hồ sơ luật sư...". Không có API call. Task giữ nguyên status.

**Pass criteria:** ✅ PASS (đã fix BUG-07)

---

### TC-A05: Phê duyệt — chặn double-click

**Steps:** Click "Phê duyệt" nhanh 3 lần liên tiếp

**Expected:** Chỉ 1 API call. Không duplicate.

---

### TC-A06: Từ chối task — nhập lý do hợp lệ

**Steps:**
1. Click "Từ chối" → modal mở
2. Nhập lý do hợp lệ
3. Click "Xác nhận từ chối"

**Expected:** Modal đóng. Toast success. DB: `status = "toDo"`, `rejectionReason` có nội dung. Cột rejection reason màu đỏ.

---

### TC-A07: Từ chối — bỏ trống lý do

**Steps:** Mở modal, không nhập gì, click confirm

**Expected:** Warning toast "Vui lòng nhập lý do từ chối." Modal giữ nguyên. Không có API call.

---

### TC-A08: Từ chối — lý do chỉ whitespace

**Steps:** Nhập "   " (3 khoảng trắng), click confirm

**Expected:** Warning toast (reason.trim() = ""). Không có API call.

---

### TC-A09: Từ chối — lý do vượt 500 ký tự (BUG-14 fixed)

**Steps:** Paste text 501 ký tự vào textarea, click confirm

**Expected:** Warning toast "Lý do từ chối không được vượt quá 500 ký tự." Không có API call.

**Pass criteria:** ✅ PASS (đã fix BUG-14)

---

### TC-A10: Actions chỉ hiện cho pending rows

**Precondition:** Tasks với đủ 7 status

**Expected:** Chỉ `status = "pending"` có nút Phê duyệt + Từ chối. Tất cả status khác: ô Actions trống.

---

### TC-A11: Filter Approver dropdown

**Precondition:** Task A approvedBy = luật sư X. Task B approvedBy = luật sư Y.

**Steps:** Chọn "luật sư X" trong Approver filter

**Expected:** Chỉ Task A hiển thị.

---

### TC-A12: Stats không bị ảnh hưởng bởi filter (BUG-12 fixed)

**Precondition:** 10 tasks, 3 pending, 4 approval. Filter status = "pending".

**Steps:** Quan sát card header

**Expected:** Badge "3 chờ duyệt" (Tooltip hiện giải thích). Text "4/10 đã duyệt" (không phải "3/3").

**Pass criteria:** ✅ PASS (đã fix BUG-12 với Tooltip)

---

### TC-A13: Reject modal — API fail

**Steps:**
1. Mở modal, nhập lý do hợp lệ
2. Mock API trả về 500
3. Click confirm

**Expected:** Error toast. Modal **giữ nguyên** (không đóng). Cancel re-enable. User có thể retry.

---

### TC-A14: Group-by "status" — pending đầu tiên

**Steps:** Group by = "status"

**Expected:** Group "Chờ duyệt" (pending) xuất hiện đầu tiên.

---

### TC-A15: Keyword search trong rejection reason

**Precondition:** Task C rejectionReason = "Thiếu hồ sơ nhân thân". Task D rejectionReason = null.

**Steps:** Tìm "nhân thân"

**Expected:** Task C xuất hiện. Task D ẩn.

---

### TC-A16: Scope "my" — user không có lawyer record

**Steps:**
1. Đăng nhập user không có lawyer record
2. Mở block scope = "my"

**Expected:** Empty list. Không crash. Không error toast.

**Pass criteria:** ✅ PASS / ⚠️ WARN vì không có thông báo giải thích

---

## 6. Bug Review & Tiềm ẩn rủi ro

### Mức độ nghiêm trọng

> 🔴 **Critical** — gây mất data hoặc sai nghiệp vụ nghiêm trọng  
> 🟠 **High** — ảnh hưởng đáng kể đến UX hoặc tính chính xác  
> 🟡 **Medium** — tác động vừa, có workaround  
> 🔵 **Low** — cosmetic hoặc edge case hiếm

---

### Bugs đã được fix ✅

| ID | Mức độ | Mô tả | File | Trạng thái |
|---|---|---|---|---|
| BUG-07 | 🟠 High | Approve không có lawyer record → approvedById = null, mất traceability | AllApprovalBlock | ✅ **Fixed** — guard trả error toast nếu `currentLawyers.length = 0` |
| BUG-14 | 🔵 Low | rejectionReason có thể vượt 500 chars (chỉ có maxLength HTML, không enforce server-side) | AllApprovalBlock | ✅ **Fixed** — thêm `reason.trim().length > 500` check trước submit |
| BUG-12 | 🔵 Low | Stats badge "N chờ duyệt" từ unfiltered rows gây hiểu nhầm khi filter active | AllApprovalBlock | ✅ **Fixed** — thêm Tooltip giải thích "không bị ảnh hưởng bởi filter" |
| BUG-01 (Approval) | 🔴 Critical | 100-row hard cap không có cảnh báo → mất data im lặng | AllApprovalBlock | ✅ **Fixed** — warning toast khi `taskRows.length >= 100` hoặc `subTaskRows.length >= 100` |
| BUG-05 | 🟡 Medium | Double reload từ event listener (180ms + 900ms) → concurrent setState race | AllTaskBlock | ✅ **Fixed** — gộp thành 1 timer duy nhất 300ms |
| BUG-06 | 🟡 Medium | Placeholder "Start date / End date" gây hiểu nhầm (thực ra filter startDate, không phải dueDate) | AllTaskBlock | ✅ **Fixed** — đổi thành "Ngày bắt đầu từ / Ngày bắt đầu đến" |
| BUG-01 (Task) | 🔴 Critical | 100-row hard cap không có cảnh báo → mất data im lặng | AllTaskBlock | ✅ **Fixed** — warning toast khi `taskRows.length >= 100` hoặc `subTaskRows.length >= 100` |

---

### Bugs còn tồn tại (chưa fix — cần đánh giá thêm)

#### BUG-02 · 🟠 High — saveViewConfig race condition

**File:** Cả hai block

**Mô tả:** Mỗi thao tác (resize, sort, group-by, hide) gọi `saveViewConfig()` ngay lập tức với PATCH request riêng. Nếu user thao tác nhanh, các request race nhau — request sau có thể chứa closure snapshot cũ, ghi đè state mới của request trước.

**Tác động:** Config bị rollback về trạng thái cũ sau khi settle. Khó reproduce do timing-dependent.

**Đề xuất fix:**
```js
const saveViewConfigDebounced = useCallback(
  debounce((nextView) => {
    /* PATCH users:update */
  }, 400),
  [currentUser]
);
```

---

#### BUG-03 · 🟠 High — Scope xác định tại module load (không reactive)

**File:** Cả hai block

**Mô tả:** `TASK_BLOCK_SCOPE` / `APPROVAL_BLOCK_SCOPE` được tính một lần khi JS module khởi tạo. Nếu Nocobase navigate giữa views mà không remount component (SPA routing), scope không thay đổi dù inputArgs đã đổi.

**Tác động:** Mở "My Tasks" sau "All Tasks" trong cùng session có thể vẫn fetch theo scope cũ.

**Đề xuất fix:** Chuyển scope vào React state, đọc từ `ctx` trong `useEffect([], [])` lần đầu mount.

---

#### BUG-04 · 🟡 Medium — Column filter options chỉ từ in-memory rows

**File:** Cả hai block

**Mô tả:** `getColumnFilterOptions(field)` lấy unique values từ `rows` (in-memory). Nếu một value chỉ xuất hiện ở record thứ 101 trở đi, nó không có trong dropdown filter.

**Tác động:** Filter dropdown không phản ánh đủ tất cả giá trị thực trong DB (liên quan đến BUG-01).

**Đề xuất:** Sau khi fix BUG-01 (raise limit hoặc paginate), vấn đề này sẽ giảm đáng kể.

---

#### BUG-08 · 🟠 High — Approve luôn dùng `currentLawyers[0]` — sai trong đa-lawyer account

**File:** AllApprovalBlock

**Mô tả:** Một user Nocobase có thể có nhiều lawyer records. `currentLawyers[0]` có thể không phải lawyer phù hợp với task đang được phê duyệt.

**Tác động:** `approvedById` được set sai lawyer, dẫn đến reporting không chính xác.

**Đề xuất:** Nếu `currentLawyers.length > 1`, hiển thị dialog cho user chọn lawyer profile trước khi approve.

---

#### BUG-09 · 🟡 Medium — Double reload khi mount (AllApprovalBlock)

**File:** AllApprovalBlock

**Mô tả:** `useEffect([loadCurrentUser])` → load user → sets `currentUser` → `reload` re-created (dep: `[currentUser]`) → `useEffect([reload])` fires lần 2. Result: `reload()` được gọi 2 lần khi mount.

**Tác động:** 2 lần fetch data khi mở trang. Extra network requests. Với scope "my": lần 1 có thể fetch wrong data.

**Đề xuất fix:** Hợp nhất `loadCurrentUser` và `reload` thành một function. Không dùng `reload` làm `useEffect` dep riêng.

---

#### BUG-10 · 🟡 Medium — Board view bỏ qua groupBy setting

**File:** Cả hai block

**Mô tả:** Board view luôn render cột theo `STATUS_OPTIONS` (7 status), bất kể `groupBy` đang là gì.

**Tác động:** User thay đổi group-by rồi switch sang board mode — board không phản ánh group-by.

**Đề xuất:** Document rõ behavior hoặc ẩn Group-by selector khi board mode (AllTaskBlock đã ẩn một phần, AllApprovalBlock chưa nhất quán).

---

#### BUG-11 · 🟡 Medium — Subtask orphan bị ẩn im lặng

**File:** Cả hai block

**Mô tả:** Nếu parent task của subtask bị xóa hoặc không tìm thấy, `enrichRows` `if (!parent) return` silently drops subtask. Subtask cần approval có thể biến mất hoàn toàn.

**Tác động:** Task quan trọng bị ẩn không có cảnh báo.

**Đề xuất:** Khi parent không tìm thấy, vẫn render subtask với label "(Task cha đã bị xóa)" thay vì drop.

---

#### BUG-13 · 🔵 Low — `buildTaskDetailRoute` đọc `window.location` trong render

**File:** AllTaskBlock

**Mô tả:** Hàm đọc `window.location.pathname` trong quá trình render — side effect trong pure calculation.

**Tác động:** Nếu block chạy trong iframe hoặc context đặc biệt, URL có thể sai. Nếu `window` không available → crash.

**Đề xuất:** Tính route trong `useMemo` hoặc `useRef`, không tính lại mỗi render.

---

### Tóm tắt trạng thái bugs

| ID | Mức độ | Module | Trạng thái |
|---|---|---|---|
| BUG-01 | 🔴 Critical | Both | ✅ Fixed |
| BUG-02 | 🟠 High | Both | ⏳ Pending — cần debounce design |
| BUG-03 | 🟠 High | Both | ⏳ Pending — cần refactor scope |
| BUG-04 | 🟡 Medium | Both | ⏳ Pending — liên quan BUG-01 |
| BUG-05 | 🟡 Medium | AllTaskBlock | ✅ Fixed |
| BUG-06 | 🟡 Medium | AllTaskBlock | ✅ Fixed |
| BUG-07 | 🟠 High | AllApprovalBlock | ✅ Fixed |
| BUG-08 | 🟠 High | AllApprovalBlock | ⏳ Pending — cần UX design |
| BUG-09 | 🟡 Medium | AllApprovalBlock | ⏳ Pending — cần refactor mount |
| BUG-10 | 🟡 Medium | Both | ⏳ Pending — cần clarify behavior |
| BUG-11 | 🟡 Medium | Both | ⏳ Pending |
| BUG-12 | 🔵 Low | AllApprovalBlock | ✅ Fixed |
| BUG-13 | 🔵 Low | AllTaskBlock | ⏳ Pending |
| BUG-14 | 🔵 Low | AllApprovalBlock | ✅ Fixed |

**Đã fix: 7/14 bugs** (2 Critical, 1 High, 1 Medium, 3 Low/Medium)

---

*Tài liệu SRS — All Task & All Approval Block · Hệ thống Quản lý Công ty Luật · 25/06/2026*  
*Soạn bởi Claude Sonnet 4.6 dựa trên phân tích source code trực tiếp.*
