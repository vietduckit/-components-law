# Phân tích module Clio Manage và đặc tả hệ thống tham chiếu

Ngày tổng hợp: 2026-06-22  
Phạm vi: Phân tích dựa trên tài liệu công khai của Clio về Clio Manage, Clio Help Center, Clio Developer Hub, trang security và các trang feature liên quan. Đây là tài liệu đặc tả tham chiếu để thiết kế một hệ thống quản lý văn phòng luật tương tự về năng lực nghiệp vụ, không phải tài liệu nội bộ của Clio và không sao chép giao diện, nội dung độc quyền hay quy trình triển khai riêng của Clio.

## 1. Tóm tắt sản phẩm

Clio Manage là phần mềm cloud-based legal practice management, tập trung vào vận hành văn phòng luật từ lúc mở hồ sơ vụ việc đến quản lý lịch, task, tài liệu, giao tiếp khách hàng, chấm công, chi phí, billing, thanh toán, trust accounting, báo cáo, tích hợp và AI hỗ trợ công việc thường ngày.

Các nhóm năng lực chính:

- Quản lý firm: matters/cases, contacts, calendar, tasks, documents, dashboards, collaboration, mobile.
- Tài chính: time & expense, billing, invoices, online payments, trust account management, accounting, reporting.
- Giao tiếp khách hàng: communication logs, text/email/phone logs, client portal, document sharing, reminders.
- Tự động hóa và AI: workflow automation, calendar/task/document/billing assistance, AI suggestions, document extraction/summarization.
- Nền tảng: roles and permissions, custom fields, integrations, API, security, auditability, data migration.

## 2. Module map tổng thể

| Nhóm | Module | Vai trò |
| --- | --- | --- |
| Foundation | Workspace/Firm Settings | Thiết lập firm, người dùng, timezone, currency, numbering, billing settings |
| Foundation | Users, Roles, Permissions | RBAC/custom roles, quyền theo matter/contact/bill/report |
| Foundation | Dashboard, Search, Notifications | Màn hình tổng quan, tìm kiếm, nhắc việc, feed hoạt động |
| Case Ops | Contacts | Client/company/opposing counsel/witness/vendor, tags, custom fields, conflict checks |
| Case Ops | Matters | Hồ sơ vụ việc, trạng thái, stage, template, numbering, timeline, financials |
| Case Ops | Calendar & Court Rules | Lịch cá nhân/firm/matter, reminders, court deadlines, calendar sync |
| Case Ops | Tasks & Workflows | Task list, assignee, due date, reminders, kanban stage, automated workflows |
| Case Ops | Notes & Activities Timeline | Ghi chú, lịch sử hoạt động, liên kết matter/contact |
| Documents | Document Management | Folders, upload, templates, version, search, share, e-signature, e-filing hook |
| Communications | Emails, Texts, Phone Logs, Internal Messages | Ghi log giao tiếp, liên kết matter/contact, suggested replies |
| Client Collaboration | Client Portal | Secure portal, message, upload/share docs, invoices, payments, calendar updates |
| Billing | Time & Expense | Time entries, expense entries, activity categories, rates, rounding |
| Billing | Bills/Invoices | Bill generation, states, approval, split bills, LEDES, discounts, tax, interest |
| Billing | Payments | Card/eCheck/payment links/QR/payment plans/refunds/disputes/payment profiles |
| Trust & Accounting | Trust Account Management | Retainer/trust request, deposits, disbursements, refunds, evergreen retainers, ledgers |
| Trust & Accounting | Accounting/Reconciliation | Bank feed, chart of accounts, journal entries, AR/AP, reconciliation, vendor bills |
| Insights | Reports & Custom Reports | Billing, matter, client, productivity, revenue, payment, trust, PI reports |
| Specialty | Personal Injury | Damages, medical records, settlement, liens, matter-specific PI workflow |
| Platform | Integrations & API | Outlook/Gmail/Google/Microsoft/Dropbox/accounting apps/API/webhooks/Zapier |
| Platform | Mobile App | Time, expenses, contacts, calendar, client data, tap-to-pay, docs on the go |
| Platform | AI | Court document to calendar/task, matter updates, invoice drafts, document insights |

## 3. Personas và vai trò nghiệp vụ

| Persona | Mục tiêu | Quyền chính |
| --- | --- | --- |
| Firm Administrator | Cấu hình firm, user, permission, billing, integrations | Full access, manage roles, settings, all data |
| Managing Partner | Theo dõi doanh thu, workload, pipeline, rủi ro | Dashboard, reports, matters, financials |
| Attorney | Quản lý matter, deadlines, tài liệu, giao tiếp, time entries | Assigned matters, contacts, tasks, documents, billing review |
| Paralegal/Legal Assistant | Chuẩn bị tài liệu, cập nhật hồ sơ, lịch, task | Matter operations, documents, calendar, limited billing |
| Billing Manager | Generate/approve/send bills, collect payments | Billing, payments, trust requests, reports |
| Accountant/Bookkeeper | Reconcile, bank transactions, ledgers, accounting reports | Accounts, transactions, accounting, trust/operating reconciliation |
| Receptionist/Intake Staff | Tạo contact, appointment, initial matter | Contacts, scheduler, conflict check, limited matter creation |
| External Co-counsel | Nhận task/tài liệu liên quan | Portal/co-counsel access, limited per matter |
| Client | Xem tài liệu, nhắn tin, upload, xem invoice, thanh toán | Client portal access to own matters only |
| Integration Developer | Đồng bộ data và automation | API OAuth/private app, scoped permissions |

## 4. Đặc tả module chi tiết

### 4.1 Workspace, Firm Settings và System Configuration

Mục tiêu: Cung cấp lớp cấu hình dùng chung cho toàn firm.

Chức năng:

