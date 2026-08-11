# Software Requirements Specification

## 1. Mục Đích Tài Liệu

Tài liệu SRS này mô tả yêu cầu phần mềm cho hệ thống quản lý vận hành công ty luật được xây dựng trên NocoBase. Tài liệu dùng cho các mục đích:

- Thống nhất phạm vi sản phẩm giữa chủ sở hữu nghiệp vụ, người dùng nội bộ, đội phát triển và đội kiểm thử.
- Mô tả các module chính: CRM, Case, Task, Approval, Calendar/Meeting, Quotation, Contract, Payment, Document, Project Internal, Note/Activity.
- Đặc tả yêu cầu chức năng, dữ liệu, quyền truy cập, tích hợp, hành vi hệ thống và tiêu chí nghiệm thu.
- Làm nền để viết test case, backlog, tài liệu vận hành và tài liệu hướng dẫn người dùng.

Tài liệu này mô tả hệ thống đang được phát triển trong NocoBase bằng JS Block, JS Field, React, Ant Design và API collection của NocoBase. Một số mục được đánh dấu `Roadmap` là năng lực nên có trong tương lai nhưng chưa khẳng định đã hoàn thiện trong code hiện tại.

---

## 2. Bối Cảnh Và Mục Tiêu Sản Phẩm

Hệ thống phục vụ vận hành công ty luật, từ giai đoạn tiếp nhận lead/khách hàng, báo giá, hợp đồng, mở vụ việc, phân công công việc, quản lý lịch họp, quản lý tài liệu, theo dõi phê duyệt, ghi nhận thanh toán và lưu vết hoạt động.

Mục tiêu sản phẩm:

- Tập trung dữ liệu khách hàng, vụ việc, hợp đồng, báo giá, task, lịch họp và tài liệu vào một nền tảng.
- Giảm nhập liệu lặp lại bằng cách liên kết xuyên suốt giữa quotation, contract, case, task, meeting, document và payment.
- Hỗ trợ luật sư và nhân sự vận hành theo dõi công việc theo bảng, kanban, roadmap, calendar và danh sách phê duyệt.
- Đảm bảo dữ liệu có ngữ cảnh pháp lý: công ty nội bộ, khách hàng, luật sư phụ trách, dịch vụ pháp lý, tình trạng phê duyệt, tài chính và hồ sơ tài liệu.
- Tạo nền tảng cho các workflow tự động: tạo task từ template, log activity, tạo folder tài liệu, sinh file DOCX/PDF, thông báo, đồng bộ lịch trong tương lai.

---

## 3. Phạm Vi Hệ Thống

### 3.1 Trong Phạm Vi

- Quản lý khách hàng, lead và quan hệ với vụ việc.
- Quản lý báo giá, dịch vụ báo giá, trạng thái báo giá và xuất file báo giá.
- Quản lý hợp đồng, dịch vụ hợp đồng, lịch thanh toán và xuất file hợp đồng.
- Tạo case/vụ việc từ khách hàng, quotation, contract hoặc nhập thủ công.
- Quản lý dịch vụ pháp lý theo công ty nội bộ.
- Quản lý task, subtask, assignee, approval, trạng thái, ngày bắt đầu, ngày đến hạn, waiting issue.
- Quản lý meeting/calendar, host, attendees, related case, quotation, contract, location/link, type.
- Quản lý tài liệu, thư viện, legal reference, legal study, internal templates, khôi phục tài liệu, activity log tài liệu.
- Quản lý payment theo invoice, contract hoặc manual payment.
- Ghi chú và activity timeline liên quan tới case/project/task/document.
- Bộ lọc JS Field cho lead/project/status/legal reference/legal study.
- Audit/activity log ở mức database trigger cho các collection quan trọng.

### 3.2 Ngoài Phạm Vi Hiện Tại

- Cổng khách hàng bên ngoài cho client tự đăng nhập.
- Tích hợp Google Calendar tự động bằng OAuth production.
- Ký điện tử, thanh toán online thực tế, trust accounting đầy đủ.
- Mobile app native.
- AI legal assistant production.
- Billing theo giờ đầy đủ, time tracking và expense claim hoàn chỉnh.

Các mục ngoài phạm vi có thể được đưa vào roadmap sau khi đặc tả dữ liệu, bảo mật và tích hợp được chốt.

---

## 4. Kiến Trúc Tổng Quan

### 4.1 Nền Tảng

Hệ thống chạy trên NocoBase, sử dụng:

- NocoBase collections làm data model chính.
- JS Block và JS Field để xây dựng UI nghiệp vụ tùy chỉnh.
- `ctx.api.request()` để gọi API collection dạng `collection:list`, `collection:get`, `collection:create`, `collection:update`, `collection:destroy`.
- React và Ant Design từ runtime `ctx`.
- SQL trigger/function trong thư mục `pgsql` để tự động hóa một số hoạt động dữ liệu.
- Document generator bằng JavaScript cho DOCX/PDF trong các module quotation, contract, invoice, payroll.

