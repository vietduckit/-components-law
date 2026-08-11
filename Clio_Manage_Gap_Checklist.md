# Danh Sách So Sánh Tính Năng Với Clio Manage

Ngày lập: 01/07/2026  
Mục tiêu: Liệt kê nhanh tính năng hệ thống law firm NocoBase đang có, đối chiếu với Clio Manage để nhìn ra phần còn thiếu.

Nguồn đối chiếu Clio:

- https://www.clio.com/features/
- https://www.clio.com/manage/

## Cách Đọc Thuật Ngữ

Một số thuật ngữ đặc thù nên giữ tiếng Anh để sau này đối chiếu với Clio, NocoBase và tài liệu kỹ thuật dễ hơn. Trong tài liệu này, các thuật ngữ đó sẽ có chú thích tiếng Việt trong ngoặc.

| Thuật ngữ | Diễn giải tiếng Việt |
|---|---|
| Gap | Khoảng trống/chức năng còn thiếu so với sản phẩm tham chiếu |
| Case/Matter | Vụ việc/hồ sơ pháp lý của khách hàng |
| Matter Dashboard | Màn hình tổng quan riêng cho từng vụ việc |
| Intake | Tiếp nhận thông tin khách hàng/vụ việc ban đầu |
| Client Portal | Cổng thông tin riêng cho khách hàng đăng nhập |
| Workflow Builder | Công cụ cho người dùng tự cấu hình quy trình tự động |
| Time Tracking | Ghi nhận thời gian làm việc tính phí |
| Expense Tracking | Ghi nhận chi phí phát sinh để thu lại/báo cáo |
| Trust Accounting | Quản lý tiền ủy thác/tiền tạm giữ của khách hàng |
| Retainer | Khoản tạm ứng/phí trả trước của khách hàng |
| E-signature | Ký điện tử |
| Court e-filing | Nộp hồ sơ điện tử lên tòa/cơ quan có thẩm quyền |
| Full-text Search | Tìm kiếm nội dung bên trong file/tài liệu |
| Versioning | Quản lý phiên bản tài liệu/bản ghi |
| Billing Lifecycle | Vòng đời hóa đơn từ draft đến paid/write-off |
| AR | Accounts Receivable (công nợ phải thu) |
| WIP | Work In Progress (công việc đã làm nhưng chưa xuất hóa đơn) |
| SLA | Service Level Agreement (mức cam kết thời gian xử lý) |
| Data Wall | Tường ngăn dữ liệu, giới hạn ai được xem vụ việc nào |
| SOC2-equivalent | Quy trình/kiểm soát bảo mật tương đương chuẩn SOC 2 |

## Tóm Tắt Nhanh