- Tạo workspace/firm theo mô hình multi-tenant.
- Cấu hình thông tin firm: tên, địa chỉ, logo, email, phone, timezone, locale, currency, tax defaults.
- Cấu hình practice areas, matter numbering scheme, matter statuses, stages, tags, custom fields.
- Cấu hình billing: invoice template/theme, bill numbering, taxes, interest, default rates, LEDES/UTBMS, approval workflow.
- Cấu hình calendar: working hours, court rules provider, reminder defaults, calendar sharing defaults.
- Cấu hình document: storage provider, folder template, document categories, template library.
- Cấu hình notifications: email/SMS/in-app/push, digest frequency, escalation.
- Cấu hình security: password policy, SSO, MFA, session timeout, IP allowlist nếu cần.
- Cấu hình integrations: OAuth apps, accounting sync, email/calendar sync, webhooks.

Yêu cầu phi chức năng:

- Mọi thay đổi cấu hình quan trọng phải ghi audit log.
- Cấu hình theo tenant phải được cache có version để tránh đọc DB lặp lại.
- Thay đổi billing/tax/rate không được làm sai dữ liệu lịch sử đã phát hành.

### 4.2 Users, Roles và Permissions

Mục tiêu: Kiểm soát ai được xem, tạo, sửa, xóa, export và quản trị từng loại dữ liệu.

Chức năng:

- Quản lý user firm: invite, activate, deactivate, reset MFA, role assignment.
- Hỗ trợ standard roles: Administrator, Accounts, General Access, Billing, Reports.
- Hỗ trợ custom roles dựa trên permission matrix.
- Một user có thể có nhiều role; chính sách đề xuất: quyền hiệu lực là hợp nhất quyền, nhưng vẫn có deny rules đặc biệt nếu firm bật data wall.
- Permission scope:
  - Global: firm settings, user management, integrations.
  - Module: contacts, matters, documents, activities, calendars, tasks, bills, payments, reports.
  - Record-level: assigned matters, own activities, visible contacts, private calendar events, locked documents.
  - Action-level: view, create, edit, delete, export, manage, approve, void, refund, reconcile.
- Matter/contact visibility theo membership, responsible attorney, practice group hoặc explicit share.
- Permission đặc biệt:
  - View financials.
  - Manage billing preferences.
  - Manage trust transactions.
  - Run conflict checks across restricted records.
  - Unlock documents.
  - Manage automated workflows.
  - View firm feed.

Business rules:

- Không được xóa hoặc giảm quyền admin cuối cùng của firm.
- Deactivate user không xóa dữ liệu lịch sử; reassign open tasks/calendar events/matters nếu cần.
- Export data phải yêu cầu quyền export riêng và ghi audit.
- Conflict check có thể cần quyền đọc metadata vượt qua visibility thông thường nhưng kết quả phải masked nếu user không có quyền xem record.

### 4.3 Dashboard, Firm Feed, Search và Notifications

Mục tiêu: Cho người dùng nhìn nhanh việc cần làm và tình trạng firm.

Chức năng:

- Dashboard cá nhân:
  - Upcoming/overdue tasks.
  - Upcoming calendar events/deadlines.
  - Recently accessed matters.
  - Running timers.
  - Draft/approval bills nếu có quyền.
  - Unpaid invoices/payment failures nếu có quyền tài chính.
- Dashboard firm:
  - Open matters, workload, billable hours, AR, WIP, collections, trust balances.
  - Firm feed/activity stream.
- Universal search:
  - Search contacts, matters, documents, notes, emails, bills, tasks.
  - Respect permissions and matter visibility.
  - Full-text document search với metadata filter.
- Notifications:
  - In-app, email, push, SMS tùy loại.
  - Reminder cho tasks, calendar events, court deadlines, bill approvals, invoice overdue, trust threshold.
  - Notification preferences per user.

Entities:

- `dashboard_widget`, `saved_view`, `notification`, `notification_preference`, `search_index`, `activity_feed_item`.

Acceptance criteria:

- Dashboard load dưới 2 giây với firm vừa và nhỏ bằng pre-aggregated counters.
- Search không trả dữ liệu user không có quyền.
- Notification có deduplication và retry.

### 4.4 Contacts và Client Management

Mục tiêu: Quản lý mọi cá nhân/tổ chức mà firm tương tác.

Chức năng:

- Tạo contact type:
  - Person.
  - Company.
  - Client.
  - Opposing counsel.
  - Witness.
  - Vendor.
  - Expert.
  - Insurance adjuster.
  - Court/judge.
- Hồ sơ contact:
  - Name, company, title, emails, phones, addresses, website, DOB nếu cần.
  - Communication preferences.
  - Billing preferences/rates.
  - Tags, custom fields, notes.
  - Related matters, documents, transactions, bills, communications.
- Contact dashboard:
  - Matter list, open balances, trust balance, recent communications, documents.
- Conflict checks:
  - Search across contacts, matters, notes, calendar entries, communications và custom fields.
  - Lưu conflict check report, terms, timestamp, người chạy.
  - Mark as reviewed/cleared/escalated.
- Import/export/sync:
  - CSV import/export.
  - Sync với Google/Microsoft contacts nếu bật.
  - Merge duplicate contacts.
- Permissions:
  - Contact-level visibility.
  - Export permission riêng.
  - Billing data chỉ hiện nếu user có quyền financial.

Business rules:

- Email/phone/address có thể có nhiều record và label.
- Một matter có thể có nhiều client nếu bật multi-client matters.
- Không xóa cứng contact nếu đang gắn với matter/bill/payment; dùng archive hoặc soft delete.
- Merge contact phải giữ audit và cập nhật references.

### 4.5 Matters / Case Management

Mục tiêu: Matter là trung tâm liên kết mọi dữ liệu nghiệp vụ.

Chức năng:

- Tạo matter:
  - Client(s), matter name, description, practice area, responsible attorney, originating attorney.
  - Open date, close date, statute of limitations, jurisdiction/court.
  - Billing method: hourly, flat fee, contingency, pro bono, legal aid.
  - Matter numbering tự động.
  - Tags, custom fields, matter template.
- Matter dashboard:
  - Overview, timeline, tasks, calendar, documents, notes, communications, time/expenses, bills, trust, financial summary.
- Matter status:
  - Open, pending, closed, archived hoặc custom statuses.
  - Close/reopen matter với reason, date, financial checks.
- Matter stages:
  - Kanban-style stages.
  - Stage progression, automated tasks/documents/reminders.
- Matter templates:
  - Preconfigured tasks, folder structure, custom fields, billing defaults, stage pipeline.