### 4.2 Luồng Dữ Liệu Chính

1. Lead hoặc Customer được tạo trong CRM.
2. User tạo Quotation từ khách hàng, công ty nội bộ, luật sư và danh sách dịch vụ.
3. Quotation có thể được phê duyệt, xuất file và chuyển sang Contract.
4. Contract có thể có lịch thanh toán và danh sách dịch vụ hợp đồng.
5. Case được tạo từ Customer, Quotation, Contract hoặc nhập thủ công.
6. Case sinh hoặc liên kết Project Services, Task, Folder, Document, Note.
7. Task được quản lý trong All Task/My Task/Kanban/Roadmap và Approval.
8. Meeting liên kết Case/Quotation/Contract và có host/attendees.
9. Payment ghi nhận thanh toán theo Invoice, Contract hoặc thủ công.
10. Activity log ghi lại thay đổi quan trọng để truy vết.

---

## 5. Nhóm Người Dùng Và Vai Trò

| Vai trò | Mục tiêu | Quyền chính |
|---|---|---|
| Administrator | Cấu hình hệ thống, quản lý dữ liệu và quyền | Toàn quyền, cấu hình collection, user, workflow |
| Managing Partner | Theo dõi vụ việc, doanh thu, workload, phê duyệt | Xem dashboard, case, quotation, contract, approval, finance |
| Lawyer | Xử lý vụ việc, task, meeting, tài liệu | Xem/cập nhật case được phân công, task, meeting, document |
| Legal Assistant | Hỗ trợ vận hành vụ việc, chuẩn bị hồ sơ | Tạo/cập nhật case, task, document, meeting theo phạm vi |
| Accounting | Theo dõi thanh toán và chứng từ tài chính | Payment, invoice, contract payment schedule, báo cáo tài chính |
| Approver | Phê duyệt task hoặc báo giá/hợp đồng theo quy trình | Xem danh sách cần phê duyệt, approve/reject |
| Document Manager | Quản lý thư viện, folder, template, chia sẻ tài liệu | Upload, restore, share, quản lý metadata tài liệu |
| Viewer | Chỉ xem dữ liệu theo phân quyền | Read-only theo module được cấp |

Business rule:

- User hệ thống có `id = 1` không được hiển thị như luật sư/assignee thông thường trong các picker nghiệp vụ.
- Một user có thể liên kết với một lawyer record.
- Quyền hiển thị dữ liệu phải xét theo role, lawyer assignment, internal company và record scope.

---

## 6. Module Chức Năng

### 6.1 Dashboard

Mục tiêu: Cung cấp màn hình tổng quan cho người dùng nội bộ.

Yêu cầu chức năng:

| ID | Yêu cầu |
|---|---|
| FR-DASH-01 | Hiển thị các chỉ số tổng quan về case, task, meeting, finance và document theo quyền người dùng. |
| FR-DASH-02 | Cho phép drill-down từ chỉ số sang danh sách dữ liệu tương ứng. |
| FR-DASH-03 | Hỗ trợ refresh dữ liệu theo block hoặc toàn trang. |
| FR-DASH-04 | Roadmap: cấu hình widget dashboard theo từng vai trò. |

### 6.2 CRM, Lead Và Customer

Mục tiêu: Quản lý nguồn khách hàng, thông tin khách hàng và liên kết với quotation/case.

Yêu cầu chức năng:

| ID | Yêu cầu |
|---|---|
| FR-CRM-01 | Tạo và cập nhật lead/customer với thông tin liên hệ, nguồn, trạng thái và ghi chú. |
| FR-CRM-02 | Filter lead/project theo internal company, user/lawyer, status và overdue thông qua JS Field. |
| FR-CRM-03 | Customer có thể là cá nhân hoặc công ty. |
| FR-CRM-04 | Customer được liên kết với quotation, contract, case, document, note và payment. |
| FR-CRM-05 | Khi tạo case/quotation/contract từ customer, form phải nhận context customer nếu được truyền qua popup. |
| FR-CRM-06 | Roadmap: conflict check khách hàng trước khi nhận vụ việc. |

### 6.3 Quotation

Mục tiêu: Quản lý báo giá dịch vụ pháp lý và tạo tài liệu báo giá.

Yêu cầu chức năng:

| ID | Yêu cầu |
|---|---|
| FR-QT-01 | Tạo quotation với internal company, customer/lead, lawyer, template, payment terms, trạng thái và mô tả. |
| FR-QT-02 | Quotation chứa danh sách dịch vụ, giá, VAT, subtotal, total amount và scope note. |
| FR-QT-03 | Hỗ trợ pricing mode: line pricing và package pricing. |
| FR-QT-04 | Hỗ trợ approval flag `isRequiredApproval` và người phê duyệt `approvedById` khi cần. |
| FR-QT-05 | Có thể sinh file DOCX/PDF báo giá từ template và snapshot nội dung. |
| FR-QT-06 | Quotation liên kết với contract, case, task, meeting, document và payment context. |
| FR-QT-07 | Khi đóng form tạo nếu có thay đổi chưa lưu, hệ thống phải hỏi xác nhận trước khi thoát. |
| FR-QT-08 | Internal company của quotation không được bị mất khi update dữ liệu liên quan. |

### 6.4 Contract

Mục tiêu: Quản lý hợp đồng dịch vụ pháp lý và lịch thanh toán.

Yêu cầu chức năng:

| ID | Yêu cầu |
|---|---|
| FR-CT-01 | Tạo contract từ customer, quotation hoặc nhập thủ công. |
| FR-CT-02 | Contract lưu internal company, customer, lawyer, contract code/name, giá trị hợp đồng, trạng thái và mô tả. |
| FR-CT-03 | Contract chứa danh sách dịch vụ hợp đồng, giá, VAT, billing mode và pricing mode. |
| FR-CT-04 | Hỗ trợ lịch thanh toán theo installment: số đợt, ngày dự kiến, số tiền, tỷ lệ và trạng thái. |
| FR-CT-05 | Hỗ trợ xuất DOCX/PDF hợp đồng. |
| FR-CT-06 | Contract liên kết với case, quotation, payment, meeting, document và task. |
| FR-CT-07 | Khi đóng form tạo nếu có thay đổi chưa lưu, hệ thống phải hỏi xác nhận trước khi thoát. |
| FR-CT-08 | Internal company/customer của contract không được bị null do update quan hệ. |

### 6.5 Case/Vụ Việc

Mục tiêu: Mở và quản lý vụ việc pháp lý cho khách hàng.

Yêu cầu chức năng:

| ID | Yêu cầu |
|---|---|
| FR-CASE-01 | Tạo case với internal company, customer, case name/code, date, deadline, priority, project manager, lawyers và description. |
| FR-CASE-02 | Case có thể liên kết quotation và contract; nếu chọn liên kết thì load danh sách dịch vụ từ nguồn tương ứng. |
| FR-CASE-03 | Khi đổi internal company, hệ thống phải clear contract, quotation và service rows không còn hợp lệ. |
| FR-CASE-04 | Service picker chỉ hiển thị dịch vụ thuộc đúng internal company đang chọn. |
| FR-CASE-05 | Case services hỗ trợ line billable, included in package, bill separately và scope only. |
| FR-CASE-06 | Tạo case có thể sinh project services, quotation services, contract services theo source và pricing mode. |
| FR-CASE-07 | Tạo case có thể tạo folder tài liệu mặc định và liên kết document scope. |
| FR-CASE-08 | Case có notes, activity tab, related documents, tasks, meetings, quotations, contracts và payments. |
| FR-CASE-09 | Khi đóng form tạo nếu có thay đổi chưa lưu, hệ thống phải hỏi xác nhận trước khi thoát. |
| FR-CASE-10 | Tạo case không được cho phép thiếu internal company, customer hoặc thông tin bắt buộc. |

### 6.6 Project Internal

Mục tiêu: Quản lý dự án nội bộ không nhất thiết gắn với khách hàng/vụ việc pháp lý.

Yêu cầu chức năng:

| ID | Yêu cầu |
|---|---|
| FR-PI-01 | Tạo và quản lý project internal với internal company, manager, assignees, start date, deadline, closed date và trạng thái. |
| FR-PI-02 | Task có thể group/filter theo project internal. |
| FR-PI-03 | Activity log phải ghi nhận thay đổi trên project internal và các entity con liên quan. |
| FR-PI-04 | Document/folder có thể gắn với project internal. |

### 6.7 Task Và Subtask

Mục tiêu: Quản lý công việc pháp lý, công việc nội bộ và luồng phê duyệt.

Yêu cầu chức năng:

| ID | Yêu cầu |
|---|---|
| FR-TASK-01 | Tạo task với title, status, assignees/lawyer, start date, due date, description, priority và related case/project service/project internal. |
| FR-TASK-02 | Khi tạo task từ calendar, assignee mặc định là current user/lawyer. |
| FR-TASK-03 | All Task hỗ trợ table, board/kanban và roadmap/gantt. |
| FR-TASK-04 | Filter theo case, assignee, status, waiting issue, keyword và date range. |
| FR-TASK-05 | Group by theo case, service, status, assignee, start, due, waiting, next step, updated, closed date và project internal. |
| FR-TASK-06 | Khi group by case thì chỉ nhóm theo case; không trộn project internal vào nhóm case. Tương tự cho các group by khác. |
| FR-TASK-07 | Cho phép xóa task đơn lẻ và bulk select để xóa nhiều task. |
| FR-TASK-08 | Task detail phải cập nhật realtime hoặc gần realtime về danh sách sau khi thay đổi. |
| FR-TASK-09 | Subtask phải hiển thị parent task và có thể được kéo thả/cập nhật trạng thái tùy view. |
| FR-TASK-10 | Task có thể được tạo tự động từ template khi tạo case/project nếu workflow được bật. |

