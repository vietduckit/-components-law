# Báo Cáo So Sánh Gap Checklist Và Clio Manage Module Analysis

Ngày lập: 01/07/2026

Nguồn so sánh:

- `Clio_Manage_Gap_Checklist.md`
- `CLIO_MANAGE_MODULE_ANALYSIS.md`

Mục tiêu của file này là gom lại sự khác nhau giữa hai tài liệu và chỉ ra các gap còn thiếu khi dùng `CLIO_MANAGE_MODULE_ANALYSIS.md` làm bản tham chiếu đầy đủ hơn.

## 1. Kết Luận Nhanh

Hai tài liệu không trùng vai trò:

- `Clio_Manage_Gap_Checklist.md` là checklist thực tế theo hệ thống law firm NocoBase hiện tại: có gì, thiếu gì, ưu tiên nhìn gap nhanh.
- `CLIO_MANAGE_MODULE_ANALYSIS.md` là bản đặc tả tham chiếu rộng hơn theo năng lực Clio Manage: module, persona, kiến trúc, API, data model, non-functional requirements, test strategy.

Gap lớn nhất sau khi đối chiếu không chỉ nằm ở tính năng nghiệp vụ như Case, Task, Calendar, Document, Payment. Khoảng trống lớn hơn nằm ở các lớp sản phẩm cấp platform:

- Firm Settings / Workspace Configuration.
- Role Matrix / Matter-level Permission / Data Wall.
- Universal Search / Notification Center / Firm Feed.
- Client Portal và Communication layer.
- Time, Expense, Billing Lifecycle, Trust Accounting, Accounting/Reconciliation.
- Workflow Automation, Event Taxonomy, API/Webhooks, Integration Platform.
- Mobile App, AI, Reporting Builder, Security/Compliance packaging.

## 2. Khác Nhau Giữa Hai Tài Liệu

| Tiêu chí | Clio_Manage_Gap_Checklist.md | CLIO_MANAGE_MODULE_ANALYSIS.md | Nhận xét |
|---|---|---|---|
| Vai trò | Checklist gap nhanh | Đặc tả tham chiếu/SRS rộng | Hai file bổ trợ nhau, không nên thay thế nhau |
| Góc nhìn | So với hệ thống NocoBase đang có | Mô tả sản phẩm Clio-like đầy đủ | Checklist thực tế hơn, Analysis đầy đủ hơn |
| Độ chi tiết | Trung bình, theo nhóm nghiệp vụ | Rất sâu, có business rules, API, architecture, NFR | Analysis có nhiều phần checklist chưa đưa vào backlog |
| Phạm vi hiện trạng | Có mô tả tính năng hiện có của hệ thống | Chủ yếu mô tả năng lực mục tiêu | Checklist tốt hơn để biết đã làm đến đâu |
| Quotation/Contract | Có phân tích sâu, vì hệ thống hiện tại mạnh ở luồng này | Không tách mạnh thành module Clio core | Đây là điểm mạnh riêng của hệ thống mình |
| Billing/Finance | Nêu gap chính | Tách sâu Time, Expense, Bills, Payments, Trust, Accounting | Checklist đang gộp quá nhiều vào một nhóm |
| Platform/NFR | Có nhắc Security/Compliance mức cao | Có Multi-tenancy, API, Event, Search, Ledger, Test, DB tables | Analysis là nguồn tốt để biến thành roadmap kỹ thuật |
| Client-facing | Nêu thiếu Portal/Communication | Mô tả rõ Client Portal, External Collaboration, Communication logs | Checklist cần bổ sung chi tiết hơn |
| AI/Mobile/PI | Có AI, chưa thấy Mobile/PI rõ | Có AI, Mobile App, Personal Injury | Checklist bỏ sót Mobile và Specialty module |

## 3. Những Nội Dung Có Trong Checklist Nhưng Analysis Không Nhấn Mạnh

Đây là các điểm phản ánh thực tế hệ thống NocoBase hiện tại, nên giữ lại trong checklist/roadmap nội bộ:

- Luồng Quotation -> Contract -> Case khá rõ và là điểm mạnh riêng.
- Quotation Services, Contract Services, Payment Schedule, VAT, package/line/scope pricing.
- Confirm Exit trong các form create.
- Task board, roadmap/gantt, group by Project Internal, bulk delete task.
- Calendar/Meeting có host, attendees, related case/quotation/contract, location/link, type, drag-drop reschedule.
- Meeting/task quick create trong calendar.
- Document modules nội bộ như Library, Case Document, Customer Document, Project Document, Legal Study, Legal Reference.
- Payment Create theo invoice/contract/manual, remaining amount, source key chống trùng.

Những điểm này không nhất thiết là Clio gap, nhưng là lợi thế custom của hệ thống hiện tại.

## 4. Những Nội Dung Analysis Có Nhưng Checklist Đang Thiếu Hoặc Chưa Đủ

| Nhóm trong Analysis | Checklist hiện tại | Gap cần bổ sung |
|---|---|---|
| Workspace/Firm Settings | Gần như chưa tách riêng | Cấu hình firm, timezone, currency, numbering, billing settings, practice areas, templates |
| Personas & Roles | Chưa có persona rõ | Firm Admin, Managing Partner, Attorney, Paralegal, Billing Manager, Accountant, Client, Integration Developer |
| Dashboard/Firm Feed/Search/Notifications | Có dashboard module nhưng chưa thành năng lực platform | Universal Search, firm feed, notification center, saved views, personal dashboard |
| Contacts | Có CRM/Lead/Customer | Thiếu contact types: opposing counsel, witness, vendor, expert, court/judge; duplicate merge; conflict check report |
| Matters | Có Case khá mạnh | Thiếu matter dashboard hợp nhất, stages, templates, multi-client matters, close/reopen rules, matter numbering |
| Calendar & Court Rules | Có calendar/meeting/task | Thiếu recurrence, court rules engine, availability, scheduler, reminders đa kênh, two-way sync |
| Tasks & Workflow | Có task/approval | Thiếu task reminders, recurring tasks, dependencies, checklist/comments, workflow automation builder |
| Notes & Timeline | Có Note/Activity ở vài nơi | Thiếu unified matter timeline và version/audit cho note |
| Documents | Có document management | Thiếu OCR/full-text search, versioning, e-signature, e-filing, document comments, retention/legal hold |
| Communications | Checklist nêu thiếu portal/communication | Thiếu email/text/phone logs, message thread, call logs, matter-linked communication history |
| Client Portal | Nêu thiếu nhiều | Cần tách thành module riêng: secure portal, upload docs, invoices, payments, calendar updates |
| Time & Expense | Nêu thiếu trong Billing | Cần tách module riêng: time entries, expense entries, activity categories, rates, rounding |
| Bills/Invoices | Nêu Invoice Lifecycle | Cần đặc tả bill generation, approval, sent/paid/void/write-off, discounts, taxes, LEDES |
| Payments | Có Payment Create một phần | Thiếu payment links, card/eCheck, refunds, disputes, payment plans, payment profiles |
| Trust Accounting | Nêu thiếu | Cần tách riêng thành trust ledger, retainer, deposits, disbursements, evergreen retainers |
| Accounting/Reconciliation | Nêu Accounting Sync | Thiếu bank feed, chart of accounts, journal entries, reconciliation, AR/AP, vendor bills |
| Reports | Nêu Report Builder | Thiếu report catalog, scheduled reports, async exports, financial/productivity/trust reports |
| Personal Injury | Chưa thấy | Nếu firm cần PI: damages, medical records, settlement, liens |
| Mobile App | Chưa thấy | Mobile task/calendar/contact/document/time/payment capture |
| Integrations/API | Nêu ecosystem chung | Thiếu OAuth, webhooks, API scopes, idempotency, webhook signing, migration tooling |
| NFR/Security | Nêu mức cao | Thiếu performance target, backup/restore, audit immutability, tenant isolation, malware scan |
| Test Strategy | Chưa có trong checklist | Cần test matrix cho permission, billing, trust ledger, calendar deadlines, webhook, portal |
| Suggested DB Tables | Chưa có | Có thể dùng làm input khi chuẩn hóa schema dài hạn |

## 5. Gap Hợp Nhất Theo Mức Ưu Tiên

### P0 - Gap Nền Tảng Cần Làm Trước Nếu Muốn Vận Hành Thật