- Multi-client matters:
  - Nhiều clients trên cùng matter.
  - Billing allocation/split billing nếu cần.
- Permissions:
  - Matter membership, responsible attorney, team, practice group.
  - Block/restrict users khỏi matter nhạy cảm.
- Matter financials:
  - WIP, AR, payments, trust balances, expenses, realization/collection metrics.
- Specialty matter:
  - Personal injury: damages, medical records, settlement.
  - Legal aid: funding, eligibility, reporting.

Business rules:

- Matter number phải unique trong tenant.
- Close matter nên cảnh báo nếu còn open tasks, unpaid bills, trust balance, unreconciled transactions.
- Reopen matter giữ nguyên lịch sử và audit.
- Matter deletion nên soft delete và recover trong thời gian cấu hình.

### 4.6 Calendar, Court Rules và Scheduler

Mục tiêu: Quản lý lịch hẹn, deadline, court dates và nhắc việc.

Chức năng:

- Calendar types:
  - Personal calendar.
  - Firm-wide calendar.
  - Matter-specific calendar.
  - Intake/scheduler calendar.
- Calendar events:
  - Title, description, location, start/end, all-day, recurrence.
  - Matter/contact links.
  - Invitees: firm users, clients, co-counsel.
  - Visibility: public, private, invitees-only.
  - Related tasks and documents.
- Court rules:
  - Chọn jurisdiction/court rule set.
  - Trigger event tạo chuỗi deadlines tự động.
  - Holiday/weekend adjustment.
  - Audit nguồn rule và version.
- Reminders:
  - Multiple reminders minutes/hours/days/weeks before.
  - Email/SMS/push/in-app.
  - Client appointment confirmations by text.
- Calendar sync:
  - Two-way sync với Google Calendar/Microsoft Outlook.
  - iCal feed.
  - Conflict handling khi event bị sửa từ nguồn ngoài.
- Time tracking from calendar:
  - Create time entry from event.
  - Mark event missing time entry.
- Scheduler:
  - Appointment booking pages, availability rules, buffers, reschedule/cancel, intake appointment types.

Business rules:

- Court-rule-generated events phải có flag để người dùng biết nguồn tạo và có thể refresh khi rule version thay đổi.
- Private event chỉ lộ busy/free theo quyền.
- Delete recurring event cần chọn one/series/future.

### 4.7 Tasks và Workflow Automation

Mục tiêu: Theo dõi việc cần làm, deadline và tự động hóa các quy trình lặp lại.

Chức năng:

- Task entity:
  - Title, description, status, priority, due date, assignee, creator.
  - Matter/contact links.
  - Reminders, checklist/subtasks, comments.
  - Dependencies nếu cần.
- Views:
  - My tasks, team tasks, matter tasks, overdue, upcoming, completed.
  - Calendar view and dashboard widgets.
  - Kanban theo matter stage.
- Task lists/templates:
  - Reusable task list by practice area/matter template.
  - Relative due dates theo matter open date, stage date hoặc court trigger.
- External collaboration:
  - Assign task cho co-counsel/portal user với giới hạn dữ liệu.
- Bulk actions:
  - Reassign, change due date, mark complete, delete.
- Workflow automation:
  - Trigger: matter created, stage changed, task completed, document uploaded, bill approved, payment received, trust below threshold.
  - Actions: create task, send email/SMS, generate document, create calendar event, notify user, update field/stage.
  - Conditions: practice area, matter status, custom field, role, amount threshold.

Business rules:

- Completing a task should write to matter timeline.
- Auto-generated tasks cần source reference để audit và tránh tạo trùng.
- Overdue calculation theo timezone firm/user.

### 4.8 Notes và Matter Timeline

Mục tiêu: Lưu thông tin phi cấu trúc nhưng có liên kết nghiệp vụ.

Chức năng:

- Notes gắn với matter/contact.
- Note categories, tags, rich text, attachments.
- Private notes and permission flags.
- Timeline tổng hợp:
  - Matter created/updated.
  - Task status.
  - Calendar events.
  - Communications.
  - Documents.
  - Time/expense.
  - Bills/payments/trust transactions.
- Filter timeline theo loại hoạt động, date range, user.

Business rules:

- Notes và timeline phải immutable một phần: nội dung note có thể edit theo quyền nhưng mọi edit cần version/audit.
- Timeline không được hiển thị financial events cho user không có quyền.

### 4.9 Document Management, Templates, E-signature và E-filing

Mục tiêu: Quản lý toàn bộ tài liệu case/client một cách bảo mật và có thể tìm kiếm.

Chức năng:

- Document storage:
  - Upload files/folders.
  - Folder tree per matter/contact.
  - Document categories.
  - Unlimited/logical storage tùy plan, với quota nếu sản phẩm tự thiết kế.
- Document metadata:
  - Name, type, size, author, owner, matter/contact, category, created/updated, tags, retention policy.
- Versioning:
  - Replace, restore, compare metadata, lock/unlock.
  - Check-in/check-out nếu có desktop sync.
- Search:
  - Title, metadata, OCR/full text.
  - Filters: matter, category, author, date, type.
- Templates:
  - Merge fields từ matter/contact/custom fields.
  - Conditional fields.
  - Template library by practice area.
  - Generate document package.
- E-signature:
  - Send document for signature.
  - Recipients, signing order, status, certificate/audit trail.
- Sharing:
  - Share with client portal/co-counsel.
  - Expiring secure links.
  - Permissioned downloads.
- E-filing hook:
  - Prepare filing package, court selection, service list, filing status callback.
- Integrations:
  - Dropbox/Google Drive/OneDrive/Box style connectors nếu cần.
  - Desktop app sync.

Business rules:

- Legal files may contain privileged data; encryption at rest and access audit required.
- Delete should soft delete with restore window.
- Generated document must store template version and merge data snapshot.
- Search index must purge/update on permission changes.

### 4.10 Communications: Email, Text, Phone Logs, Internal Messages

Mục tiêu: Tập trung mọi trao đổi của firm và client vào đúng hồ sơ.

Chức năng:

- Email logs:
  - Log email to contact/matter.
  - Gmail/Outlook add-ins.
  - Store subject, participants, timestamps, attachments, body reference.
  - Email signatures/templates.