| Nhóm tính năng | Trạng thái hệ thống hiện tại | Gap chính so với Clio Manage |
|---|---|---|
| Quản lý Case/Matter (vụ việc/hồ sơ pháp lý) | Có khá mạnh | Thiếu Conflict Check (kiểm tra xung đột lợi ích), Matter Dashboard (màn hình tổng quan vụ việc) sâu, Workflow Template UI (giao diện mẫu quy trình) |
| CRM/Lead/Customer (khách hàng tiềm năng và khách hàng) | Có một phần | Thiếu Intake Form Online (form tiếp nhận trực tuyến), Appointment Booking (đặt lịch hẹn), CRM Pipeline Automation (tự động hóa pipeline CRM) |
| Quotation/Contract (báo giá/hợp đồng) | Có mạnh theo nhu cầu nội bộ | Clio thiên về Billing/Matter (hóa đơn/vụ việc); hệ thống mình có luồng Quote/Contract custom tốt |
| Task/Approval (công việc/phê duyệt) | Có mạnh | Thiếu Reminder/Notification Automation (tự động nhắc việc/thông báo), Workflow Builder (công cụ cấu hình quy trình) cho user |
| Calendar/Meeting (lịch/họp) | Có một phần | Thiếu Google/Microsoft Sync (đồng bộ lịch thật), Court Rules/Deadline Automation (tự động tính hạn theo quy tắc tòa), Appointment Booking (đặt lịch hẹn) |
| Document Management (quản lý tài liệu) | Có khá mạnh | Thiếu E-signature (ký điện tử), Court e-filing (nộp hồ sơ điện tử), Full-text Search (tìm trong nội dung file), Versioning (quản lý phiên bản) |
| Billing/Payment/Finance (hóa đơn/thanh toán/tài chính) | Có một phần | Thiếu Time Tracking (ghi giờ), Expense Tracking (ghi chi phí), Invoice Lifecycle (vòng đời hóa đơn), Trust Accounting (tiền ủy thác), Accounting Sync (đồng bộ kế toán) |
| Client Communication/Portal (giao tiếp và cổng khách hàng) | Thiếu nhiều | Thiếu Secure Client Portal (cổng khách hàng bảo mật), Two-way Texting (nhắn tin hai chiều), Email Log (nhật ký email), Client Updates (cập nhật cho khách hàng) |
| Reporting/Insights (báo cáo/phân tích) | Có một phần | Thiếu Report Builder (tự tạo báo cáo), Scheduled Reports (báo cáo định kỳ), Financial KPI Dashboard (dashboard chỉ số tài chính) |
| AI (trí tuệ nhân tạo) | Thiếu/Roadmap | Thiếu AI Matter Summary (tóm tắt vụ việc), Court Doc to Calendar (biến tài liệu tòa thành lịch), AI Billing Draft (nháp hóa đơn bằng AI), Client Update Suggestions (gợi ý cập nhật khách hàng) |
| Security/Compliance (bảo mật/tuân thủ) | Có nền tảng NocoBase | Cần Role Matrix (ma trận quyền), Audit/Export Policy (chính sách log/xuất dữ liệu), quy trình bảo mật tương đương SOC2 nếu cần |

## Những Tính Năng Hệ Thống Đang Có

### 1. CRM, Lead, Customer

- Có quản lý Lead (khách hàng tiềm năng) và Customer (khách hàng) ở mức collection và filter JS.
- Có phân loại Customer theo cá nhân/công ty ở mức nghiệp vụ đang dùng.
- Có Context Customer (ngữ cảnh khách hàng) khi tạo Quotation (báo giá), Contract (hợp đồng), Case (vụ việc).
- Có filter theo Internal Company (công ty nội bộ), User (người dùng), Lawyer (luật sư), Status (trạng thái) ở một số JS Field.

Thiếu so với Clio:

- Public Intake Form (form tiếp nhận công khai cho khách hàng tự điền).
- Public Appointment Booking (đặt lịch hẹn công khai).
- CRM Pipeline (đường ống bán hàng/chăm sóc khách hàng) rõ ràng theo Stage (giai đoạn).
- Email Marketing/Automation (tiếp thị email/tự động hóa email).
- Conflict Check (kiểm tra xung đột lợi ích) giữa khách hàng, đối tác, đối thủ, người liên quan.

### 2. Case/Matter Management (Quản Lý Vụ Việc)

- Có tạo Case/Matter (vụ việc/hồ sơ pháp lý) từ Customer, Quotation, Contract hoặc nhập thủ công.
- Có Internal Company, Project Manager (người quản lý vụ việc), Lawyers, Priority (ưu tiên), Deadline (hạn), Description (mô tả).
- Có Service Rows (dòng dịch vụ) theo vụ việc, hỗ trợ Line/Package/Scope Billing Mode (chế độ tính phí theo dòng/gói/phạm vi).
- Có filter Service (dịch vụ) theo Internal Company.
- Có tạo Folder/Document Scope (phạm vi thư mục/tài liệu) liên quan Case.
- Có Confirm Exit (xác nhận thoát) khi form có thay đổi chưa lưu.

Thiếu so với Clio:

- Matter Dashboard (màn hình tổng quan từng vụ việc): timeline, task, communication, billing, documents, financial snapshot trong một màn hình thống nhất.
- Conflict Check (kiểm tra xung đột lợi ích).
- Matter Stages/Pipeline (giai đoạn xử lý vụ việc) theo Practice Area (lĩnh vực hành nghề).
- Custom Fields/Configurable Layouts (trường tùy biến/bố cục tùy biến) cho non-dev user (người dùng không lập trình).
- Permission/Data Wall (phân quyền/tường ngăn dữ liệu) sâu theo Matter Membership (thành viên vụ việc).