- Role Matrix: ma trận quyền theo module/action/record.
- Matter-level Permission/Data Wall: phân quyền theo thành viên vụ việc, luật sư phụ trách, nhóm nghiệp vụ.
- Audit Log chuẩn: tạo/sửa/xóa/export/download/share/payment/billing/permission.
- Firm Settings: cấu hình firm, internal company, numbering, timezone, currency, tax defaults, practice area.
- Notification Center: in-app notification, reminder, overdue task/deadline, payment/billing alerts.
- Backup/Restore và data retention policy.

### P1 - Gap Nghiệp Vụ Clio Core

- Conflict Check cho Contact/Case/Matter.
- Matter Dashboard hợp nhất: overview, timeline, task, calendar, documents, notes, communication, billing/payment snapshot.
- Matter Stages/Pipeline và Matter Templates.
- Calendar Sync Google/Microsoft bằng OAuth.
- Court Rules/Deadline Calculator.
- Task reminders, recurring tasks, dependency, escalation.
- Unified Notes & Matter Timeline.
- Document full-text search/OCR và versioning.

### P2 - Gap Client-Facing Và Finance-Grade

- Public Intake Form và Appointment Booking.
- Secure Client Portal: message, document upload/share, invoice/payment, calendar updates.
- Email/Text/Phone log theo Matter.
- Time Tracking, Expense Tracking, Rates.
- Bill/Invoice Lifecycle: draft, approval, sent, overdue, paid, void, write-off.
- Online Payment Gateway, payment links, refunds, disputes, payment plans.
- Trust Accounting/Retainer Ledger.
- Accounting Sync/Reconciliation.

### P3 - Gap Product-Grade / Enterprise-Grade

- Report Builder và Scheduled Reports.
- API/Webhooks/OAuth integration platform.
- Mobile App.
- AI Matter Summary, AI calendar extraction, AI invoice draft, AI client update suggestions.
- E-signature và Court e-filing.
- Personal Injury specialty module nếu firm có nhu cầu.
- SOC2-equivalent security/compliance package.

## 6. Gap Theo Module Cụ Thể

### CRM / Contacts

Đang có:

- Lead, Customer, phân loại cá nhân/công ty, context customer cho quote/contract/case.

Gap:

- Contact type mở rộng: opposing counsel, witness, vendor, expert, court/judge.
- Conflict Check có lưu lịch sử, người chạy, kết quả, trạng thái reviewed/cleared/escalated.
- Duplicate merge, import/export, tags, custom fields.
- Contact dashboard: matters, open balance, trust balance, communications, documents.

### Case / Matter

Đang có:

- Case từ customer/quotation/contract/manual.
- Internal Company, project manager, lawyers, priority, deadline, services, document scope.

Gap:

- Matter dashboard hợp nhất.
- Matter numbering tự động.
- Matter stages/pipeline theo practice area.
- Matter templates tạo task/folder/custom fields/billing defaults.
- Close/reopen matter với rule kiểm tra open task, unpaid bill, trust balance.
- Multi-client matters và split billing nếu cần.

### Quotation / Contract

Đang có:

- Đây là điểm mạnh riêng của hệ thống: quote/contract/service/payment schedule/export.

Gap:

- Approval workflow hoàn chỉnh cho quotation/contract.
- Version history/redline workflow.
- Client accept/reject online.
- E-signature.
- Contract lifecycle: draft, review, signed, active, terminated, renewal.
- Renewal reminders.

### Task / Approval / Workflow

Đang có:

- All/My Tasks, board/kanban, roadmap/gantt, task/subtask, group by, approval list, bulk delete.

Gap:

- Recurring tasks.
- Task reminders.
- Dependencies.
- Checklist/comments.
- SLA/escalation.
- Workflow Builder UI: trigger, condition, action, run log, idempotency.

### Calendar / Meeting

Đang có:

- Calendar meeting/task, quick create, host/attendees, related case/quotation/contract, location/link, type, drag-drop.

Gap:

- Two-way Google/Microsoft calendar sync.
- Court rules/deadline calculator.
- Recurring events.
- Availability/scheduler/appointment booking.
- Automated reminders qua email/SMS/in-app.
- Private event/busy-free visibility.

### Document Management

Đang có:

- Library, case/customer/project documents, legal reference/study, folders, upload/link/share/activity log.

Gap:

- OCR/full-text search.
- Versioning/check-in/check-out.
- E-signature.
- Court e-filing.
- Document collaboration/commenting.
- Retention/legal hold/storage policy.
- Malware scan và secure signed download URL.