- Text messaging:
  - Firm-owned number or assigned numbers.
  - Send/receive SMS with clients.
  - Save texts to matter/contact communication log.
  - Automated appointment/bill reminders.
- Phone logs:
  - Manual call log.
  - Integration call recordings/transcripts metadata nếu có.
- Internal messages:
  - User-to-user messages linked to matter.
  - Mentions and notifications.
- Communication log:
  - Unified timeline.
  - Print/export portal records with timestamps when required.
- AI suggestions:
  - Suggested email/SMS replies based on matter context, requiring user review.

Business rules:

- SMS opt-in/opt-out and consent tracking required.
- Attorney-client privilege: restrict communication logs by matter permissions.
- Attachments logged from email should enter document workflow with deduplication.

### 4.11 Client Portal và External Collaboration

Mục tiêu: Cung cấp không gian bảo mật cho client/co-counsel trao đổi với firm.

Chức năng:

- Client onboarding:
  - Invite via email.
  - Secure signup/login.
  - Optional biometric on mobile.
  - Multi-language support nếu cần.
- Portal capabilities:
  - Secure messaging.
  - Document upload/download/share.
  - Mobile document scanning to PDF.
  - View case updates, calendar events, tasks/requests.
  - View invoices/trust requests.
  - Pay bills/trust deposits.
- Matter scoping:
  - Client chỉ thấy matters được share.
  - Co-counsel chỉ thấy assigned tasks/docs/messages.
- Audit:
  - Message read timestamps.
  - Document opened/downloaded timestamps.
  - Upload source and user agent.

Business rules:

- Portal access revocation must immediately block future access but retain audit history.
- Sharing bill/payment data must honor financial permissions and matter-client relationship.
- Client upload should run malware scan before firm users open file.

### 4.12 Activities: Time, Expense và Rates

Mục tiêu: Ghi nhận công việc và chi phí để billing chính xác.

Chức năng:

- Time entries:
  - Manual time.
  - Running timer with pause/resume.
  - Duplicate prior entry.
  - Create from calendar event, task, communication log, note, document.
  - Add from mobile app/email add-in.
- Expense entries:
  - Hard cost/soft cost.
  - Receipt attachment.
  - Matter/client allocation.
  - Billable/non-billable.
- Activity categories:
  - User-defined categories.
  - UTBMS/LEDES codes if enabled.
- Rate hierarchy:
  - Firm default rate.
  - User rate.
  - Client rate.
  - Matter rate.
  - Activity category rate.
  - Custom override per entry.
- Rounding:
  - Increment rules, e.g. 0.1 hour.
  - Rounding method.
- Review:
  - Unbilled/billed status.
  - Bulk edit.
  - Export.

Business rules:

- Billed entries should be locked except via bill adjustment/credit process.
- Timer cannot run indefinitely without warning.
- Rate resolution must be deterministic and auditable.
- Non-billable entries still contribute productivity reports if configured.

### 4.13 Billing, Bills/Invoices và Collections

Mục tiêu: Chuyển time/expense/fees thành bills, review, gửi và thu tiền.

Chức năng:

- Bill generation:
  - Generate by client/matter/date range/responsible attorney.
  - Include time, expenses, flat fees, fixed fee, contingency items.
  - Single bill, bulk bills, split billing.
- Bill states:
  - Draft.
  - Pending approval.
  - Approved.
  - Sent.
  - Partially paid.
  - Paid.
  - Void/deleted.
  - Written off.
- Approval workflow:
  - Route to responsible attorney/billing manager.
  - Internal reminders.
  - Change tracking.
- Invoice templates/themes:
  - Logo, firm info, payment instructions.
  - Line item grouping, summary, trust balance display.
  - Tax/discount/interest fields.
- Billing formats:
  - PDF/HTML.
  - LEDES for e-billing.
  - UTBMS codes.
- Adjustments:
  - Discounts.
  - Credit notes.
  - Write-offs.
  - Interest for late payment.
  - Taxes.
- Delivery:
  - Email.
  - Client portal.
  - Text link if consented.
  - Print/download.
- Collections:
  - Automated bill reminders.
  - Pay Now links/QR.
  - Payment plans.
  - Outstanding balance dashboard.

Business rules:

- Bill number unique and immutable after issue.
- Voiding bill should unlock or reverse billed activities according to policy.
- Trust funds applied to invoices must generate trust ledger and operating ledger entries.
- Split billing must allocate line items/amounts clearly and prevent overbilling.
- LEDES exports must validate required codes and client/matter references.

### 4.14 Payments và Payment Processing

Mục tiêu: Cho clients thanh toán nhanh, firm thu tiền và reconcile an toàn.

Chức năng:

- Payment methods:
  - Credit card.
  - Debit card.
  - eCheck/ACH nếu region hỗ trợ.
  - Manual/offline payment.
  - In-person tap-to-pay via mobile.
- Payment links:
  - Secure link.
  - QR code.
  - Pay Now button on bill.
  - Website/portal payment.
- Payment profiles:
  - Store tokenized payment method.
  - Request payment method.
  - Consent and expiry tracking.
- Payment plans:
  - Recurring payments.
  - Installments.
  - Auto-charge saved method.
  - Failure retry rules.
- Refunds/disputes:
  - Full/partial refund.
  - Chargeback/dispute tracking.
  - Status updates from payment provider.
- Notifications:
  - Payment success/failure.
  - Receipt.
  - Payment plan reminders.
- Accounting sync:
  - Payment, processing fees, settlement, deposit batches.

Business rules:

- Card data must never be stored directly; use provider tokenization.
- Trust and operating funds must remain separated.
- Processing fee/surcharge rules must comply with jurisdiction/payment network.
- Payment event idempotency required to avoid double-posting.

### 4.15 Trust Account Management

Mục tiêu: Quản lý funds held in trust/retainers đúng quy định.

Chức năng:

- Trust accounts:
  - Bank account setup.
  - Separate operating and trust ledgers.
  - Matter/client trust ledger.
- Trust requests:
  - Generate trust request.
  - Send via email/portal/payment link.
  - Accept deposits.