### 6.8 Approval

Mục tiêu: Quản lý danh sách công việc hoặc yêu cầu cần phê duyệt.

Yêu cầu chức năng:

| ID | Yêu cầu |
|---|---|
| FR-APP-01 | All Approval hiển thị task/subtask cần phê duyệt theo quyền người dùng. |
| FR-APP-02 | Cho phép approve hoặc reject các item đang chờ duyệt. |
| FR-APP-03 | Reject phải yêu cầu nhập lý do từ chối. |
| FR-APP-04 | Hỗ trợ filter và group by tương tự All Task, bao gồm project internal. |
| FR-APP-05 | Cập nhật approval phải ghi lại trạng thái, người duyệt và thời điểm liên quan. |

### 6.9 Calendar Và Meeting

Mục tiêu: Quản lý lịch họp, lịch công việc và agenda liên quan tới vụ việc.

Yêu cầu chức năng:

| ID | Yêu cầu |
|---|---|
| FR-MTG-01 | Calendar hiển thị meeting/task theo month, week, day và list view. |
| FR-MTG-02 | Tạo calendar item với record type Meeting hoặc Task. |
| FR-MTG-03 | Meeting có title, date time, case, quotation, contract, status, agenda/description, location/link và type. |
| FR-MTG-04 | Meeting có host mặc định là current user và cho phép đổi sang user khác. |
| FR-MTG-05 | Attendees cho phép chọn nhiều user; user đang là host phải bị ẩn khỏi attendees để tránh conflict. |
| FR-MTG-06 | Task tạo từ calendar có assignee mặc định là current user. |
| FR-MTG-07 | Khi đóng form tạo nếu có thay đổi chưa lưu, hệ thống phải hỏi xác nhận trước khi thoát. |
| FR-MTG-08 | Có thể tạo file ICS hoặc mở Google Calendar form như trải nghiệm thử nghiệm. |
| FR-MTG-09 | Roadmap: tự đồng bộ Google Calendar qua OAuth sau khi chốt Google Client ID, consent screen và backend/token strategy. |

### 6.10 Document Management

Mục tiêu: Quản lý tài liệu pháp lý, thư viện, template, folder, chia sẻ và khôi phục.

Yêu cầu chức năng:

| ID | Yêu cầu |
|---|---|
| FR-DOC-01 | Quản lý document theo folder và metadata. |
| FR-DOC-02 | Hỗ trợ upload file, preview/download, đổi tên, di chuyển, xóa mềm và khôi phục. |
| FR-DOC-03 | Document có thể liên kết trực tiếp tới customer, case/project, task, subtask, quotation, contract, payment, legal reference, internal template và project internal. |
| FR-DOC-04 | Tự động xác định document type dựa trên collection liên kết hoặc direct relation field. |
| FR-DOC-05 | Hỗ trợ thư viện tài liệu chung, case document, customer document, project document, legal study document, legal reference document và internal templates. |
| FR-DOC-06 | Hỗ trợ folder manager/member và phân quyền chia sẻ tài liệu theo lawyer/user. |
| FR-DOC-07 | Activity log ghi nhận upload, update, share, delete, restore và thay đổi metadata. |
| FR-DOC-08 | Roadmap: full-text search nội dung file, versioning và e-signature. |

### 6.11 Notes Và Activity Log

Mục tiêu: Ghi nhận diễn biến công việc và lịch sử thay đổi.

Yêu cầu chức năng:

| ID | Yêu cầu |
|---|---|
| FR-ACT-01 | Cho phép tạo note gắn với case, task, subtask, document hoặc collection liên quan. |
| FR-ACT-02 | Note hỗ trợ upload attachment nếu runtime cho phép. |
| FR-ACT-03 | Activity tab hiển thị timeline các thay đổi chính. |
| FR-ACT-04 | Database trigger ghi activity khi tạo, cập nhật hoặc xóa record quan trọng. |
| FR-ACT-05 | Activity log phải resolve display label cho relation như customer, project, task, quotation, contract, folder, lawyer. |

### 6.12 Payment Và Finance

Mục tiêu: Ghi nhận thanh toán và theo dõi nghĩa vụ tài chính liên quan tới hợp đồng/hóa đơn.

Yêu cầu chức năng:

| ID | Yêu cầu |
|---|---|
| FR-PAY-01 | Tạo payment theo invoice, contract hoặc manual. |
| FR-PAY-02 | Khi chọn contract, hệ thống load context customer, internal company, lawyer và các payment đã có. |
| FR-PAY-03 | Contract có lịch installment thì payment phải chọn installment, tính planned/received/remaining. |
| FR-PAY-04 | Không cho nhập số tiền thanh toán vượt remaining amount của invoice/contract/installment. |
| FR-PAY-05 | Payment status được suy luận: Received, Partial, Pending, Planned, Cancelled tùy amount và remaining. |
| FR-PAY-06 | Chống trùng payment bằng source key cho invoice/manual/contract/installment. |
| FR-PAY-07 | Khi đóng form tạo nếu có thay đổi chưa lưu, hệ thống phải hỏi xác nhận trước khi thoát. |
| FR-PAY-08 | Roadmap: payment receipt PDF, reconciliation, online payment gateway. |

### 6.13 Reference Và Legal Study

Mục tiêu: Quản lý nguồn tham khảo pháp lý, nghiên cứu pháp lý và tài liệu nội bộ.

Yêu cầu chức năng:

| ID | Yêu cầu |
|---|---|
| FR-REF-01 | Legal reference/document có thể được liên kết tới case, task hoặc tài liệu. |
| FR-REF-02 | Legal study document hỗ trợ quản lý file nghiên cứu và metadata. |
| FR-REF-03 | JS Field link giúp mở nhanh legal reference/legal study từ record hiện tại. |
| FR-REF-04 | Roadmap: phân loại theo lĩnh vực pháp lý, tag, jurisdiction, effective date và search nâng cao. |

---

## 7. Đặc Tả Dữ Liệu Chính

### 7.1 Collections Trọng Yếu

| Collection | Vai trò |
|---|---|
| `users` | Tài khoản người dùng, cấu hình view, thông tin đăng nhập |
| `lawyers` | Hồ sơ luật sư, liên kết user, loại luật sư, đơn giá |
| `internalCompany` | Công ty nội bộ/pháp nhân vận hành |
| `customers` | Khách hàng cá nhân/công ty |
| `leads` | Khách hàng tiềm năng |
| `quotations` | Báo giá |
| `quotationServices` | Dịch vụ trong báo giá |
| `contracts` | Hợp đồng |
| `contractServices` | Dịch vụ trong hợp đồng |
| `payments` | Thanh toán |
| `invoices` | Hóa đơn, nếu collection được bật |
| `projects` | Case/vụ việc |
| `projectServices` | Dịch vụ của case |
| `projectInternal` | Dự án nội bộ |
| `tasks` | Task chính |
| `subTasks` | Subtask |
| `meetings` | Lịch họp |
| `meetingAttendees` | Người tham dự meeting |
| `documents` | Tài liệu/file |
| `folders` | Cấu trúc thư mục |
| `notes` | Ghi chú |
| `activity_log` | Lịch sử hoạt động |
| `companyServices` | Danh mục dịch vụ theo internal company |

### 7.2 Quan Hệ Dữ Liệu Chính

- `internalCompany` có nhiều customers, quotations, contracts, projects, projectInternal, companyServices.
- `customers` có nhiều quotations, contracts, projects, payments, documents.
- `quotations` có nhiều quotationServices và có thể liên kết contract/case.
- `contracts` có nhiều contractServices, payment schedule và payments.
- `projects` đại diện cho case, có projectServices, tasks, meetings, notes, documents.
- `projectInternal` có tasks, documents, folders, activity log.
- `tasks` có subTasks, assignees/lawyer, documents, notes và approval state.
- `meetings` liên kết case, quotation, contract, host và attendees.
- `documents` có thể dùng relation trực tiếp hoặc cặp `collectionName`/`recordId` để gắn với record nghiệp vụ.

### 7.3 Quy Tắc Dữ Liệu

| ID | Quy tắc |
|---|---|
| BR-DATA-01 | Mọi record nghiệp vụ tài chính/pháp lý nên có `internalCompanyId` nếu thuộc một pháp nhân nội bộ. |
| BR-DATA-02 | Service picker chỉ lấy `companyServices` khớp internal company hiện tại. |
| BR-DATA-03 | Không hiển thị user hệ thống `id = 1` trong danh sách luật sư/assignee/attendee nghiệp vụ. |
| BR-DATA-04 | Khi chọn host meeting, host không được xuất hiện trong attendees. |
| BR-DATA-05 | Khi đổi internal company trong form case, phải reset các liên kết contract/quotation/service đã chọn. |
| BR-DATA-06 | Payment không được vượt remaining amount và không được trùng source key. |
| BR-DATA-07 | Quotation/Contract không được mất `internalCompanyId` khi update relation. |
| BR-DATA-08 | Delete tài liệu ưu tiên xóa mềm nếu module restore đang dùng. |
| BR-DATA-09 | Activity log phải lưu actor, thời điểm, field, old value, new value và record liên quan khi có thể. |

