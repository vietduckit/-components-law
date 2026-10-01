# UI glossary — English ↔ Vietnamese (2026-10-01)

One wording per term across every JS Block (`tr("English")` + `VI` dictionary,
tool: `scripts/i18n/ui-strings.js`). Add a term here before using a new one.

## Module / category names — kept in English in both languages

Library, Knowledge, My Documents, Legal Reference, Reference (Legal Study),
Internal Work, Timesheet, Kanban, Gantt, Combo, Retainer, Dashboard,
Google Drive, Drive URL, PDF, DOCX, zip.

## Records

| English | Tiếng Việt |
|---|---|
| Case | Hồ sơ (in sentences: "hồ sơ"; "Case code" = Mã hồ sơ) |
| Matter (case name) | Vụ việc |
| Task | Công việc |
| Subtask | Công việc con |
| Service | Dịch vụ |
| Customer | Khách hàng |
| Lead | Lead |
| Contract | Hợp đồng |
| Appendix (contract) | Phụ lục |
| Quotation | Báo giá |
| Payment Request | Yêu cầu thanh toán |
| Invoice | Hóa đơn |
| Payment | Thanh toán |
| Installment | Đợt thanh toán |
| Period (retainer) | Kỳ |
| Billing plan | Kế hoạch thu tiền |
| Document | Tài liệu |
| Folder | Thư mục |
| File | Tệp |
| Comment | Bình luận |
| Note | Ghi chú |
| Meeting | Cuộc họp |
| Lawyer | Luật sư |
| Assignee | Người phụ trách |
| Manager | Quản lý |
| Finance members | Thành viên tài chính |
| Internal company | Công ty nội bộ |
| Template | Mẫu |

## Fields & states

| English | Tiếng Việt |
|---|---|
| Status | Trạng thái |
| Priority | Ưu tiên |
| Due date | Hạn |
| Start date | Ngày bắt đầu |
| End date | Ngày kết thúc |
| Signed date | Ngày ký |
| Total amount | Tổng tiền |
| Amount | Số tiền |
| Subtotal | Tạm tính |
| VAT | VAT |
| Unit price | Đơn giá |
| Description | Mô tả |
| To do | Cần làm |
| In progress | Đang làm |
| In review | Đang duyệt |
| Done | Hoàn thành |
| Cancelled | Đã hủy |
| Pending | Chờ xử lý (pending upload: "Chờ gửi") |
| Active | Đang hiệu lực |
| Overdue | Quá hạn |
| Paid | Đã thanh toán |
| Draft | Nháp |

## Actions

| English | Tiếng Việt |
|---|---|
| Save | Lưu |
| Save changes | Lưu thay đổi |
| Cancel | Hủy |
| Delete | Xóa |
| Edit | Chỉnh sửa |
| Reply | Phản hồi |
| Close | Đóng |
| Download | Tải về |
| Upload | Tải lên |
| Refresh | Làm mới |
| Search… | Tìm kiếm… |
| Create / New … | Tạo / … mới |
| Confirm | Xác nhận |
| Move to … | Chuyển sang … |
| Preview | Xem trước |

Rules: stored data (titles written to the DB, document type values, collection
names, status keys, strings compared in code) is never translated. A string
matched against data (a folder name, a button text found in the DOM) stays as
it is on that line (`lineMap` null).