### 3. Quotation (Báo Giá)

- Có tạo Quotation theo Internal Company, Customer/Lead, Lawyer, Template (mẫu), Payment Terms (điều khoản thanh toán).
- Có Quotation Services (dịch vụ trong báo giá), Subtotal (tạm tính), VAT (thuế GTGT), Total Amount (tổng tiền).
- Có Line Pricing/Package Pricing (báo giá theo dòng dịch vụ/báo giá trọn gói).
- Có Status (trạng thái) và Approval Flag (có yêu cầu phê duyệt) ở mức dữ liệu.
- Có xuất DOCX/PDF báo giá.
- Có Confirm Exit khi form có thay đổi chưa lưu.

Điểm mạnh riêng so với Clio:

- Hệ thống có luồng Quotation -> Contract -> Case (báo giá -> hợp đồng -> vụ việc) khá custom cho vận hành nội bộ.

Thiếu/cần bổ sung:

- Approval Workflow (quy trình phê duyệt) đầy đủ cho Quotation.
- Version History (lịch sử phiên bản) của báo giá.
- Client Accept/Reject Online (khách hàng chấp nhận/từ chối online).
- E-signature (ký điện tử) hoặc Acceptance Portal (cổng xác nhận báo giá).

### 4. Contract (Hợp Đồng)

- Có tạo Contract từ Quotation/Customer hoặc nhập thủ công.
- Có Payment Schedule/Installments (lịch thanh toán/các đợt thanh toán).
- Có xuất DOCX/PDF hợp đồng.
- Có Confirm Exit khi form có thay đổi chưa lưu.

Thiếu/cần bổ sung:

- Contract Lifecycle (vòng đời hợp đồng): Draft (bản nháp), Review (đang soát xét), Signed (đã ký), Active (đang hiệu lực), Terminated (chấm dứt), Renewal (gia hạn).
- E-signature (ký điện tử).
- Clause/Template Management (quản lý điều khoản/mẫu hợp đồng) nâng cao.
- Renewal Reminders (nhắc gia hạn hợp đồng).
- Versioning/Redline Workflow (quản lý phiên bản/quy trình so sánh sửa đổi).

### 5. Task, Subtask, Approval

- Có All Task/My Task (tất cả công việc/công việc của tôi), Board/Kanban (bảng kéo thả), Roadmap/Gantt (lộ trình/biểu đồ tiến độ).
- Có Task/Subtask, Assignee (người được giao), Status, Start/Due Date (ngày bắt đầu/ngày đến hạn), Waiting Issue (vấn đề đang chờ).
- Có filter theo Case, Assignee, Status, Waiting Issue, Keyword (từ khóa), Date (ngày).
- Có Group By (nhóm dữ liệu) theo Case, Service, Status, Assignee, Date, Waiting Issue, Project Internal (dự án nội bộ).
- Có xóa task đơn lẻ và Bulk Delete (xóa hàng loạt).
- Có Approval List (danh sách chờ phê duyệt), Approve/Reject (phê duyệt/từ chối), Reject Reason (lý do từ chối).
- Có Auto-create Task from Template (tự động tạo task từ mẫu).

Thiếu so với Clio:

- Recurring Tasks (công việc lặp lại).
- Dependency/Court Deadline Rules (phụ thuộc công việc/quy tắc hạn tòa).
- Task SLA/Escalation (cam kết thời gian xử lý/cơ chế leo thang).
- Workflow Builder UI (giao diện để user tự cấu hình quy trình).
- Reminder/Notification Automation (tự động nhắc việc/thông báo) hoàn chỉnh.

### 6. Calendar, Meeting

- Có Calendar View (màn hình lịch) cho Meeting/Task.
- Có tạo Meeting hoặc Task từ Calendar.
- Có Related Case/Quotation/Contract (liên kết vụ việc/báo giá/hợp đồng).
- Có Location/Link (địa điểm/đường link họp) và Type (loại lịch họp).
- Có Host (người chủ trì) mặc định Current User (người dùng hiện tại), cho phép đổi Host.
- Có Attendees (người tham dự) và logic ẩn Host khỏi Attendees để tránh trùng.
- Task tạo từ Calendar có Assignee mặc định Current User.
- Có thử nghiệm ICS/Google Calendar Form Fallback (mở form Google Calendar khi chưa cấu hình đồng bộ).