- Trust transactions:
  - Deposit.
  - Transfer to operating for earned fees.
  - Disbursement.
  - Refund.
  - Adjustment.
- Evergreen retainers:
  - Minimum trust balance threshold.
  - Alert/request replenishment when balance below threshold.
- Invoices:
  - Show trust movement and remaining trust balance.
  - Apply trust funds to invoices.
- Reports:
  - Trust ledger.
  - Client balance.
  - Three-way reconciliation support.

Business rules:

- Trust ledger must be append-only or reversal-based.
- Trust funds cannot be applied to unrelated matter/client unless explicitly allowed and audited.
- Negative trust balance should be blocked by default.
- All trust movement must produce audit trail and be reportable.

### 4.16 Accounting và Reconciliation

Mục tiêu: Hỗ trợ bookkeeping/legal accounting trong một system of record hoặc đồng bộ sang phần mềm kế toán.

Chức năng:

- Chart of accounts.
- Bank accounts: operating/trust.
- Bank feed import.
- Transaction matching.
- Journal entries.
- Accounts receivable.
- Vendor bills/accounts payable.
- Checks.
- Hard costs and expense reimbursement.
- Operating and trust reconciliation.
- Accounting dashboard:
  - Money owed/owing.
  - Bank balances.
  - Unmatched transactions.
  - Reconciliation status.
- Reports:
  - General ledger.
  - Trial balance.
  - Profit/loss.
  - AR aging.
  - Trust ledger/reconciliation.
- Integrations:
  - QuickBooks Online/Desktop, Xero or equivalent.

Business rules:

- Accounting period locks prevent edits after reconciliation/close.
- Trust and operating cannot be mixed.
- External sync must map accounts/taxes/items consistently.
- Reconciliation adjustments require permission and audit.

### 4.17 Reports, Insights và Custom Reports

Mục tiêu: Biến dữ liệu vận hành thành quyết định quản trị.

Chức năng:

- Standard report families:
  - Billing reports.
  - Client reports.
  - Matter reports.
  - Productivity reports.
  - Task reports.
  - Revenue reports.
  - Online payments reports.
  - Trust reports.
  - Personal injury reports.
  - Detailed annual reports where jurisdiction needs.
- Custom reports:
  - Dataset selection.
  - Fields/metrics.
  - Filters.
  - Grouping.
  - Sorting.
  - Preview.
  - Save view/preset.
  - Schedule delivery.
  - Export CSV/XLSX/PDF.
- Metric definitions:
  - Each metric has definition, source table, calculation logic.
- Permission:
  - Reports role.
  - Financial report access.
  - Matter visibility filters.

Key metrics:

- Billable hours.
- Collected revenue.
- Outstanding AR.
- Work in progress.
- Utilization, realization, collection rates.
- Matter cycle time.
- Task overdue rate.
- Client balance.
- Trust balance.
- Payment failure/chargeback rate.

Business rules:

- Reports must not leak restricted matter/client data.
- Scheduled reports should snapshot result at run time.
- Large reports run async with download expiry.

### 4.18 Personal Injury: Medical Records, Damages và Settlement

Mục tiêu: Hỗ trợ practice area cá nhân hóa cho personal injury.

Chức năng:

- Medical records:
  - Provider, request date, received date, document links.
  - Bills, treatment dates, medical summaries.
- Damages:
  - Economic/non-economic damage items.
  - Evidence/document references.
  - Calculation summary.
- Liens:
  - Lien holder, amount, negotiation status, settlement impact.
- Settlement:
  - Demand, offers, negotiation log.
  - Gross settlement, fees, costs, liens, client net.
  - Settlement statement document generation.
- Reports:
  - Medical records outstanding.
  - Damages summary.
  - Settlement distribution.

Business rules:

- Sensitive health-related data requires tighter access/audit.
- Settlement financial calculations must be versioned and reviewable.

### 4.19 Mobile App

Mục tiêu: Cho luật sư và staff thao tác khi ngoài văn phòng.

Chức năng:

- View/search contacts and matters.
- Calendar and reminders.
- Create tasks.
- Track time via timer/manual entry.
- Enter expenses and attach receipts.
- Access/upload/share documents.
- Client communication.
- Tap-to-pay/in-person payment if enabled.
- Push notifications.
- Offline-lite mode for recently accessed data if product chooses.

Business rules:

- Mobile device management: remote logout, session revocation, biometric unlock.
- Offline actions need conflict resolution and audit when synced.
- Sensitive documents should avoid permanent local storage unless encrypted.

### 4.20 Manage AI / AI Layer

Mục tiêu: Giảm thao tác thủ công nhưng vẫn để người dùng review/approve kết quả.

Năng lực đề xuất:

- Court document extraction:
  - Upload court notice/order.
  - Extract dates/deadlines.
  - Create draft calendar events/tasks.
  - Side-by-side source review.
- Billing assistance:
  - Convert tracked time/expenses to draft invoices.
  - Flag missing descriptions, abnormal entries, duplicate charges.
  - Suggest approval route/reminders.
- Client update assistance:
  - Summarize matter activity.
  - Draft client update email/SMS.
  - Require attorney/staff review before send.
- Document assistance:
  - Summarize case files.
  - Extract key facts with source references.
  - Generate template-based drafts using firm-approved templates.
- Admin assistance:
  - Create tasks, notes, time entries, calendar entries from natural language.

AI governance:

- Human-in-the-loop for external communication, billing, deadlines and legal documents.
- Source citation required for extracted facts.
- Permission-aware retrieval.
- No training on tenant data unless explicit contract allows.
- AI action audit: prompt, model, sources, output, approver, final action.
- Redaction and privilege controls.

### 4.21 Integrations, API và Developer Platform

Mục tiêu: Cho hệ thống kết nối với công cụ firm đang dùng.

Chức năng:

- OAuth/private app support.
- API resources:
  - Contacts.
  - Matters.
  - Activities/time/expenses.
  - Calendar entries.
  - Tasks.
  - Documents metadata and upload/download.
  - Bills/invoices.
  - Payments/transactions.
  - Users.
  - Custom fields.
  - Webhooks/events.