---

## 8. Yêu Cầu Giao Diện Và Trải Nghiệm

### 8.1 Nguyên Tắc UI

- Giao diện dùng React và Ant Design trong runtime NocoBase.
- Form create/edit cần có loading, validation, submit state và thông báo lỗi rõ ràng.
- Picker quan hệ cần hỗ trợ search, clear, label dễ hiểu và subtitle nếu cần.
- Modal create form cần confirm exit khi có thay đổi chưa lưu.
- Table nghiệp vụ cần hỗ trợ filter, sort, group, resize/reorder/hide column khi phù hợp.
- Các form phức tạp phải reset dữ liệu phụ thuộc khi field cha thay đổi, ví dụ internal company hoặc customer.

### 8.2 Confirm Exit

Áp dụng cho:

- Case create form.
- Contract create form.
- Quotation create form.
- Payment create block.
- Meeting create form.

Yêu cầu:

- Nếu form chưa dirty, đóng bình thường.
- Nếu form dirty, hiển thị confirm trước khi đóng.
- Submit thành công phải clear dirty để close không hỏi lại.
- Các đường đóng từ modal/popup/drawer/onClose/Cancel đều phải đi qua cùng một guard.

---

## 9. Yêu Cầu Phi Chức Năng

### 9.1 Bảo Mật

| ID | Yêu cầu |
|---|---|
| NFR-SEC-01 | Tất cả API call phải chạy trong context NocoBase và tôn trọng permission của user hiện tại. |
| NFR-SEC-02 | Dữ liệu case, document, finance và client phải được giới hạn theo role/scope. |
| NFR-SEC-03 | Activity log không được ghi lộ dữ liệu nhạy cảm quá mức nếu user không có quyền xem. |
| NFR-SEC-04 | Roadmap: bật MFA/SSO, session timeout và audit export theo chính sách firm. |

### 9.2 Hiệu Năng

| ID | Yêu cầu |
|---|---|
| NFR-PERF-01 | Các block danh sách nên load trong vòng 2-4 giây với dữ liệu vừa phải. |
| NFR-PERF-02 | API list phải có `pageSize`, `page`, filter và sort rõ ràng. |
| NFR-PERF-03 | Các dropdown lớn cần search client-side hoặc server-side và tránh render quá nhiều item không cần thiết. |
| NFR-PERF-04 | Dashboard/document/task list cần tránh gọi API lặp vô hạn khi state thay đổi. |

### 9.3 Độ Tin Cậy

| ID | Yêu cầu |
|---|---|
| NFR-REL-01 | Submit form phải có loading/saving state để chống double submit. |
| NFR-REL-02 | Khi một bước tạo dữ liệu phụ thất bại, hệ thống phải báo lỗi rõ và không âm thầm bỏ qua dữ liệu quan trọng. |
| NFR-REL-03 | Các trigger SQL quan trọng phải có rollback strategy trước khi áp dụng production. |
| NFR-REL-04 | Các form tạo record phải validate required fields trước khi gọi API. |

### 9.4 Khả Năng Bảo Trì

| ID | Yêu cầu |
|---|---|
| NFR-MAIN-01 | Mỗi JS Block nên tự chứa helper cần thiết nhưng tránh trùng logic quá mức giữa các module. |
| NFR-MAIN-02 | Tên collection/field phải được ghi chú trong SRS hoặc schema mapping. |
| NFR-MAIN-03 | Các view UID/popup UID cần được quản lý trong cấu hình rõ ràng. |
| NFR-MAIN-04 | Mọi thay đổi behavior quan trọng cần cập nhật SRS/changelog tương ứng. |

---

## 10. Tích Hợp

### 10.1 NocoBase API

- Dạng API chính: `collection:list`, `collection:get`, `collection:create`, `collection:update`, `collection:destroy`.
- Filter dùng JSON string, ví dụ `{ field: { $eq: value } }`.
- Relation filter có thể dùng `{ relationField: { id: { $eq: recordId } } }` nếu không có scalar foreign key.
- Runtime lấy user hiện tại qua `auth:check`.

### 10.2 Document Generation

- Quotation, Contract, Invoice, Payment/Payroll có thể sinh DOCX/PDF bằng block/generator riêng.
- Tài liệu sinh ra cần được lưu vào `documents` và liên kết đúng collection nguồn.

### 10.3 Calendar Integration

Hiện tại:

- Có trải nghiệm tạo meeting/task trong calendar.
- Có thể mở Google Calendar form hoặc tạo ICS ở mức thử nghiệm.

Roadmap:

- Đồng bộ Google Calendar tự động cần Google Cloud project, OAuth consent screen, Client ID, redirect URI, token storage và backend bảo mật.
- Không khuyến nghị triển khai toàn bộ OAuth/token sync chỉ ở frontend vì rủi ro bảo mật và khó refresh token ổn định.

### 10.4 Database Automation

Các SQL trong `pgsql` hỗ trợ:

- Tự động tạo task từ template.
- Bảo vệ relational fields trên quotation/contract.
- Ghi activity log cho project internal, documents, folders, document shares và record changes.
- Resolve display value/label cho activity log.
- Tự động set document type.

---

## 11. Workflow Nghiệp Vụ Tiêu Biểu

### 11.1 Tạo Case Từ Quotation/Contract

1. User mở Case Create Form.
2. Chọn internal company.
3. Chọn customer.
4. Hệ thống lọc quotation/contract theo customer và internal company.
5. User chọn quotation hoặc contract.
6. Hệ thống load services từ nguồn đã chọn.
7. User điều chỉnh service rows, lawyer, deadline, pricing mode.
8. Submit tạo case, project services, liên kết tài liệu/folder nếu có.
9. Hệ thống hiển thị success và đóng popup.

Acceptance:

- Không thấy service của internal company khác.
- Đổi internal company phải clear dữ liệu phụ thuộc.
- Không mất dữ liệu nếu user vô tình đóng form, phải có confirm exit.

### 11.2 Tạo Meeting

1. User mở calendar và chọn tạo item.
2. Chọn record type Meeting.
3. Host mặc định là current user.
4. User chọn related case/quotation/contract.
5. User nhập title, thời gian, location/link, type, agenda.
6. User chọn attendees, danh sách không bao gồm host.
7. Submit tạo meeting và attendee records.

Acceptance:

- Host có thể đổi.
- Attendees tự loại host.
- Related quotation/contract có search/select đầy đủ.

### 11.3 Quản Lý Task Và Approval

1. User mở All Task hoặc My Task.
2. Filter theo case, assignee, status, waiting issue, date hoặc keyword.
3. Group theo case/project internal/service/status tùy nhu cầu.
4. User mở task detail, cập nhật trạng thái hoặc xóa task.
5. Nếu task cần approval, xuất hiện trong All Approval.
6. Approver approve hoặc reject kèm lý do.

Acceptance:

- Group by chỉ nhóm theo field đã chọn.
- Bulk delete xóa đúng task đã chọn.
- Approval update đúng status và không ảnh hưởng task không được chọn.

### 11.4 Ghi Nhận Payment Theo Contract Installment

1. Accounting mở Payment Create.
2. Chọn mode By contract.
3. Chọn contract.
4. Hệ thống load installment schedule và payment summary.
5. User chọn installment còn remaining.
6. Nhập payment method, amount, date, reference.
7. Hệ thống validate amount không vượt remaining.
8. Submit tạo hoặc update payment theo source key.

Acceptance:

- Installment đã trả đủ bị disable hoặc cảnh báo.
- Amount vượt remaining bị chặn.
- Payment duplicate source key bị chặn.

---

## 12. Tiêu Chí Nghiệm Thu Chung

| ID | Tiêu chí |
|---|---|
| AC-01 | User có thể tạo đầy đủ customer -> quotation -> contract -> case -> task -> meeting -> payment với dữ liệu liên kết đúng. |
| AC-02 | Internal company là trục lọc chính cho service, quotation, contract, case và payment context. |
| AC-03 | Các form tạo quan trọng đều có confirm exit khi dirty. |
| AC-04 | User hệ thống `id = 1` không xuất hiện trong picker người dùng nghiệp vụ. |
| AC-05 | Task/Approval filter và group-by trả đúng dữ liệu, không trộn case với project internal. |
| AC-06 | Document upload/link/restore hoạt động và activity log ghi nhận hành động chính. |
| AC-07 | Payment theo contract installment tính đúng planned, received và remaining. |
| AC-08 | Các block không crash khi API trả thiếu relation object hoặc field optional. |
| AC-09 | Thông báo lỗi đủ rõ để user biết cần sửa field nào. |
| AC-10 | Các thay đổi quan trọng được kiểm tra syntax trước khi triển khai JS Block. |

---

## 13. Rủi Ro Và Giả Định

### 13.1 Giả Định

- NocoBase là nền tảng chính, không tách frontend/backend riêng trong giai đoạn hiện tại.
- Các collection đã tồn tại trong NocoBase với field gần đúng như code đang dùng.
- User nội bộ dùng hệ thống trong môi trường authenticated.
- Quyền truy cập chi tiết phần lớn được xử lý bởi NocoBase role/permission và bổ sung bằng filter trong JS Block.

### 13.2 Rủi Ro