Thiếu so với Clio:

- Google Calendar/Microsoft Outlook Sync (đồng bộ lịch thật) bằng OAuth.
- Court Rules/Deadline Calculator (tính hạn theo quy tắc tòa/cơ quan).
- Public Appointment Booking (đặt lịch hẹn công khai).
- Calendar Sharing/Availability (chia sẻ lịch/kiểm tra thời gian rảnh).
- Automated Reminders qua Email/SMS/In-app (nhắc tự động qua email/tin nhắn/thông báo trong app).

### 7. Document Management (Quản Lý Tài Liệu)

- Có Library (thư viện), Case Document, Customer Document, Project Document.
- Có Legal Study (nghiên cứu pháp lý), Legal Reference (tài liệu/nguồn tham khảo pháp lý).
- Có Document Dashboard (bảng tổng quan tài liệu), Activity Log (nhật ký hoạt động), Restore (khôi phục).
- Có Upload/Link Document (tải lên/liên kết tài liệu) vào nhiều collection.
- Có Folder, Folder Members/Managers (thư mục, thành viên/quản lý thư mục) ở một số module.
- Có Activity Log cho Document/Folder/Share (tài liệu/thư mục/chia sẻ).

Thiếu so với Clio:

- E-signature (ký điện tử).
- Court e-filing (nộp hồ sơ điện tử lên tòa/cơ quan).
- Full-text Search (tìm kiếm nội dung bên trong file).
- Document Versioning (quản lý phiên bản tài liệu).
- Advanced Document Automation/Forms/Questionnaires (tự động hóa tài liệu/form/bảng câu hỏi nâng cao).
- Document Collaboration/Commenting (cộng tác và bình luận trên tài liệu).
- Storage Policy/Quota/Retention (chính sách lưu trữ/dung lượng/lưu giữ) rõ ràng.

### 8. Billing, Payment, Finance

- Có Quotation Amount (giá trị báo giá), Contract Amount (giá trị hợp đồng), VAT.
- Có Contract Payment Schedule (lịch thanh toán hợp đồng).
- Có Payment Create theo Invoice, Contract hoặc Manual (tạo thanh toán theo hóa đơn/hợp đồng/thủ công).
- Có kiểm tra Remaining Amount (số tiền còn lại) và chống trùng Source Key (mã nguồn giao dịch).
- Có Payment Status: Received (đã nhận), Partial (một phần), Pending (chờ xử lý), Planned (dự kiến), Cancelled (đã hủy).
- Có một số Generator (bộ sinh tài liệu) liên quan Invoice/Payment/Payroll.

Thiếu so với Clio:

- Time Tracking (ghi nhận thời gian làm việc tính phí) theo Lawyer/Task/Case.
- Expense Tracking (ghi nhận chi phí phát sinh).
- Invoice Lifecycle (vòng đời hóa đơn): Draft, Approval, Sent, Overdue, Paid, Write-off.
- Automatic Bill Reminders (tự động nhắc thanh toán hóa đơn).
- Online Payment Gateway (cổng thanh toán online).
- Trust Accounting/Retainer Ledger (quản lý tiền ủy thác/sổ cái tiền tạm ứng).
- Accounting/Reconciliation (kế toán/đối soát).
- Financial Report Builder (công cụ tạo báo cáo tài chính).

### 9. Client Communication & Portal

- Có Note/Activity nội bộ.
- Có Meeting liên quan Client/Case.
- Có Document Sharing (chia sẻ tài liệu) ở mức nội bộ/permission.

Thiếu nhiều so với Clio:

- Secure Client Portal (cổng khách hàng bảo mật).
- Two-way Texting (nhắn tin hai chiều).
- Email Sync/Log theo Matter (đồng bộ/ghi log email theo vụ việc).
- Client Message Thread (luồng trao đổi với khách hàng).
- Client Upload Documents (khách hàng tự upload tài liệu).
- Client Payment Link (link thanh toán cho khách hàng).
- Automated Client Updates/Reminders (tự động cập nhật/nhắc việc cho khách hàng).