- Webhooks:
  - Contact created/updated.
  - Matter created/updated/stage changed/closed.
  - Task completed/overdue.
  - Document uploaded/shared.
  - Time/expense created.
  - Bill approved/sent/paid/voided.
  - Payment succeeded/failed/refunded/disputed.
  - Trust balance threshold crossed.
- Common integrations:
  - Google Workspace.
  - Microsoft Outlook/Office/Calendar.
  - Dropbox/Box/OneDrive/Google Drive.
  - QuickBooks/Xero.
  - Dialpad/Zoom.
  - Zapier.
- Data migration:
  - CSV importers.
  - Legacy system mapping.
  - Validation reports.
  - Dry-run and rollback.

API principles:

- Tenant isolation always enforced.
- Scoped access tokens.
- Idempotency keys for financial writes.
- Pagination, filtering, field selection.
- Rate limits.
- Webhook signing and retries.
- API audit logs.

## 5. Thiết kế hệ thống đề xuất

### 5.1 Kiến trúc tổng thể

Mô hình đề xuất: multi-tenant SaaS modular monolith giai đoạn đầu, có boundaries rõ để tách service khi scale.

Thành phần:

- Web app: React/Vue/Angular hoặc framework hiện có.
- Mobile app: React Native/Flutter/native.
- API Gateway/BFF: authentication, tenant context, rate limit, request shaping.
- Identity & Access service: users, roles, permissions, sessions, MFA/SSO.
- Core Case service: contacts, matters, tasks, calendar, notes, custom fields.
- Document service: metadata, storage abstraction, versions, OCR/search indexing.
- Communication service: email/SMS/phone/internal messages, consent, logs.
- Billing service: activities, rates, bills, approvals, collections.
- Payment service: payment provider integration, payment plans, refunds, webhooks.
- Ledger/Accounting service: trust/operating ledgers, journal entries, reconciliation.
- Reporting service: report definitions, async jobs, warehouse/read models.
- Workflow service: triggers, conditions, actions.
- AI orchestration service: retrieval, prompts, source attribution, review queues.
- Integration service: OAuth connectors, API apps, webhooks, sync jobs.
- Notification service: in-app/email/SMS/push.
- Audit service: immutable logs.
- Search service: OpenSearch/Elasticsearch/Postgres full-text depending scale.
- Object storage: S3-compatible with encryption and malware scanning.
- Queue/job system: background processing, imports, reports, webhooks, OCR, AI jobs.

### 5.2 Data model cốt lõi

```text
firm
  -> users
  -> roles
  -> role_permissions
  -> custom_fields
  -> tags

contact
  -> contact_emails
  -> contact_phones
  -> contact_addresses
  -> contact_custom_field_values
  -> conflict_checks

matter
  -> matter_clients
  -> matter_participants
  -> matter_members
  -> matter_stages
  -> matter_custom_field_values
  -> matter_timeline_items

matter
  -> tasks
  -> calendar_events
  -> notes
  -> documents
  -> communications
  -> time_entries
  -> expense_entries
  -> bills
  -> trust_ledger_entries

bill
  -> bill_line_items
  -> bill_approvals
  -> bill_deliveries
  -> payments
  -> credit_notes
  -> write_offs

bank_account
  -> ledger_accounts
  -> ledger_entries
  -> bank_transactions
  -> reconciliations

workflow
  -> workflow_triggers
  -> workflow_conditions
  -> workflow_actions
  -> workflow_runs

integration_app
  -> oauth_connections
  -> webhooks
  -> sync_jobs

audit_log
  -> actor_user
  -> target_resource
  -> before_after_snapshot
```

### 5.3 Multi-tenancy

Khuyến nghị:

- Mọi bảng nghiệp vụ có `firm_id`.
- Row-level security hoặc enforcement ở repository/query layer.
- Unique constraints luôn scoped theo `firm_id`.
- Object storage path dạng `firm/{firm_id}/...`, không dùng tên client trong path.
- Search index partition hoặc filter theo tenant.
- Background jobs luôn carry `firm_id`, `actor_id`, `request_id`.

### 5.4 Permission model

Nên kết hợp RBAC + ABAC:

- RBAC: role grants action trên resource type.
- ABAC: điều kiện record-level như matter member, owner, assigned user, practice group, financial visibility.
- Field-level permissions: financials, trust, health data, private notes.
- Export permission riêng.
- Audit cho view/download/export sensitive data.

Permission check mẫu:

```text
can(user, action, resource):
  1. resolve firm context
  2. collect role permissions
  3. apply standard grants
  4. apply record visibility constraints
  5. apply field-level masks
  6. deny if resource restricted and user not explicitly allowed
  7. log sensitive access if configured
```

### 5.5 Event taxonomy

Event domain nên chuẩn hóa:

- `contact.created`, `contact.updated`, `contact.merged`.
- `matter.created`, `matter.stage_changed`, `matter.closed`, `matter.reopened`.
- `task.created`, `task.completed`, `task.overdue`.
- `calendar_event.created`, `calendar_event.reminder_due`, `court_rule.events_generated`.
- `document.uploaded`, `document.shared`, `document.signed`, `document.deleted`.
- `communication.logged`, `sms.received`, `email.logged`.
- `time_entry.created`, `expense.created`.
- `bill.generated`, `bill.approved`, `bill.sent`, `bill.paid`, `bill.voided`.
- `payment.succeeded`, `payment.failed`, `payment.refunded`, `payment.disputed`.
- `trust.deposit_received`, `trust.funds_applied`, `trust.threshold_breached`.
- `report.scheduled`, `report.generated`.
- `workflow.run_started`, `workflow.run_failed`, `workflow.run_completed`.

Event consumers:

- Notifications.
- Workflow automation.
- Search indexing.
- Reporting read models.
- Webhooks.
- Audit trail.

### 5.6 Workflow engine

Core model:

- Trigger: event-based, schedule-based, manual.
- Condition: boolean expressions over matter/contact/user/bill/payment fields.
- Action: create/update/send/notify/generate.
- Run log: input, matched conditions, action results, errors.
- Idempotency: `workflow_id + source_event_id + action_key`.

Example workflows:

- Matter created with template "Litigation": create folder structure, task list, initial deadlines.
- Stage changed to "Discovery": generate document requests and assign tasks.
- Bill approved: send invoice and payment link.
- Payment failed: notify billing manager and schedule retry.
- Trust balance below threshold: send trust replenishment request.

### 5.7 Reporting architecture

Khuyến nghị:

- Operational DB cho writes.
- Read models/materialized views cho dashboard.
- Reporting warehouse hoặc OLAP tables cho custom reports.
- Metric catalog:
  - Name.
  - Description.
  - Formula.
  - Source tables.
  - Permission requirements.
  - Refresh frequency.
- Async export for large reports.
- Scheduled reports with delivery logs and access-controlled download links.

### 5.8 Search architecture

Index types:

- Structured search: contacts, matters, bills, tasks.
- Full-text documents: OCR/text extraction, metadata.
- Communications/notes: permission-scoped.

Rules:

- Every index document stores `firm_id`, resource type, resource id, visibility ACL hash.
- Permission changes enqueue reindex jobs.
- Deleted/archived records removed or hidden based on policy.

### 5.9 Financial ledger design

Principles:

- Use double-entry or ledger-like append-only entries for money movement.
- Separate operating and trust accounts.
- Never mutate posted ledger entries; reverse/adjust instead.
- Idempotent payment webhooks.
- Reconciliation status locks related transactions.

Core entities:

- `bank_account`.
- `ledger_account`.
- `ledger_entry`.
- `trust_ledger_entry`.
- `payment_transaction`.
- `settlement_batch`.
- `reconciliation`.
- `journal_entry`.

### 5.10 Document storage and security

Pipeline:

1. Upload to quarantine.
2. Malware scan.
3. Extract metadata.
4. OCR/text extraction if supported.
5. Store encrypted object.
6. Create document metadata.
7. Index searchable content.
8. Emit `document.uploaded`.

Security:

- Encryption in transit and at rest.
- Signed URLs with short TTL.
- Download audit.
- Legal hold/retention.
- Permission-aware sharing.

### 5.11 AI architecture

Components:

- Retrieval layer: permission-aware search over matter data/documents.
- Prompt orchestration: task-specific prompts, firm policies, jurisdiction metadata.
- Tool/action layer: create draft tasks/events/bills/docs.
- Review queue: user approves before commit for high-risk actions.
- AI audit: request, sources, generated output, user edits, final action.

Guardrails:

- No autonomous sending of legal advice to client.
- No autonomous court deadline creation without review if source confidence low.
- Billing drafts require approval before invoice sent.
- Source-backed summaries only.

## 6. Non-functional requirements

Security:

- MFA/SSO support.
- Encryption at rest/in transit.
- Role and record-level permissions.
- Audit logs for sensitive actions.
- Tokenized payment methods.
- Malware scanning for uploads.
- Secure webhook signatures.

Compliance:

- SOC 2-style controls if targeting enterprise.
- Trust accounting auditability.
- Data retention and legal hold.
- Privacy requests/export/delete where legally allowed.
- Region-aware payment/tax/surcharge settings.

Reliability:

- 99.9% uptime target for production.
- Background job retries with dead letter queue.
- Payment webhook idempotency.
- Backup/restore tested.

Performance:

- Dashboard p95 under 2 seconds for typical firm.
- Search p95 under 1 second for indexed data.
- Large report async.
- File upload resumable for large documents.

Scalability:

- Tenant-aware partitioning.
- Async OCR, reports, email/SMS, integrations.
- Cache firm settings and permissions.

Auditability:

- Immutable audit logs for:
  - Login/session/security changes.
  - Permission changes.
  - Financial transactions.
  - Trust ledger actions.
  - Bill approval/sending/payment.
  - Document sharing/download.
  - AI-generated drafts and approvals.

## 7. API đặc tả đề xuất

REST endpoints mẫu:

```text
GET    /api/v1/contacts
POST   /api/v1/contacts
GET    /api/v1/contacts/{id}
PATCH  /api/v1/contacts/{id}

GET    /api/v1/matters
POST   /api/v1/matters
GET    /api/v1/matters/{id}
PATCH  /api/v1/matters/{id}
POST   /api/v1/matters/{id}/close
POST   /api/v1/matters/{id}/reopen

GET    /api/v1/matters/{id}/tasks
POST   /api/v1/tasks
PATCH  /api/v1/tasks/{id}
POST   /api/v1/tasks/{id}/complete

GET    /api/v1/calendar-events
POST   /api/v1/calendar-events
POST   /api/v1/court-rules/generate-events

POST   /api/v1/documents/upload
GET    /api/v1/documents/{id}
POST   /api/v1/documents/{id}/share

POST   /api/v1/time-entries
POST   /api/v1/expense-entries

POST   /api/v1/bills/generate
POST   /api/v1/bills/{id}/approve
POST   /api/v1/bills/{id}/send
POST   /api/v1/bills/{id}/void

POST   /api/v1/payments/payment-links
POST   /api/v1/payments/refunds
POST   /api/v1/webhooks/payment-provider

GET    /api/v1/reports
POST   /api/v1/reports/custom
POST   /api/v1/reports/{id}/schedule

POST   /api/v1/workflows
POST   /api/v1/workflows/{id}/enable

POST   /api/v1/ai/matter-update-draft
POST   /api/v1/ai/extract-calendar-events
POST   /api/v1/ai/invoice-draft
```

API requirements:

- Pagination: cursor-based for large datasets.
- Filtering: `matter_id`, `contact_id`, `status`, `date_from`, `date_to`, `updated_since`.
- Sparse fields: `fields=...`.
- Idempotency key for POST financial/payment actions.
- Webhook signature: HMAC with timestamp.
- OAuth scopes:
  - `contacts:read/write`.
  - `matters:read/write`.
  - `documents:read/write`.
  - `billing:read/write`.
  - `payments:read/write`.
  - `reports:read`.
  - `admin:read/write`.

## 8. MVP và roadmap đề xuất

### Phase 1: Core Practice Management

- Firm settings.
- Users, roles, basic permissions.
- Contacts.
- Matters.
- Tasks.
- Calendar.
- Notes/timeline.
- Basic documents.
- Time/expense.
- Basic bills.

### Phase 2: Client Collaboration and Billing Depth