| ID | Rủi ro | Giảm thiểu |
|---|---|---|
| R-01 | Tên field relation không thống nhất giữa collection và code | Chuẩn hóa schema mapping, dùng helper extract ID nhiều shape |
| R-02 | JS Block lớn khó bảo trì | Tách helper/document hóa từng module, thêm syntax check |
| R-03 | Client-side filter không đủ bảo mật | Đẩy filter bảo mật xuống NocoBase permission/server-side |
| R-04 | OAuth calendar sync triển khai frontend-only không an toàn | Thiết kế backend/token storage trước khi production |
| R-05 | Activity trigger ghi quá nhiều log | Thiết kế skip columns, compact log, retention policy |
| R-06 | Dữ liệu cũ thiếu internalCompanyId gây lọt list | Migration bổ sung internalCompanyId và filter strict theo công ty |

---

## 14. Roadmap Đề Xuất

### Giai Đoạn 1 - Ổn Định Core Operations

- Hoàn thiện Case, Task, Meeting, Document, Quotation, Contract, Payment.
- Chuẩn hóa internal company filter toàn hệ thống.
- Hoàn thiện confirm exit và validation form.
- Viết test case nghiệp vụ chính.
- Chuẩn hóa schema mapping.

### Giai Đoạn 2 - Workflow Và Tự Động Hóa

- Tự động tạo task/folder/document từ template.
- Approval workflow cho quotation/contract/payment nếu cần.
- Notification in-app/email cho task overdue, meeting, approval.
- Dashboard KPI theo role.

### Giai Đoạn 3 - Tích Hợp Và Báo Cáo

- Google/Microsoft Calendar sync qua OAuth backend.
- Payment receipt, invoice lifecycle và finance reports.
- Full-text document search.
- Export/import dữ liệu có audit.

### Giai Đoạn 4 - Client Collaboration

- Client portal.
- Secure document sharing.
- E-signature.
- Online payment.
- External counsel collaboration.

---

## 15. Phụ Lục A - Mapping File Module Hiện Tại

| Nhóm | File tiêu biểu |
|---|---|
| Case | `All Module/Case/CaseCreateForm.js`, `CaseServices.js`, `CaseNotes.js` |
| Task | `All Module/Task/AllTaskBlock.js`, `AllApprovalBlock.js`, `TaskManagement.js`, `TaskDetailView.js`, `MyTask.js`, `Kanban-MyTask.js`, `Grantt-MyTask.js`, `ProjectInternalTask.js` |
| Meeting | `All Module/Meeting/MeetingCalendarDemoBlock.js`, `MeetingCreateForm.js`, `MeetingBlock.js`, `MeetingDetailView.js` |
| Quotation | `All Module/Quotation/QuotationCreateForm.js`, `QuotationServices.js`, `QuotationDocxGenerator.js`, `QuotationPDFBlock.js`, `QuotationStatus.js` |
| Contract | `All Module/Contract/ContractCreateForm.js`, `ContractServices.js`, `ContractDocxGenerator.js`, `ContractPDFBlock.js`, `ContractPaymentScheduleDetailBlock.js` |
| Payment | `All Module/Payment/PaymentCreateBlock.js`, `PaymentContractDetailBlock.js` |
| Document | `All Module/Document/Library.js`, `DocumentDashboard.js`, `CaseDocument.js`, `CustomerDocument.js`, `ProjectDocument.js`, `LegalStudyDocument.js`, `LegalReferenceDocument.js`, `InternalTemplates.js`, `DocumentRestore.js`, `DocumentActivityLog.js` |
| Project/Note | `All Module/Project/ActivityTab.js`, `All Module/Note/ProjectNote.js` |
| JS Field | `JsField/JsLeadFilter.js`, `JsProjectFilter.js`, `JsStatusFilter.js`, `JsLegalReferenceLinks.js`, `JsLegalStudyLinks.js`, `JsColumnCaseProgress.js`, `JsColumnOverdue.js` |
| SQL Automation | `pgsql/*.sql` |

---

## 16. Phụ Lục B - Checklist Kiểm Thử Smoke Test

- Tạo customer mới và kiểm tra xuất hiện trong picker.
- Tạo quotation có 2 dịch vụ và kiểm tra total amount.
- Tạo contract từ quotation và kiểm tra service/payment schedule.
- Tạo case từ contract, đổi internal company và xác nhận service cũ bị clear.
- Mở service picker và xác nhận chỉ thấy service thuộc internal company đang chọn.
- Tạo meeting, đổi host và xác nhận host bị ẩn khỏi attendees.
- Tạo task từ calendar và xác nhận assignee mặc định là current user.
- Group All Task theo case, sau đó theo project internal, xác nhận nhóm đúng.
- Bulk select xóa task và xác nhận chỉ task được chọn bị xóa.
- Tạo payment theo contract installment và xác nhận remaining giảm đúng.
- Upload document vào case và xác nhận activity log.
- Đóng form dirty và xác nhận modal hỏi trước khi thoát.