### 10. Reporting & Firm Insights

- Có Dashboard/Document Dashboard/Activity Log ở mức module.
- Có Task Board/Roadmap và Filter/Grouping.
- Có Payment/Contract Detail ở mức nghiệp vụ.

Thiếu so với Clio:

- Firm Insights Dashboard (dashboard tổng quan công ty).
- Report Builder (công cụ tạo báo cáo tùy chỉnh).
- Scheduled Reports (báo cáo gửi/chạy định kỳ).
- Financial Reports: AR (công nợ phải thu), WIP (công việc đã làm chưa xuất hóa đơn), Collections (thu tiền), Revenue (doanh thu), Trust Balances (số dư tiền ủy thác).
- Productivity Reports theo Lawyer/Matter/Task (báo cáo năng suất theo luật sư/vụ việc/công việc).

### 11. Integrations, API, Ecosystem

- Có nền tảng NocoBase API và JS Block custom.
- Có thể tích hợp qua `ctx.api.request`, Workflow (quy trình), HTTP Request nếu cấu hình.
- Có thử nghiệm hướng ICS/Google Calendar.

Thiếu so với Clio:

- Marketplace/Integration Catalog (chợ ứng dụng/tích hợp) kiểu 300+ apps.
- Zapier/Open API Packaging (đóng gói API/tích hợp cho bên ngoài).
- Accounting Integrations như QuickBooks/Xero (tích hợp phần mềm kế toán).
- Email/Calendar Sync Production (đồng bộ email/lịch sẵn sàng production).
- Data Migration Tooling (công cụ migrate/nhập dữ liệu) hoàn chỉnh.

### 12. AI

Hiện tại:

- Chưa thấy AI Production (AI sẵn sàng vận hành) trong module hiện tại.

Thiếu so với Clio:

- AI Matter Summary (AI tóm tắt vụ việc).
- AI Court Document to Calendar/Task (AI biến tài liệu tòa/cơ quan thành lịch/task).
- AI Billing Draft (AI tạo nháp hóa đơn).
- AI Billing Error Detection (AI phát hiện lỗi hóa đơn/tính phí).
- AI Client Update Suggestions (AI gợi ý nội dung cập nhật cho khách hàng).
- AI Legal Analysis/Case Strategy (AI phân tích pháp lý/chiến lược vụ việc).

### 13. Security, Permission, Compliance

- Có nền tảng NocoBase Users/Roles (người dùng/vai trò).
- Có Activity Log cho nhiều collection.
- Có Document/Folder Membership (thành viên tài liệu/thư mục) ở một số module.

Thiếu/cần làm rõ:

- Role Matrix (ma trận phân quyền) chính thức theo Module/Action.
- Matter-level Permission/Data Wall (phân quyền/tường ngăn dữ liệu theo từng vụ việc).
- Export Audit (ghi log khi xuất dữ liệu).
- Retention Policy (chính sách lưu giữ/xóa dữ liệu).
- MFA/SSO Policy (xác thực đa yếu tố/đăng nhập một lần).
- Security Checklist for Production (checklist bảo mật khi triển khai thật).

## Kết Luận Nhanh

Hệ thống hiện tại đã mạnh ở trục vận hành nội bộ: Case, Quotation, Contract, Task, Approval, Meeting, Document và Payment Schedule. So với Clio Manage, phần thiếu lớn nhất không nằm ở việc tạo Case/Task/Document, mà nằm ở các lớp sản phẩm hoàn thiện hơn:

- Client-facing (hướng khách hàng): Intake, Portal, Communication, Appointment Booking.
- Finance-grade (cấp độ tài chính chuyên nghiệp): Time/Expense, Billing Lifecycle, Trust Accounting, Accounting Sync.
- Automation-grade (cấp độ tự động hóa): Reminders, Workflow Builder, Court Rules, Integrations.
- Product-grade (cấp độ sản phẩm hoàn chỉnh): Mobile App, Report Builder, Security/Compliance Packaging, AI.