- Client portal.
- Email/SMS logs.
- Invoice templates.
- Bill approval.
- Online payment links.
- Payment plans.
- Trust requests and trust ledger.
- Reports basics.

### Phase 3: Automation, Accounting and Integrations

- Workflow automation.
- Calendar sync/email add-ins.
- Accounting sync.
- Reconciliation.
- Custom reports.
- Document templates/e-signature.
- API/webhooks.

### Phase 4: AI and Specialty Modules

- AI calendar extraction.
- AI client updates.
- AI invoice drafts.
- Document summarization/extraction.
- Personal injury module.
- Advanced reporting and anomaly detection.

## 9. Rủi ro thiết kế cần chú ý

- Trust accounting sai là rủi ro cao nhất: cần ledger immutable, reconciliation và permission chặt.
- Calendar/court deadline sai gây thiệt hại pháp lý: cần source version, user review, reminder redundancy.
- Permission leakage trong search/report/document share: cần kiểm thử bảo mật nghiêm túc.
- Payment webhook duplicate/out-of-order: bắt buộc idempotency.
- AI hallucination: mọi output quan trọng cần source và human approval.
- Data migration từ hệ thống cũ: cần dry-run, mapping report, rollback và data quality dashboard.
- Multi-client/split billing dễ sai allocation: cần rule engine rõ ràng và tests.

## 10. Test strategy

Unit tests:

- Permission resolution.
- Rate hierarchy.
- Bill generation calculations.
- Trust ledger postings.
- Workflow condition evaluation.
- Calendar recurrence/deadline calculations.

Integration tests:

- Payment provider webhook flow.
- Email/calendar sync.
- Document upload/search/share.
- Accounting sync.
- Report generation.

End-to-end tests:

- Create contact -> conflict check -> create matter -> tasks/calendar/docs.
- Track time/expense -> generate bill -> approve -> send -> pay -> reconcile.
- Trust request -> deposit -> apply to invoice -> trust report.
- Client portal message/document upload/payment.
- Role restriction scenario: user cannot access restricted matter in dashboard/search/report.

Security tests:

- Tenant isolation.
- Broken object level authorization.
- Export/download permissions.
- Webhook signature validation.
- File upload malware/quarantine.
- Session/MFA/SSO flows.

## 11. Suggested database tables

```text
firms
firm_settings
users
user_firms
roles
permissions
role_permissions
user_roles
audit_logs

contacts
contact_methods
contact_addresses
contact_relationships
contact_tags
conflict_checks
conflict_check_results

matters
matter_clients
matter_participants
matter_members
matter_statuses
matter_stages
matter_stage_history
matter_templates
matter_timeline_items

custom_field_definitions
custom_field_values
tags
taggings

tasks
task_comments
task_reminders
task_templates

calendars
calendar_events
calendar_event_invitees
calendar_reminders
court_rule_sets
court_rule_generated_events

notes
note_versions

documents
document_versions
document_folders
document_categories
document_shares
document_templates
esign_requests

communications
email_logs
sms_threads
sms_messages
phone_logs
internal_messages
communication_attachments

activity_categories
time_entries
expense_entries
rates
rate_assignments

bills
bill_line_items
bill_approvals
bill_deliveries
bill_reminders
credit_notes
write_offs

payment_profiles
payment_transactions
payment_links
payment_plans
payment_plan_installments
refunds
disputes
settlement_batches

bank_accounts
ledger_accounts
ledger_entries
trust_ledger_entries
bank_transactions
reconciliations
journal_entries
vendor_bills

report_definitions
report_runs
report_schedules
saved_views

workflows
workflow_versions
workflow_runs
workflow_actions

integration_apps
oauth_connections
webhook_subscriptions
webhook_deliveries
sync_jobs

ai_requests
ai_sources
ai_drafts
ai_approvals
```

## 12. Nguồn tham khảo chính

- Clio Manage overview: https://www.clio.com/manage/
- Clio Features overview: https://www.clio.com/features/
- Case Management: https://www.clio.com/features/case-management/
- Contact Management: https://www.clio.com/features/contact-management/
- Calendaring: https://www.clio.com/features/legal-calendaring-software/
- Task Management: https://www.clio.com/features/task-management/
- Document Management: https://www.clio.com/features/legal-documents/
- Legal Billing: https://www.clio.com/features/legal-billing-software/
- Payments: https://www.clio.com/features/payments/
- Time & Expense Tracking: https://www.clio.com/features/legal-time-expense-tracking/
- Communications: https://www.clio.com/features/law-firm-communications/
- Client Portal: https://www.clio.com/features/legal-client-portal-software/
- Reporting/Insights: https://www.clio.com/features/law-firm-insights/
- Trust Account Management: https://www.clio.com/features/trust-account-management-software/
- Accounting: https://www.clio.com/features/legal-accounting-software/
- Manage AI: https://www.clio.com/features/legal-ai-software/
- Clio Help Center home/categories: https://help.clio.com/hc/en-us
- Matters Help Center: https://help.clio.com/hc/en-us/sections/48844790319515-Matters
- Contacts Help Center: https://help.clio.com/hc/en-us/sections/48844461015963-Contacts
- Custom Fields Help Center: https://help.clio.com/hc/en-us/sections/48844453674779-Custom-Fields
- Documents Help Center: https://help.clio.com/hc/en-us/sections/48844616829339-Documents
- Activities Help Center: https://help.clio.com/hc/en-us/sections/48844127612699-Activities
- Calendars Help Center: https://help.clio.com/hc/en-us/sections/48844191719195-Calendars
- Communications Help Center: https://help.clio.com/hc/en-us/sections/48844458395291-Communications
- Billing Help Center: https://help.clio.com/hc/en-us/sections/48844159218715-Billing
- Payments Help Center: https://help.clio.com/hc/en-us/sections/48844902695835-Payments
- Reports Help Center: https://help.clio.com/hc/en-us/sections/48844929330203-Reports
- Roles and Permissions in Clio Manage: https://help.clio.com/hc/en-us/articles/9200279456667-Roles-and-Permissions-in-Clio-Manage
- Clio Developer Hub: https://docs.developers.clio.com/
- Clio Security: https://www.clio.com/security/