### Communication / Client Portal

Đang có:

- Note/activity nội bộ, meeting liên quan client/case, document sharing ở mức nội bộ.

Gap:

- Secure Client Portal.
- Client document upload.
- Client message thread.
- Email sync/log theo matter.
- Two-way texting.
- Phone/call logs.
- Client invoice/payment view.
- Automated client updates/reminders.

### Billing / Payment / Finance

Đang có:

- Quote/contract amount, payment schedule, payment create, remaining amount, source key chống trùng.

Gap:

- Time entries, expense entries, rates, activity categories.
- Bill generation và full invoice lifecycle.
- Bill approval/sending/reminders/write-off.
- Online payment gateway, payment links, refunds/disputes/payment plans.
- Trust ledger/retainer/evergreen retainers.
- Accounting/reconciliation/bank feed/journal entries.
- AR/WIP/collections/trust financial reports.

### Reporting / Insights

Đang có:

- Dashboard/module dashboard/activity log/filter/grouping.

Gap:

- Firm Insights Dashboard.
- Report Builder.
- Scheduled Reports.
- Async export.
- Metric catalog.
- Permission-aware financial/productivity/trust reports.

### Platform / Integration / API

Đang có:

- NocoBase API, JS Block, khả năng workflow/http request nếu cấu hình.

Gap:

- OAuth/private app.
- API scopes.
- Webhook subscriptions/deliveries.
- Idempotency key cho financial writes.
- Webhook signature/retry.
- Integration catalog: Google, Microsoft, Dropbox/Box/OneDrive, QuickBooks/Xero, Zapier.
- Data migration dry-run/rollback/validation reports.

### AI / Mobile / Specialty

Gap:

- Mobile app cho task/calendar/contact/document/time/payment.
- AI matter summary.
- AI court document to calendar/task.
- AI invoice draft.
- AI client update suggestions.
- AI document summarization/extraction.
- Personal Injury module: damages, medical records, settlement, liens.

## 7. Các Gap Checklist Nên Được Cập Nhật Thêm

Nên bổ sung các dòng sau vào `Clio_Manage_Gap_Checklist.md` trong lần cập nhật tiếp theo:

- Workspace/Firm Settings.
- Universal Search / Firm Feed / Notifications.
- Notes & Unified Matter Timeline.
- Communication Logs: Email/Text/Phone.
- Time & Expense tách khỏi Billing.
- Bills/Invoices tách khỏi Payment.
- Trust Accounting tách khỏi Accounting/Reconciliation.
- Mobile App.
- Personal Injury specialty module.
- API/Webhooks/OAuth.
- Non-functional Requirements.
- Test Strategy.

## 8. Đề Xuất Roadmap Ngắn

### Giai đoạn 1 - Chuẩn hóa nền tảng

- Role Matrix, Matter-level permission, audit/export/download log.
- Firm settings và numbering.
- Notification/reminder nền tảng.
- Matter dashboard bản đầu.

### Giai đoạn 2 - Hoàn thiện Clio Core

- Conflict check.
- Matter stages/templates.
- Calendar sync và recurring event.
- Task reminder/dependency.
- Document full-text search/versioning.

### Giai đoạn 3 - Client và Finance

- Intake/booking.
- Client portal.
- Time/expense/rates.
- Invoice lifecycle.
- Online payments.
- Trust ledger.

### Giai đoạn 4 - Platform và AI

- Report builder.
- API/webhooks/OAuth.
- Accounting sync/reconciliation.
- Mobile app.
- AI layer.

## 9. Nhận Định Cuối

`Clio_Manage_Gap_Checklist.md` đang phù hợp để theo dõi tiến độ thực tế của hệ thống hiện tại. Tuy nhiên, nếu dùng để so với Clio Manage đầy đủ thì checklist vẫn còn thiếu một số lớp lớn: platform settings, permission architecture, communication, billing-depth, trust/accounting, API/integration, mobile, NFR và test strategy.

`CLIO_MANAGE_MODULE_ANALYSIS.md` nên được xem là backlog tham chiếu dài hạn. Không cần làm toàn bộ ngay, nhưng nên dùng nó để bổ sung các nhóm gap còn thiếu vào checklist, sau đó chia thành P0/P1/P2/P3 để tránh roadmap bị quá rộng.
