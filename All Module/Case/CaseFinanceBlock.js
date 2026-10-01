// ============================================================
// Case Finance tab — JS Block (Finance P3 + P4a, 2026-09-28)
// Spec:   docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md
// Plan:   docs/superpowers/plans/2026-09-28-finance-p3-finance-tab.md
// Design: https://claude.ai/artifact/XqRAYWFgcjU3yB46g2XhjK (layout synced 2026-09-28)
//
// The case's contract: what can be billed, what has been requested,
// invoiced and received, what is overdue — per contract type (By Case,
// By Service line, By Service combo, Retainer), with the actions the design
// canvas shows (issue / create requests, invoices, payments, retainer
// auto-billing, cancel, settlement). Numbers come from the columns the
// database derives (pgsql/finance_foundation.sql: paidAmount /
// outstandingAmount / overdueSince, invoice status); every action is
// re-checked by the database (pgsql/finance_billing_rules.sql), the dialogs
// only collect input and show the database's own sentences.
// Tables never scroll sideways: they are CSS grids that fold into cards when
// the block is narrow (container queries on the block itself).
// Visible to the case's Manager, the contract's Finance members
// (contracts.financeLawyers) and admins only.
// Paste into a JS Block on the Case detail page's "Finance" tab.
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
  "Request": "Yêu cầu",
  "Invoice": "Hóa đơn",
  "Payment": "Thanh toán",
  "Pending": "Chờ xử lý",
  "No invoice": "Không hóa đơn",
  "To invoice": "Cần xuất hóa đơn",
  "Paid": "Đã thanh toán",
  "Overdue": "Quá hạn",
  "Paid {0}%": "Đã thanh toán {0}%",
  "Something went wrong.": "Đã có lỗi xảy ra.",
  "No retainer plan.": "Chưa có kế hoạch retainer.",
  "The contract is terminated.": "Hợp đồng đã chấm dứt.",
  "Auto-billing is stopped — start it again first.": "Tự động thu phí đang dừng — hãy bật lại trước.",
  "No period left to bill.": "Không còn kỳ nào để thu.",
  "By Case · {0} · VND": "Theo hồ sơ · {0} · VND",
  "By Service · {0} · line pricing · VND": "Theo dịch vụ · {0} · giá theo dòng · VND",
  "By Service · Combo pricing · {0} · VND": "Theo dịch vụ · giá Combo · {0} · VND",
  "Retainer · no billing plan yet · VND": "Retainer · chưa có kế hoạch thu phí · VND",
  "Retainer · Every {0} · {1} · VND": "Retainer · mỗi {0} · {1} · VND",
  "{0} total": "tổng {0}",
  "{0} of {1} active": "{0}/{1} đang hiệu lực",
  "{0} of {1} triggered": "{0}/{1} đã kích hoạt",
  "Auto-billing not set up": "Chưa thiết lập tự động thu phí",
  "{0} of {1} requested": "{0}/{1} đã yêu cầu",
  "{0} requested": "{0} đã yêu cầu",
  "Billed early · {0}": "Thu sớm · {0}",
  "Created by hand": "Tạo thủ công",
  "Auto-requested": "Tự động tạo yêu cầu",
  "Stopped · moves to the end": "Đang dừng · dời xuống cuối",
  "Auto-request in {0}": "Tự động tạo yêu cầu sau {0}",
  "Auto-request today": "Tự động tạo yêu cầu hôm nay",
  "Auto-request on the next hourly run": "Tự động tạo yêu cầu ở lượt chạy hằng giờ tiếp theo",
  "Scheduled · paused": "Đã lên lịch · tạm dừng",
  "Scheduled": "Đã lên lịch",
  "New request": "Yêu cầu mới",
  "View request": "Xem yêu cầu",
  "Cancel request": "Hủy yêu cầu",
  "Issue now": "Phát hành ngay",
  "New invoice": "Hóa đơn mới",
  "New payment": "Khoản thanh toán mới",
  "View": "Xem",
  "Finance members": "Thành viên tài chính",
  "Lawyer {0}": "Luật sư {0}",
  "Case {0}": "Hồ sơ {0}",
  "To do": "Cần làm",
  "In progress": "Đang làm",
  "In review": "Đang xem xét",
  "Done": "Hoàn thành",
  "Task": "Công việc",
  "Not started": "Chưa bắt đầu",
  "{0}/{1} done": "{0}/{1} hoàn thành",
  "No trigger task": "Không có công việc kích hoạt",
  "Actions": "Thao tác",
  "Payment trigger tasks": "Công việc kích hoạt thanh toán",
  "This unit has no trigger task yet.": "Mục này chưa có công việc kích hoạt.",
  "Tick or untick “Payment trigger” on the tasks in the Tasks tab (Task Management).": "Đánh dấu hoặc bỏ đánh dấu “Payment trigger” trên các công việc ở tab Tasks (Task Management).",
  "Paid in full": "Đã thanh toán đủ",
  "Due {0} · {1} overdue": "Hạn {0} · quá hạn {1}",
  "Due {0}": "Hạn {0}",
  "Total": "Tổng",
  "Amount": "Số tiền",
  "Request › Invoice › Payment": "Yêu cầu › Hóa đơn › Thanh toán",
  "Received": "Đã nhận",
  "Remaining": "Còn lại",
  "Contract signed": "Ký hợp đồng",
  "Linked tasks done": "Công việc liên kết hoàn thành",
  "Case completed": "Hồ sơ hoàn tất",
  "Retainer period": "Kỳ retainer",
  "Installment {0}": "Đợt thanh toán {0}",
  "Due date set on activation": "Hạn được đặt khi kích hoạt",
  "Waiting": "Đang chờ",
  "Waiting: {0}": "Đang chờ: {0}",
  "No request — its last one was cancelled": "Chưa có yêu cầu — yêu cầu gần nhất đã bị hủy",
  "Payment schedule": "Lịch thanh toán",
  "Not reached": "Chưa đến",
  "Installment": "Đợt thanh toán",
  "Trigger": "Điều kiện kích hoạt",
  "This contract has no installments yet.": "Hợp đồng này chưa có đợt thanh toán.",
  "Service {0}": "Dịch vụ {0}",
  "incl. VAT {0}%": "gồm VAT {0}%",
  "{0}/{1} done · {2}": "{0}/{1} hoàn thành · {2}",
  "{0} still open": "{0} chưa xong",
  "This service will not create a payment request automatically.": "Dịch vụ này sẽ không tự động tạo yêu cầu thanh toán.",
  "Request created when {0} more task{1} Done": "Yêu cầu được tạo khi thêm {0} công việc Done",
  "Create the request by hand, or pick trigger tasks": "Tạo yêu cầu thủ công, hoặc chọn công việc kích hoạt",
  "Trigger tasks": "Công việc kích hoạt",
  "Set trigger": "Đặt kích hoạt",
  "Not in case": "Không thuộc hồ sơ",
  "No tasks yet — configure the trigger later in the Case / Task.": "Chưa có công việc — cấu hình kích hoạt sau trong Hồ sơ / Công việc.",
  "Added on the contract after the case was created": "Được thêm vào hợp đồng sau khi tạo hồ sơ",
  "Billing by service": "Thu phí theo dịch vụ",
  "Partly paid": "Thanh toán một phần",
  "Service": "Dịch vụ",
  "This contract has no services yet.": "Hợp đồng này chưa có dịch vụ.",
  "Reference": "Tham chiếu",
  "reference · {0}%": "tham khảo · {0}%",
  "{0}/{1} trigger tasks done": "{0}/{1} công việc kích hoạt hoàn thành",
  "All trigger tasks done": "Tất cả công việc kích hoạt đã hoàn thành",
  "All trigger tasks done · waiting for the rest of the combo": "Tất cả công việc kích hoạt đã hoàn thành · chờ phần còn lại của combo",
  "Service amounts are for reference only — the whole {0} is billed in one request of {1}.": "Số tiền từng dịch vụ chỉ để tham khảo — toàn bộ {0} được thu trong một yêu cầu {1}.",
  "Allocated 0 VND at contract creation — nothing to bill": "Phân bổ 0 VND khi tạo hợp đồng — không có gì để thu",
  "Created when {0} more trigger task{1} Done, as ": "Được tạo khi thêm {0} công việc kích hoạt Done, với tên ",
  "Create it by hand, or tick trigger tasks in Task Management": "Tạo thủ công, hoặc đánh dấu công việc kích hoạt trong Task Management",
  "allocated at contract": "phân bổ theo hợp đồng",
  "Show services in {0}": "Hiện dịch vụ trong {0}",
  "Request “{0}”": "Yêu cầu “{0}”",
  "Outside any combo · its own item": "Ngoài mọi combo · hạng mục riêng",
  "Trigger tasks have no effect": "Công việc kích hoạt không có tác dụng",
  "No trigger task — billed by hand": "Không có công việc kích hoạt — thu thủ công",
  "across {0}{1}": "trên {0}{1}",
  " · {0} still open": " · {0} chưa xong",
  "No trigger task in this combo": "Combo này không có công việc kích hoạt",
  "None of its services has a trigger task, so no request is ever created automatically.": "Không dịch vụ nào có công việc kích hoạt, nên sẽ không bao giờ tự động tạo yêu cầu.",
  "No request": "Chưa có yêu cầu",
  "Not in any billing item": "Không thuộc hạng mục thu phí nào",
  "not part of the allocation": "không nằm trong phân bổ",
  "Its tasks do not trigger any payment": "Các công việc của dịch vụ này không kích hoạt thanh toán",
  "Not billed": "Chưa thu",
  "Add it to a billing item on the contract to bill it": "Thêm vào một hạng mục thu phí trên hợp đồng để thu phí",
  "Contract value by billing item": "Giá trị hợp đồng theo hạng mục thu phí",
  "set when the contract was created": "được đặt khi tạo hợp đồng",
  "Allocated {0} / {1}": "Đã phân bổ {0} / {1}",
  "Billing items": "Hạng mục thu phí",
  "{0} · each billed as one request": "{0} · mỗi hạng mục thu bằng một yêu cầu",
  "Collapse all": "Thu gọn tất cả",
  "Expand all": "Mở rộng tất cả",
  "Billing item": "Hạng mục thu phí",
  "This contract has no billing items yet.": "Hợp đồng này chưa có hạng mục thu phí.",
  "Auto-billing": "Tự động thu phí",
  "Completed": "Đã hoàn tất",
  "Started": "Đang chạy",
  "Stopped": "Đang dừng",
  "Per period": "Mỗi kỳ",
  "the same fee each of {0}": "cùng mức phí cho mỗi kỳ trong {0}",
  "open-ended · billed every period": "không thời hạn · thu mỗi kỳ",
  "First billing": "Lần thu đầu",
  "End date: {0}": "Ngày kết thúc: {0}",
  "Stopped since": "Dừng từ",
  "Next auto-request": "Lần tự động tạo yêu cầu tiếp theo",
  "All periods billed": "Đã thu tất cả các kỳ",
  "in {0}": "sau {0}",
  "on the next hourly run": "ở lượt chạy hằng giờ tiếp theo",
  "Starts again on {0}": "Chạy lại vào {0}",
  "Starts again when ticked": "Chạy lại khi được đánh dấu",
  "End date": "Ngày kết thúc",
  "moves by skipped periods": "dời theo số kỳ bị bỏ qua",
  "Periods billed · {0}{1}": "Số kỳ đã thu · {0}{1}",
  "Untick to stop billing; periods skipped while stopped move to the end": "Bỏ đánh dấu để dừng thu phí; các kỳ bị bỏ qua khi dừng sẽ dời xuống cuối",
  "Reason: {0}": "Lý do: {0}",
  "Bill next period now": "Thu kỳ tiếp theo ngay",
  "Tick Auto-billing to start again first": "Đánh dấu Tự động thu phí để chạy lại trước",
  "No billing plan yet": "Chưa có kế hoạch thu phí",
  "This retainer has no auto-billing plan, so no period request is ever created. Set up how often and how much to bill; the hourly run then creates each period's request.": "Retainer này chưa có kế hoạch tự động thu phí, nên sẽ không bao giờ tạo yêu cầu theo kỳ. Hãy thiết lập tần suất và số tiền thu; lượt chạy hằng giờ sẽ tạo yêu cầu cho từng kỳ.",
  "New billing plan": "Kế hoạch thu phí mới",
  "Period {0}": "Kỳ {0}",
  "Bill now": "Thu ngay",
  "Period": "Kỳ",
  "Billing date": "Ngày thu",
  "Billing periods": "Các kỳ thu phí",
  "{0} · every {1}": "{0} · mỗi {1}",
  "Next": "Kế tiếp",
  "Contract": "Hợp đồng",
  "Settlement": "Quyết toán",
  "Combo": "Combo",
  "Payment Requests": "Yêu cầu thanh toán",
  "Invoices": "Hóa đơn",
  "Payments": "Thanh toán",
  "Payment request": "Yêu cầu thanh toán",
  "Request {0}": "Yêu cầu {0}",
  "Covers {0}": "Bao gồm {0}",
  "created {0}": "đã tạo {0}",
  "Unit": "Mục",
  "Due date": "Hạn",
  "Status": "Trạng thái",
  "Overdue {0}": "Quá hạn {0}",
  "its trigger": "điều kiện kích hoạt",
  "Invoice {0}": "Hóa đơn {0}",
  "Invoice no.": "Số hóa đơn",
  "For request": "Cho yêu cầu",
  "Issued": "Ngày xuất",
  "Date": "Ngày",
  "Method": "Phương thức",
  "Applied to": "Áp dụng cho",
  "{0} {1} no payment request yet — created when the last trigger task is Done, or by hand.": "{0} chưa có yêu cầu thanh toán — sẽ được tạo khi công việc kích hoạt cuối cùng Done, hoặc tạo thủ công.",
  "{0} has no payment request yet — it will be created as “{1}” when its last trigger task is Done.": "{0} chưa có yêu cầu thanh toán — sẽ được tạo với tên “{1}” khi công việc kích hoạt cuối cùng Done.",
  "{0} has no invoice yet — it can be issued once its payment request is active.": "{0} chưa có hóa đơn — có thể xuất khi yêu cầu thanh toán đã Active.",
  "{0} is active and not invoiced yet.": "{0} đang Active và chưa xuất hóa đơn.",
  "No payment requests yet.": "Chưa có yêu cầu thanh toán.",
  "No invoices yet.": "Chưa có hóa đơn.",
  "No payments recorded yet.": "Chưa ghi nhận khoản thanh toán nào.",
  "Terminated {0}": "Chấm dứt {0}",
  "Open contract": "Mở hợp đồng",
  "The case's Finance members (edited on Info Case). With the case Manager they are assigned to new payment requests, invoices and payments.": "Thành viên tài chính của hồ sơ (chỉnh ở Info Case). Cùng với Manager của hồ sơ, họ được gán vào các yêu cầu thanh toán, hóa đơn và khoản thanh toán mới.",
  "Finance members: {0}": "Thành viên tài chính: {0}",
  "New": "Tạo mới",
  "New settlement request": "Yêu cầu quyết toán mới",
  "New payment request": "Yêu cầu thanh toán mới",
  "Every installment already has an active payment request.": "Mọi đợt đều đã có yêu cầu thanh toán đang hiệu lực.",
  "No active payment request is waiting for an invoice.": "Không có yêu cầu thanh toán nào đang chờ xuất hóa đơn.",
  "No active payment request has money owed.": "Không có yêu cầu thanh toán nào còn nợ.",
  "Refresh": "Làm mới",
  "This contract is also used by {0}: {1}. Figures below cover the whole contract.": "Hợp đồng này cũng được dùng bởi {0}: {1}. Số liệu dưới đây tính cho toàn bộ hợp đồng.",
  "Contract value (incl. VAT)": "Giá trị hợp đồng (gồm VAT)",
  "Billed": "Đã thu",
  "Requested": "Đã yêu cầu",
  "Invoiced": "Đã xuất hóa đơn",
  "Outstanding": "Còn phải thu",
  "{0} overdue": "{0} quá hạn",
  "{0} due {1}": "{0} đến hạn {1}",
  "After you confirm": "Sau khi xác nhận",
  "Assigned to this record and notified about it.": "Được gán vào bản ghi này và nhận thông báo.",
  "Choose people": "Chọn người",
  "This service has no trigger task, so its payment request is never created automatically. Create it here when the work is ready to bill.": "Dịch vụ này không có công việc kích hoạt, nên yêu cầu thanh toán sẽ không bao giờ được tạo tự động. Hãy tạo tại đây khi công việc sẵn sàng để thu phí.",
  "Its trigger tasks are not all Done yet. Creating the request now bills this service early.": "Các công việc kích hoạt chưa Done hết. Tạo yêu cầu bây giờ sẽ thu sớm dịch vụ này.",
  "None of this combo's services has a trigger task, so its payment request is never created automatically. Create it here when the work is ready to bill.": "Không dịch vụ nào trong combo có công việc kích hoạt, nên yêu cầu thanh toán sẽ không bao giờ được tạo tự động. Hãy tạo tại đây khi công việc sẵn sàng để thu phí.",
  "Its trigger tasks are not all Done yet. Creating the request now bills the whole combo early.": "Các công việc kích hoạt chưa Done hết. Tạo yêu cầu bây giờ sẽ thu sớm toàn bộ combo.",
  "New combo payment request": "Yêu cầu thanh toán combo mới",
  "Create": "Tạo",
  "Allocated at contract · fixed": "Phân bổ theo hợp đồng · cố định",
  "Service amount on the contract · fixed": "Số tiền dịch vụ trên hợp đồng · cố định",
  "Request title": "Tiêu đề yêu cầu",
  "Same as an automatic combo request, so the combo is easy to recognise": "Giống yêu cầu combo tự động, để dễ nhận ra combo",
  "Same format as automatic requests: {service} - {contract}": "Cùng định dạng với yêu cầu tự động: {service} - {contract}",
  "Default: today + 7 days": "Mặc định: hôm nay + 7 ngày",
  "One payment request is created for the whole combo, with status Active, ready to invoice.": "Một yêu cầu thanh toán được tạo cho toàn bộ combo, trạng thái Active, sẵn sàng xuất hóa đơn.",
  "A payment request for this service is created with status Active, ready to invoice.": "Một yêu cầu thanh toán cho dịch vụ này được tạo ở trạng thái Active, sẵn sàng xuất hóa đơn.",
  "Ticking trigger tasks later will not create a second request for this combo.": "Đánh dấu công việc kích hoạt sau này sẽ không tạo yêu cầu thứ hai cho combo này.",
  "The service is marked as billed: ticking trigger tasks later will not create a second request.": "Dịch vụ được đánh dấu đã thu: đánh dấu công việc kích hoạt sau này sẽ không tạo yêu cầu thứ hai.",
  "Issue payment request": "Phát hành yêu cầu thanh toán",
  "no request": "chưa có yêu cầu",
  "{0}% of the contract": "{0}% hợp đồng",
  "Now": "Hiện tại",
  "Its last request was cancelled": "Yêu cầu gần nhất đã bị hủy",
  "The request becomes Active and can be invoiced right away.": "Yêu cầu chuyển sang Active và có thể xuất hóa đơn ngay.",
  "It no longer waits for “{0}”.": "Không còn chờ “{0}”.",
  "Termination settlement": "Quyết toán chấm dứt",
  "Still unbilled": "Chưa thu",
  "Amount to settle (VND)": "Số tiền quyết toán (VND)",
  "For the work actually done — at most {0}.": "Cho phần việc đã thực hiện — tối đa {0}.",
  "Cancel payment request": "Hủy yêu cầu thanh toán",
  "Give a reason to cancel this payment request.": "Vui lòng nhập lý do hủy yêu cầu thanh toán này.",
  "Reason (required)": "Lý do (bắt buộc)",
  "A cancelled request cannot be reopened; the unit can be billed again with a new request.": "Yêu cầu đã hủy không thể mở lại; mục này có thể được thu lại bằng một yêu cầu mới.",
  "{0} · {1} owed": "{0} · còn nợ {1}",
  "Still owed": "Còn nợ",
  "Invoice name": "Tên hóa đơn",
  "Deadline": "Hạn",
  "Default: the request's due date": "Mặc định: hạn của yêu cầu",
  "Amount (VND)": "Số tiền (VND)",
  "Default: the people of its payment request.": "Mặc định: những người của yêu cầu thanh toán.",
  "Save payment": "Lưu khoản thanh toán",
  "Not invoiced yet": "Chưa xuất hóa đơn",
  "Amount received (VND)": "Số tiền đã nhận (VND)",
  "More than what is owed — the request will show as paid.": "Nhiều hơn số còn nợ — yêu cầu sẽ hiển thị là đã thanh toán.",
  "Bank transaction code": "Mã giao dịch ngân hàng",
  "Scheduled auto-request": "Lịch tự động tạo yêu cầu",
  "Billed ahead of schedule": "Thu trước lịch",
  "Per period · fixed": "Mỗi kỳ · cố định",
  "Per period · open-ended": "Mỗi kỳ · không thời hạn",
  "Period {0} is still unpaid — {1}, {2} overdue.": "Kỳ {0} chưa thanh toán — {1}, quá hạn {2}.",
  "Billing Period {0} early does not change {1}.": "Thu sớm Kỳ {0} không làm thay đổi các kỳ này.",
  "A payment request for Period {0} is created now with status Active.": "Một yêu cầu thanh toán cho Kỳ {0} được tạo ngay ở trạng thái Active.",
  "This is the last period: auto-billing completes.": "Đây là kỳ cuối: tự động thu phí hoàn tất.",
  "Auto-billing skips Period {0}; the next auto-request moves to {1}.": "Tự động thu phí bỏ qua Kỳ {0}; lần tự động tạo yêu cầu tiếp theo dời sang {1}.",
  "Periods billed: {0}{1} → {2}{3}.": "Số kỳ đã thu: {0}{1} → {2}{3}.",
  "Stop auto-billing": "Dừng tự động thu phí",
  "Give a reason to stop auto-billing.": "Vui lòng nhập lý do dừng tự động thu phí.",
  "Use this when the service itself is paused. No period is billed while stopped, and none is lost: when billing starts again, the skipped periods move to the end and the contract end date moves by the same number of periods. To only delay a payment, change the request's due date instead.": "Dùng khi chính dịch vụ tạm dừng. Không kỳ nào được thu khi đang dừng, và cũng không kỳ nào bị mất: khi chạy lại, các kỳ bị bỏ qua dời xuống cuối và ngày kết thúc hợp đồng dời theo cùng số kỳ. Nếu chỉ muốn lùi một khoản thanh toán, hãy đổi hạn của yêu cầu.",
  "Start again": "Chạy lại",
  "When someone ticks Auto-billing again": "Khi có người đánh dấu lại Tự động thu phí",
  "Automatically on": "Tự động vào ngày",
  "Month": "Tháng",
  "Quarter": "Quý",
  "Year": "Năm",
  "Week": "Tuần",
  "Day": "Ngày",
  "Start auto-billing": "Bắt đầu tự động thu phí",
  "Duration": "Thời hạn",
  "A fixed number of periods — the amount is billed every period": "Số kỳ cố định — thu số tiền này mỗi kỳ",
  "Open-ended — the same amount every period, until stopped or the end date": "Không thời hạn — cùng số tiền mỗi kỳ, đến khi dừng hoặc tới ngày kết thúc",
  "Bill every": "Thu mỗi",
  "First billing date": "Ngày thu đầu tiên",
  "Number of periods": "Số kỳ",
  "{0} fit between the first billing date and the end date.": "{0} nằm giữa ngày thu đầu tiên và ngày kết thúc.",
  "Optional.": "Không bắt buộc.",
  "Optional — billing stops after it.": "Không bắt buộc — dừng thu sau ngày này.",
  "Amount per period (VND)": "Số tiền mỗi kỳ (VND)",
  "Contract amount per period: {0}": "Số tiền hợp đồng mỗi kỳ: {0}",
  "Contract value": "Giá trị hợp đồng",
  "{0} × per period": "{0} × mỗi kỳ",
  "Last billing date": "Ngày thu cuối",
  "The first period's request is created on {0} (Active, due 7 days later), then one every {1}.": "Yêu cầu của kỳ đầu được tạo vào {0} (Active, hạn sau 7 ngày), sau đó mỗi {1} một yêu cầu.",
  "Periods whose date has already passed are billed one per hourly run until the plan catches up.": "Các kỳ đã qua ngày sẽ được thu mỗi lượt chạy hằng giờ một kỳ cho đến khi kịp lịch.",
  "Stop / Start and Bill now work on this plan from the Auto-billing panel.": "Dừng / Chạy và Thu ngay áp dụng cho kế hoạch này từ khung Tự động thu phí.",
  "Each new request is assigned to the case's Finance members and Manager, who are notified.": "Mỗi yêu cầu mới được gán cho Thành viên tài chính và Manager của hồ sơ, họ sẽ nhận thông báo.",
  "Start auto-billing again": "Chạy lại tự động thu phí",
  "Skipped periods": "Số kỳ bị bỏ qua",
  "{0} fell while billing was stopped; they move to the end of the schedule.": "{0} rơi vào thời gian dừng thu; các kỳ này dời xuống cuối lịch.",
  "No billing date fell while billing was stopped; the schedule is unchanged.": "Không có ngày thu nào rơi vào thời gian dừng; lịch không thay đổi.",
  "Payment {0} · {1}": "Thanh toán {0} · {1}",
  "Save": "Lưu",
  "These people handle this record and are notified about it.": "Những người này xử lý bản ghi và nhận thông báo về nó.",
  "Add the case's Finance members and Manager": "Thêm Thành viên tài chính và Manager của hồ sơ",
  "Overdue since": "Quá hạn từ",
  "Created": "Ngày tạo",
  "Note": "Ghi chú",
  "Cancel reason": "Lý do hủy",
  "Invoices ({0})": "Hóa đơn ({0})",
  "No invoice yet.": "Chưa có hóa đơn.",
  "Payments ({0})": "Thanh toán ({0})",
  "No payment yet.": "Chưa có khoản thanh toán.",
  "Name": "Tên",
  "Payment {0}": "Thanh toán {0}",
  "Paid in currency": "Số tiền theo ngoại tệ",
  "Each service gets its own payment request, created automatically once ": "Mỗi dịch vụ có yêu cầu thanh toán riêng, được tạo tự động khi ",
  " of its trigger tasks are Done. The request's due date is set to 7 days after that. ": " công việc kích hoạt của dịch vụ đó Done. Hạn của yêu cầu được đặt sau đó 7 ngày. ",
  "Configure trigger tasks in the Tasks tab.": "Cấu hình công việc kích hoạt ở tab Tasks.",
  "Combo pricing: each combo is billed as ": "Giá Combo: mỗi combo được thu như ",
  "one package": "một gói",
  " trigger task across all of them is Done, one payment request is created, titled ": " công việc kích hoạt trong tất cả dịch vụ đã Done, một yêu cầu thanh toán được tạo với tiêu đề ",
  "{combo name} - {contract}": "{tên combo} - {contract}",
  "This combo contract was created before per-item billing: each service is still billed on its own trigger tasks.": "Hợp đồng combo này được tạo trước khi có thu phí theo hạng mục: mỗi dịch vụ vẫn được thu theo công việc kích hoạt riêng.",
  "No contract linked to this case": "Hồ sơ này chưa liên kết hợp đồng",
  "Payment schedule, payment requests, invoices and payments appear here once a contract is linked to the case.": "Lịch thanh toán, yêu cầu thanh toán, hóa đơn và khoản thanh toán sẽ hiện ở đây khi hồ sơ được liên kết hợp đồng.",
  "Finance is visible to the case manager and the contract's finance members.": "Finance chỉ hiển thị với manager của hồ sơ và thành viên tài chính của hợp đồng.",
  "Could not load the finance data.": "Không thể tải dữ liệu tài chính.",
  "Retry": "Thử lại",
  "Cash": "Tiền mặt",
  "Bank transfer": "Chuyển khoản",
  "Credit card": "Thẻ tín dụng",
  "Other": "Khác",
  "Auto": "Tự động",
  "Manual": "Thủ công",
  "day": "ngày",
  "week": "tuần",
  "month": "tháng",
  "quarter": "quý",
  "year": "năm",
  "period": "kỳ",
  "service": "dịch vụ",
  "installment": "đợt",
  "billing item": "hạng mục thu phí",
  "combo": "combo",
  "invoice": "hóa đơn",
  "item": "hạng mục",
  "other case": "hồ sơ khác",
  "payment request": "yêu cầu thanh toán",
  "trigger task": "công việc kích hoạt",
  "all": "tất cả",
  "every": "mọi",
  ". Trigger tasks are ticked inside the combo's services; once ": ". Công việc kích hoạt được đánh dấu trong các dịch vụ của combo; khi ",
  ". Due date = creation + 7 days.": ". Hạn = ngày tạo + 7 ngày.",
  "A new payment request “Đợt {0} - {1} - {2}” is created as Active.": "Một yêu cầu thanh toán mới “Đợt {0} - {1} - {2}” được tạo ở trạng thái Active.",
  "open-ended": "không thời hạn",
};
// ---- end ui language ----
const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);

// ---- finance helpers (pure; tested by scripts/tests/case-finance-block.test.js) ----
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const idKey = (v) =>
  v === null || v === undefined || v === "" ? null : String(v && typeof v === "object" ? v.id : v);
const lower = (v) => String(v === null || v === undefined ? "" : v).trim().toLowerCase();
// Vietnamese: the word translated, no plural ending
const plural = (n, word) => (tr(word) !== word ? `${n} ${tr(word)}` : `${n} ${word}${n === 1 ? "" : "s"}`);

const formatVnd = (n) => `${Math.round(toNum(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} VND`;
const isReceived = (status) => lower(status) === "received";
const paymentVnd = (p) => toNum(p && p.amount) * (toNum(p && p.exchangeRateToBase) || 1);

// Business dates are Vietnam dates (UTC+7), whatever the browser's zone.
const localDate = (v) => {
  if (!v) return null;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = new Date(s).getTime();
  if (Number.isNaN(t)) return s.slice(0, 10);
  return new Date(t + 7 * 3600 * 1000).toISOString().slice(0, 10);
};
const dmy = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
const daysBetween = (fromIso, toIso) => {
  const [y1, m1, d1] = String(fromIso).slice(0, 10).split("-").map(Number);
  const [y2, m2, d2] = String(toIso).slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
};

const financeMode = (contract, scheduleRows) => {
  if (!contract) return "none";
  const type = contract.contractType;
  if (type === "retainer") return "retainer";
  if (type === "byService") {
    return contract.pricingMode === "package" && (scheduleRows || []).length ? "byServiceCombo" : "byServiceLine";
  }
  return "byCase";
};

// The open (non-cancelled) request of a billing unit — the newest if several.
const openRequestFor = (requests, predicate) => {
  const open = (requests || []).filter((r) => r && lower(r.status) !== "cancelled" && predicate(r));
  open.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return open[0] || null;
};

const liveInvoicesFor = (request, invoices) =>
  request
    ? (invoices || []).filter(
        (i) => idKey(i.paymentRequestId) === idKey(request.id) && lower(i.status) !== "cancelled",
      )
    : [];

// Request › Invoice › Payment, as shown on every billing unit's row.
const requestFlow = (request, invoices) => {
  const step = (key, label, tone) => ({ key, label, tone });
  if (!request || lower(request.status) === "cancelled") {
    return {
      steps: [step("request", tr("Request"), "idle"), step("invoice", tr("Invoice"), "idle"), step("payment", tr("Payment"), "idle")],
      overdue: false,
    };
  }
  const status = lower(request.status);
  const requested = toNum(request.requestedAmount);
  const paid = toNum(request.paidAmount);
  const live = liveInvoicesFor(request, invoices);
  const overdue = !!request.overdueSince || live.some((i) => lower(i.status) === "overdue");
  const reqStep = status === "pending" ? step("request", tr("Pending"), "wait") : step("request", tr("Request"), "done");
  const paidInFull = requested > 0 && paid >= requested;
  const invStep = live.length
    ? step("invoice", tr("Invoice"), "done")
    : paidInFull
      ? step("invoice", tr("No invoice"), "idle") // invoicing is optional (D3)
      : status === "active"
        ? step("invoice", tr("To invoice"), "next")
        : step("invoice", tr("Invoice"), "idle");
  let payStep;
  if (requested > 0 && paid >= requested) payStep = step("payment", tr("Paid"), "done");
  else if (overdue && status === "active") payStep = step("payment", tr("Overdue"), "bad");
  else if (paid > 0) payStep = step("payment", tr("Paid {0}%", { 0: requested > 0 ? Math.floor((paid / requested) * 100) : 0 }), "part");
  else payStep = step("payment", tr("Payment"), "idle");
  return { steps: [reqStep, invStep, payStep], overdue: overdue && status === "active" && paid < requested };
};

const owingOf = (r) =>
  r.outstandingAmount === null || r.outstandingAmount === undefined
    ? toNum(r.requestedAmount) - toNum(r.paidAmount)
    : toNum(r.outstandingAmount);

// plans: a retainer's contract value is fee × periods (retainerContractValue).
const summarizeFinance = ({ contract, plans, requests, invoices, payments }) => {
  const value = retainerContractValue(contract, plans) ?? toNum(contract && contract.totalAmount);
  const open = (requests || []).filter((r) => lower(r.status) !== "cancelled");
  const active = open.filter((r) => lower(r.status) === "active");
  const requested = active.reduce((s, r) => s + toNum(r.requestedAmount), 0);
  const pendingRequested = open
    .filter((r) => lower(r.status) === "pending")
    .reduce((s, r) => s + toNum(r.requestedAmount), 0);
  const invoiced = (invoices || [])
    .filter((i) => !["draft", "cancelled"].includes(lower(i.status)))
    .reduce((s, i) => s + toNum(i.totalAmount), 0);
  const received = (payments || []).filter((p) => isReceived(p.paymentStatus)).reduce((s, p) => s + paymentVnd(p), 0);
  const outstanding = Math.max(value - received, 0);
  const overdue = active.filter((r) => r.overdueSince).reduce((s, r) => s + Math.max(owingOf(r), 0), 0);
  const dueNext = active
    .filter((r) => owingOf(r) > 0 && r.dueDate)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0];
  return {
    value,
    requested,
    pendingRequested,
    invoiced,
    received,
    receivedPct: value > 0 ? Math.floor((received / value) * 100) : 0,
    outstanding,
    overdue,
    nextDue: dueNext ? { date: String(dueNext.dueDate).slice(0, 10), amount: owingOf(dueNext), request: dueNext } : null,
  };
};

// JS twin of the SQL retainer_cycle_amount (pgsql/finance_billing_rules.sql):
// 2026-09-30 — a retainer's totalAmount is the fee of EVERY period (whole
// đồng), no longer split over the periods. cycles / period kept for callers.
// eslint-disable-next-line no-unused-vars
const retainerCycleAmount = (total, cycles, period) => Math.round(toNum(total));

// JS twin of contract_retainer_value (pgsql/contract_payment_status_workflow.sql):
// what a retainer contract is worth = fee × the plan's periods (open-ended:
// the periods billed so far, at least 1). The active plan wins, else the
// newest. null = not a retainer, or no plan yet.
const retainerContractValue = (contract, plans) => {
  if (lower(contract && contract.contractType) !== "retainer") return null;
  const list = (plans || [])
    .filter((p) => lower(p.planType) === "retainer")
    .sort((a, b) => (lower(b.status) === "active") - (lower(a.status) === "active") || toNum(b.id) - toNum(a.id));
  const plan = list[0];
  if (!plan) return null;
  const periods = toNum(plan.retainerTotalCycles) || Math.max(toNum(plan.retainerCyclesBilled), 1);
  const value = retainerCycleAmount(plan.totalAmount) * periods;
  return value > 0 ? value : null;
};

const addUnit = (isoDate, unit, times) => {
  if (!isoDate) return null;
  const [y, m, d] = String(isoDate).slice(0, 10).split("-").map(Number);
  const u = lower(unit) || "month";
  if (u === "day" || u === "week") {
    const dt = new Date(Date.UTC(y, m - 1, d + (u === "week" ? 7 : 1) * times));
    return dt.toISOString().slice(0, 10);
  }
  const months = (u === "quarter" ? 3 : u === "year" ? 12 : 1) * times;
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
};

// One row per retainer period: billed ones from their request, the next one
// (or "stopped"), then the scheduled ones. Open-ended: billed so far + next.
const retainerPeriods = (plan, requests, invoices, today) => {
  if (!plan) return [];
  const billed = toNum(plan.retainerCyclesBilled);
  const cycles = toNum(plan.retainerTotalCycles) || null;
  const last = cycles || billed + 1;
  const running = lower(plan.status) === "active" && !!plan.nextBillingDate;
  const planReqs = (requests || []).filter((r) => idKey(r.billingPlanId) === idKey(plan.id));
  const rows = [];
  for (let period = 1; period <= last; period += 1) {
    const request = openRequestFor(planReqs, (r) => toNum(r.cycleNo) === period);
    const amount = request ? toNum(request.requestedAmount) : retainerCycleAmount(plan.totalAmount, cycles, period);
    let state = "scheduled";
    let date = null;
    if (request) {
      const paid = toNum(request.paidAmount);
      state =
        amount > 0 && paid >= amount
          ? "paid"
          : requestFlow(request, invoices).overdue
            ? "overdue"
            : paid > 0
              ? "partial"
              : liveInvoicesFor(request, invoices).length
                ? "invoiced"
                : "requested";
    } else if (running && period === billed + 1) {
      date = String(plan.nextBillingDate).slice(0, 10);
      state = plan.isBillingActive === false ? "stopped" : "next";
    } else if (running && period > billed + 1) {
      date = addUnit(plan.nextBillingDate, plan.retainerUnit, period - billed - 1);
    }
    rows.push({ period, date, amount, request, state });
  }
  return rows;
};

const isAdminUser = (user) => {
  const role =
    (user && ((user.roles && user.roles[0] && user.roles[0].name) || user.role || user.systemRole)) || "";
  return role === "admin" || role === "root" || !!(user && (user.isAdmin === true || user.isSuperAdmin === true));
};

// Spec §10.2 (D6): the case's Manager, the contract's Finance members, admins.
const canViewFinance = ({ user, lawyerId, managerIds, financeLawyerIds }) => {
  if (isAdminUser(user)) return true;
  const me = idKey(lawyerId);
  if (!me) return false;
  return [...(managerIds || []), ...(financeLawyerIds || [])].some((id) => idKey(id) === me);
};

// ---- action helpers (Finance P4a) ----
// The server's own sentence (plpgsql RAISE EXCEPTION reaches the UI as the
// API error message), without the "error: " prefix.
const apiErrorMessage = (error) => {
  const fromApi =
    error && error.response && error.response.data && error.response.data.errors && error.response.data.errors[0];
  const raw = (fromApi && fromApi.message) || (error && error.message) || String(error || tr("Something went wrong."));
  return String(raw).replace(/^error:\s*/i, "");
};

// Which actions a request offers (the database re-checks every one of them).
const requestActions = (request, invoices, contract) => {
  const status = lower(request && request.status);
  if (!request || status === "cancelled") return { createInvoice: false, recordPayment: false, cancel: false };
  const live = liveInvoicesFor(request, invoices);
  const paid = toNum(request.paidAmount);
  return {
    createInvoice: status === "active" && live.length === 0,
    recordPayment: status === "active" && owingOf(request) > 0,
    cancel: live.length === 0 && paid <= 0,
  };
};

const unitCanBeBilledByHand = (request, contract) => !request && lower(contract && contract.status) !== "terminated";

const billNowPreview = (plan, contract) => {
  if (!plan) return { ok: false, reason: tr("No retainer plan.") };
  if (lower(contract && contract.status) === "terminated") return { ok: false, reason: tr("The contract is terminated.") };
  if (plan.isBillingActive === false) return { ok: false, reason: tr("Auto-billing is stopped — start it again first.") };
  if (lower(plan.status) !== "active" || !plan.nextBillingDate) return { ok: false, reason: tr("No period left to bill.") };
  const period = toNum(plan.retainerCyclesBilled) + 1;
  return {
    ok: true,
    period,
    amount: retainerCycleAmount(plan.totalAmount, toNum(plan.retainerTotalCycles) || null, period),
    scheduledDate: String(plan.nextBillingDate).slice(0, 10),
  };
};

// Mirror of finance_billing_plan_active_toggle (pgsql/finance_billing_rules.sql),
// for the confirmation text only — the database does the real shift.
// pausedAt is a timestamp; its business date is taken at UTC+7.
const startPreview = (plan, today) => {
  const t = String(today).slice(0, 10);
  const from = plan.pausedAt
    ? new Date(new Date(plan.pausedAt).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10)
    : t;
  let next = plan.nextBillingDate ? String(plan.nextBillingDate).slice(0, 10) : null;
  let skipped = 0;
  while (next && next < t && next >= from) {
    next = addUnit(next, plan.retainerUnit, 1);
    skipped += 1;
  }
  const end = plan.endDate ? String(plan.endDate).slice(0, 10) : null;
  return { skipped, nextBillingDate: next, endDate: end && skipped > 0 ? addUnit(end, plan.retainerUnit, skipped) : end };
};

const unbilledAmount = (contract, requests) =>
  toNum(contract && contract.totalAmount) -
  (requests || []).filter((r) => lower(r.status) !== "cancelled").reduce((s, r) => s + toNum(r.requestedAmount), 0);

// ---- view helpers (design canvas sync) ----
const UNIT_WORD = { day: "day", week: "week", month: "month", quarter: "quarter", year: "year" };
const retainerPlanOf = (plans) => (plans || []).find((p) => lower(p.planType) === "retainer") || null;

// The grey / teal / purple badge next to the contract code.
const modeBadge = (mode, d) => {
  const n = (list) => (list || []).length;
  if (mode === "byCase") return tr("By Case · {0} · VND", { 0: plural(n(d.schedules), "installment") });
  if (mode === "byServiceLine") return tr("By Service · {0} · line pricing · VND", { 0: plural(n(d.projectServices), "service") });
  if (mode === "byServiceCombo") return tr("By Service · Combo pricing · {0} · VND", { 0: plural(n(d.schedules), "billing item") });
  if (mode === "retainer") {
    const plan = retainerPlanOf(d.plans);
    if (!plan) return tr("Retainer · no billing plan yet · VND");
    const unit = UNIT_WORD[lower(plan.retainerUnit)] || "month";
    const cycles = toNum(plan.retainerTotalCycles);
    return tr("Retainer · Every {0} · {1} · VND", { 0: tr(unit), 1: cycles ? tr("{0} total", { 0: plural(cycles, unit) }) : tr("open-ended") });
  }
  return "";
};

// The small line under the Contract value / Requested / Invoiced tiles.
const kpiNotes = (mode, d) => {
  const requests = d.requests || [];
  const schedules = d.schedules || [];
  const services = d.projectServices || [];
  const liveInvoices = (d.invoices || []).filter((i) => !["draft", "cancelled"].includes(lower(i.status))).length;
  const invoiced = plural(liveInvoices, "invoice");
  const openFor = (predicate) => openRequestFor(requests, predicate);
  if (mode === "byCase") {
    const active = schedules.filter((s) => {
      const r = openFor((x) => idKey(x.contractPaymentScheduleId) === idKey(s.id));
      return r && lower(r.status) === "active";
    }).length;
    return {
      value: [services.length ? plural(services.length, "service") : null, plural(schedules.length, "installment")]
        .filter(Boolean)
        .join(" · "),
      requested: tr("{0} of {1} active", { 0: active, 1: plural(schedules.length, "payment request") }),
      invoiced,
    };
  }
  if (mode === "byServiceLine") {
    const triggered = services.filter((ps) => openFor((x) => idKey(x.projectServiceId) === idKey(ps.id))).length;
    return {
      value: `${plural(services.length, "service")}, billed separately`,
      requested: tr("{0} of {1} triggered", { 0: triggered, 1: plural(services.length, "service") }),
      invoiced,
    };
  }
  if (mode === "byServiceCombo") {
    const triggered = schedules.filter((s) => openFor((x) => idKey(x.contractPaymentScheduleId) === idKey(s.id))).length;
    const serviceCount = new Set((d.scheduleServices || []).map((x) => idKey(x.contractServiceId))).size;
    return {
      value: `${plural(schedules.length, "combo")} · ${plural(serviceCount, "service")}`,
      requested: tr("{0} of {1} triggered", { 0: triggered, 1: plural(schedules.length, "combo") }),
      invoiced,
    };
  }
  if (mode === "retainer") {
    const plan = retainerPlanOf(d.plans);
    if (!plan) return { value: "No billing plan yet", requested: tr("Auto-billing not set up"), invoiced };
    const cycles = toNum(plan.retainerTotalCycles);
    const billed = toNum(plan.retainerCyclesBilled);
    return {
      value: cycles
        ? `${plural(cycles, "period")} × ${formatVnd(retainerCycleAmount(plan.totalAmount, cycles, 1))}`
        : `${formatVnd(plan.totalAmount)} per period · open-ended`,
      requested: cycles ? tr("{0} of {1} requested", { 0: billed, 1: plural(cycles, "period") }) : tr("{0} requested", { 0: plural(billed, "period") }),
      invoiced,
    };
  }
  return { value: "", requested: "", invoiced };
};

const snapshotOf = (r) => {
  const s = r && r.sourceSnapshot;
  if (!s) return {};
  if (typeof s === "string") {
    try {
      return JSON.parse(s) || {};
    } catch (e) {
      return {};
    }
  }
  return s;
};

// Where a request came from: its trigger, a person, Bill now, a settlement.
const requestSource = (r) => {
  const billing = lower(snapshotOf(r).billing);
  if (billing === "retainer_bill_now") return "Bill now";
  if (billing === "termination_settlement") return "Settlement";
  if (billing.endsWith("_manual") || lower(r && r.triggerType) === "manual") return "Manual";
  return "Auto";
};

// Top "Invoice" button: active requests still owed and not invoiced yet.
const invoiceCandidates = (requests, invoices) =>
  (requests || []).filter(
    (r) => lower(r.status) === "active" && owingOf(r) > 0 && liveInvoicesFor(r, invoices).length === 0,
  );
// Top "Record Payment" button: active requests with money owed.
const paymentCandidates = (requests) =>
  (requests || []).filter((r) => lower(r.status) === "active" && owingOf(r) > 0);

// By Case "+ Payment Request": a pending installment can be issued now; one
// whose request was cancelled gets a new request. Active ones are skipped.
const installmentIssueOptions = (schedules, requests) =>
  [...(schedules || [])]
    .sort((a, b) => toNum(a.installmentNo) - toNum(b.installmentNo))
    .map((schedule) => {
      const request = openRequestFor(requests, (r) => idKey(r.contractPaymentScheduleId) === idKey(schedule.id));
      if (request && lower(request.status) === "pending") return { schedule, request, action: "issue" };
      if (!request) return { schedule, request: null, action: "create" };
      return null;
    })
    .filter(Boolean);

const overdueDays = (request, today) => {
  if (!request || !request.overdueSince || !request.dueDate) return 0;
  return Math.max(daysBetween(localDate(request.dueDate), today), 0);
};

// The note under a retainer period's billing date.
const retainerPeriodNote = (p, plan, today) => {
  if (p.request) {
    const when = dmy(localDate(p.request.createdAt));
    const source = requestSource(p.request);
    if (source === "Bill now") return tr("Billed early · {0}", { 0: when });
    return `${source === "Manual" ? tr("Created by hand") : tr("Auto-requested")} · ${when}`;
  }
  if (p.state === "stopped") return tr("Stopped · moves to the end");
  if (p.state === "next") {
    const days = daysBetween(today, p.date);
    if (days > 0) return tr("Auto-request in {0}", { 0: plural(days, "day") });
    if (days === 0) return tr("Auto-request today");
    return tr("Auto-request on the next hourly run");
  }
  return plan && plan.isBillingActive === false ? tr("Scheduled · paused") : tr("Scheduled");
};

// Row actions: one primary link + the rest in the "⋯" menu. `opts.canCreate`
// = the unit may be billed by hand; `opts.waiting` = its trigger tasks are
// still open (billing early is then a menu item, not the main action).
const unitActions = (request, invoices, contract, opts) => {
  const o = opts || {};
  if (!request || lower(request.status) === "cancelled") {
    if (!o.canCreate || !unitCanBeBilledByHand(null, contract)) return { primary: null, menu: [] };
    const create = { key: "create", label: tr("New request") };
    return o.waiting ? { primary: null, menu: [create] } : { primary: create, menu: [] };
  }
  const acts = requestActions(request, invoices, contract);
  const view = { key: "view", label: tr("View request") };
  const cancel = acts.cancel ? [{ key: "cancel", label: tr("Cancel request"), danger: true }] : [];
  if (lower(request.status) === "pending") {
    return { primary: { key: "issue", label: tr("Issue now") }, menu: [view, ...cancel] };
  }
  const owing = owingOf(request) > 0;
  const invoice = acts.createInvoice ? { key: "invoice", label: tr("New invoice") } : null;
  const payment = acts.recordPayment ? { key: "payment", label: tr("New payment") } : null;
  if (invoice && owing) return { primary: invoice, menu: [...(payment ? [payment] : []), view, ...cancel] };
  if (payment) return { primary: payment, menu: [view, ...cancel] };
  return { primary: { key: "view", label: tr("View") }, menu: [...(invoice ? [invoice] : []), ...cancel] };
};

// Payment Requests table (Records): invoice first or payment first is the
// person's choice, so both are buttons; the rest sits in the "⋯" menu.
const recordRequestActions = (request, invoices, contract) => {
  const status = lower(request && request.status);
  const members = { key: "members", label: tr("Finance members") };
  if (!request || status === "cancelled") return { buttons: [], menu: [members] };
  const acts = requestActions(request, invoices, contract);
  const cancel = acts.cancel ? [{ key: "cancel", label: tr("Cancel request"), danger: true }] : [];
  if (status === "pending") {
    return {
      buttons: idKey(request.contractPaymentScheduleId) ? [{ key: "issue", label: tr("Issue now") }] : [],
      menu: [members, ...cancel],
    };
  }
  const buttons = [];
  if (acts.createInvoice) buttons.push({ key: "invoice", label: tr("New invoice") });
  if (acts.recordPayment) buttons.push({ key: "payment", label: tr("New payment") });
  return { buttons, menu: [members, ...cancel] };
};

// ---- retainer plan set up from the tab ----
// Billing dates from startDate (every `unit`) that fall on or before endDate;
// null without an end date (open-ended).
const periodsBetween = (startIso, endIso, unit) => {
  if (!startIso || !endIso) return null;
  const end = String(endIso).slice(0, 10);
  let count = 0;
  while (count < 1000 && addUnit(startIso, unit, count) <= end) count += 1;
  return count;
};
// What the plan will bill: the fee every period, the contract value (fixed
// number of periods only) and the last billing date.
const planSetupPreview = ({ total, cycles, unit, startDate }) => {
  const c = toNum(cycles) || null;
  const perPeriod = retainerCycleAmount(total, c, 1);
  return {
    perPeriod,
    contractValue: c ? perPeriod * c : null,
    lastDate: c && startDate ? addUnit(startDate, unit, c - 1) : null,
  };
};

// ---- Finance members (projects / paymentRequests / invoices / payments .financeMembers) ----
const memberIdsOf = (record) => ((record && record.financeMembers) || []).map((m) => idKey(m)).filter(Boolean);
// Finance members + Manager of every case of the contract, once each — JS twin
// of finance_default_member_ids (pgsql/finance_members.sql).
const defaultMemberIds = (cases) => {
  const ids = new Set();
  (cases || []).forEach((c) => {
    memberIdsOf(c).forEach((id) => ids.add(id));
    if (idKey(c && c.managerId)) ids.add(idKey(c.managerId));
  });
  return [...ids].sort((a, b) => toNum(a) - toNum(b));
};
// Action buttons: none, one button, or — from two up — one menu.
const groupActions = (items) => {
  const list = (items || []).filter(Boolean);
  return { mode: list.length === 0 ? "none" : list.length === 1 ? "single" : "menu", items: list };
};
const lawyerLabel = (l) => (l && (l.lawyerName || l.nickname || l.fullName || l.name)) || tr("Lawyer {0}", { 0: l && l.id });
const membersText = (ids, lawyersById) => {
  const names = (ids || []).map((id) => (lawyersById[id] ? lawyerLabel(lawyersById[id]) : tr("Lawyer {0}", { 0: id })));
  return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");
};
// ---- end finance helpers ----

// ============================================================
// Loader + view
// ============================================================
const { React } = ctx;
const { useState, useEffect, useMemo } = React;
const { Alert, Empty, Spin, Button, Tooltip, Modal, Input, InputNumber, Select, Radio, Dropdown, Drawer } =
  ctx.antd;

const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const C = {
  text: "#1f1f1f",
  muted: "#6b6b6b",
  faint: "#8c8c8c",
  line: "#f0f0f0",
  card: "#ffffff",
  page: "#f5f5f5",
  accent: "#1677ff",
  blue: "#0958d9",
  green: "#389e0d",
  orange: "#d46b08",
  red: "#cf1322",
  amber: "#ad4e00",
  purple: "#531dab",
  teal: "#08979c",
};
const TONES = {
  idle: { bg: "#fafafa", bd: "#f0f0f0", fg: "#8c8c8c" },
  wait: { bg: "#fffbe6", bd: "#ffe58f", fg: "#ad4e00" },
  next: { bg: "#e6f4ff", bd: "#91caff", fg: "#0958d9" },
  done: { bg: "#f6ffed", bd: "#b7eb8f", fg: "#389e0d" },
  part: { bg: "#fff7e6", bd: "#ffd591", fg: "#d46b08" },
  bad: { bg: "#fff1f0", bd: "#ffa39e", fg: "#cf1322" },
  grey: { bg: "#fafafa", bd: "#d9d9d9", fg: "#595959" },
};
const MODE_BADGE_TONE = {
  byCase: { bg: "#f5f5f5", fg: "#595959" },
  byServiceLine: { bg: "#e6fffb", fg: "#08979c" },
  byServiceCombo: { bg: "#e6fffb", fg: "#08979c" },
  retainer: { bg: "#f9f0ff", fg: "#531dab" },
};

// Contract detail page of this NocoBase instance — the same view as
// DETAIL_VIEW_ROUTES.contract in All Module/Case/CaseServices.js; {id} = contract id.
const CONTRACT_DETAIL_PATH = "/admin/xosxz5frfxb/view/869cc2fcc6b/filterbytk/{id}";

// Tables are CSS grids; below 900px of block width a row becomes a card with
// labelled cells (two per line, long ones full width). No sideways scrolling.
const CSS = `
.cfb-root{container-type: inline-size;container-name:cfb;font-variant-numeric:tabular-nums}
.cfb-root *{box-sizing:border-box}
.cfb-strip{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding-bottom:16px;border-bottom:1px solid #f0f0f0}
.cfb-strip-id{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;min-width:0;flex:1 1 380px}
.cfb-strip-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.cfb-kpis{display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:12px}
.cfb-card{border:1px solid #f0f0f0;border-radius:8px;background:#fff;overflow:hidden}
.cfb-card-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:12px 16px}
.cfb-legend{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;font-size:12px;color:#8c8c8c;margin-left:auto}
.cfb-head,.cfb-row{display:grid;grid-template-columns:var(--cfb-cols);column-gap:12px;align-items:center;padding:0 16px}
.cfb-head{min-height:44px;background:#fafafa;border-top:1px solid #f0f0f0;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#595959}
.cfb-row{padding-top:12px;padding-bottom:12px;border-top:1px solid #f0f0f0;font-size:14px}
.cfb-row.cfb-foot{background:#fafafa;font-weight:600}
.cfb-row.cfb-sub{background:#fcfcfc;font-size:13px;padding-top:10px;padding-bottom:10px}
.cfb-cell{min-width:0;overflow-wrap:anywhere}
.cfb-r{text-align:right}
.cfb-lbl{display:none}
.cfb-note{padding:10px 16px;border-top:1px solid #f0f0f0;font-size:13px;color:#6b6b6b}
.cfb-tabs{display:flex;flex-wrap:wrap;gap:0 8px;padding:0 16px;border-bottom:1px solid #f0f0f0}
.cfb-panel{display:flex;flex-wrap:wrap;align-items:flex-start;gap:16px 28px;padding:16px 18px;border-radius:8px}
.cfb-fact{display:flex;flex-direction:column;gap:3px;min-width:130px}
@container cfb (max-width: 900px){
  .cfb-head{display:none}
  .cfb-row{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:10px}
  .cfb-row .cfb-wide{grid-column:1 / -1}
  .cfb-row .cfb-empty{display:none}
  .cfb-r{text-align:left}
  .cfb-lbl{display:block;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#8c8c8c;margin-bottom:3px}
  .cfb-legend{margin-left:0}
}
@container cfb (max-width: 520px){
  .cfb-strip-actions{width:100%}
  .cfb-strip-actions > *{flex:1 1 auto}
}
`;

const recordIdFromUrl = () => {
  const parts = String(window.location.pathname || "").split("/");
  const index = parts.indexOf("filterbytk");
  return index >= 0 ? parts[index + 1] : null;
};
const CASE_ID = idKey(ctx.record?.id) || idKey(ctx.popup?.record?.id) || recordIdFromUrl();

const fmtDate = (v) => (v ? dmy(localDate(v)) : "—");
const monthLabel = (v) => {
  const d = localDate(v);
  return d ? `${d.slice(5, 7)}/${d.slice(0, 4)}` : "";
};
const pct = (part, whole) => (toNum(whole) > 0 ? Math.round((toNum(part) / toNum(whole)) * 100) : 0);
const caseLabel = (c) => (c ? c.caseCode || c.projectName || tr("Case {0}", { 0: c.id }) : "");
const contractHref = (id) => {
  if (!CONTRACT_DETAIL_PATH || !id) return null;
  const origin = (window.location && window.location.origin) || "";
  return `${origin}${CONTRACT_DETAIL_PATH.replace("{id}", encodeURIComponent(String(id)))}`;
};

const listAll = async (resource, filter, { fields, appends } = {}) => {
  const params = { filter: JSON.stringify(filter), paginate: false };
  if (fields) params.fields = fields;
  if (appends) params.appends = appends;
  const res = await ctx.api.request({ url: `${resource}:list`, params });
  return res?.data?.data || [];
};
// financeMembers exists once JsField/RegisterFinanceMembersFields.js has run;
// before that the lists load without it.
const listWithMembers = async (resource, filter) => {
  try {
    return await listAll(resource, filter, { appends: ["financeMembers"] });
  } catch (appendError) {
    return listAll(resource, filter);
  }
};

const TASK_FIELDS = [
  "id",
  "title",
  "status",
  "projectId",
  "projectServiceId",
  "isPaymentTrigger",
  "linkedPaymentRequestId",
  "taskIndex",
];

// Everything the tab shows, for the contract of the case. Access is decided
// (spec §10.2) before any finance list is requested.
const loadFinance = async (caseId) => {
  const done = (next) => next;
  try {
        if (!caseId) return done({ kind: "none" });
        const authRes = await ctx.api.request({ url: "auth:check", method: "GET" });
        const user = authRes?.data?.data || null;
        const mine = user?.id ? await listAll("lawyers", { userId: { $eq: user.id } }, { fields: ["id", "userId"] }) : [];
        const lawyerId = mine[0]?.id || null;

        const caseRes = await ctx.api.request({ url: "projects:get", params: { filterByTk: caseId } });
        const theCase = caseRes?.data?.data || null;
        const contractId = idKey(theCase?.contractId);
        if (!contractId) return done({ kind: "none" });

        const contractRes = await ctx.api.request({ url: "contracts:get", params: { filterByTk: contractId } });
        const contract = contractRes?.data?.data || null;
        // Finance members live on the cases (Info Case), for every case of the contract.
        const cases = await listWithMembers("projects", { contractId: { $eq: contractId } });
        const managerIds = cases.map((c) => c.managerId).filter((v) => v !== null && v !== undefined);
        const financeLawyerIds = cases.flatMap(memberIdsOf);
        if (!canViewFinance({ user, lawyerId, managerIds, financeLawyerIds })) {
          return { kind: "denied" };
        }

        const byContract = { contractId: { $eq: contractId } };
        const [requests, invoices, payments, schedules, plans, contractServices, lawyers] = await Promise.all([
          listWithMembers("paymentRequests", byContract),
          listWithMembers("invoices", byContract),
          listWithMembers("payments", byContract),
          listAll("contractPaymentSchedules", byContract),
          listAll("contractBillingPlans", byContract),
          listAll("contractServices", byContract),
          listAll("lawyers", {}),
        ]);
        const scheduleIds = schedules.map((s) => s.id);
        const caseIds = cases.map((c) => c.id);
        const [scheduleServices, projectServices, tasks] = await Promise.all([
          scheduleIds.length
            ? listAll("contractPaymentScheduleServices", { contractPaymentScheduleId: { $in: scheduleIds } })
            : [],
          caseIds.length ? listAll("projectServices", { projectId: { $in: caseIds } }) : [],
          caseIds.length ? listAll("tasks", { projectId: { $in: caseIds } }, { fields: TASK_FIELDS }) : [],
        ]);
        return done({
          kind: "ready",
          data: {
            theCase,
            contract,
            cases,
            requests,
            invoices,
            payments,
            schedules,
            plans,
            contractServices,
            scheduleServices,
            projectServices,
            tasks,
            lawyers,
            lawyersById: Object.fromEntries(lawyers.map((l) => [idKey(l.id), l])),
          },
        });
  } catch (error) {
    console.error("[CaseFinanceBlock] load failed", error);
    return { kind: "error", error };
  }
};

// Reloads shown with a spinner (first load, after an action, Refresh) and a
// silent reload every POLL_MS that re-renders only when something changed —
// so a request created by a trigger, a payment recorded elsewhere or the daily
// overdue refresh shows up without touching the page. A failed silent reload
// keeps what is on screen.
const POLL_MS = 20000;
const useFinanceData = (caseId, reloadKey, pollKey) => {
  const [state, setState] = useState({ kind: "loading" });
  const shown = React.useRef("");
  useEffect(() => {
    let cancelled = false;
    setState((prev) => (prev.kind === "ready" ? { ...prev, refreshing: true } : { kind: "loading" }));
    loadFinance(caseId).then((next) => {
      if (cancelled) return;
      shown.current = next.kind === "ready" ? JSON.stringify(next.data) : "";
      setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [caseId, reloadKey]);
  useEffect(() => {
    if (!pollKey) return undefined;
    let cancelled = false;
    loadFinance(caseId).then((next) => {
      if (cancelled || next.kind !== "ready") return;
      const json = JSON.stringify(next.data);
      if (json === shown.current) return;
      shown.current = json;
      setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [pollKey]);
  return state;
};

// ---- small presentational pieces ----
const h = React.createElement;

const ICONS = {
  check: [["path", { d: "M5 12l5 5 9-10" }]],
  plus: [["path", { d: "M12 5v14M5 12h14" }]],
  refresh: [["path", { d: "M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" }]],
  external: [["path", { d: "M7 17L17 7M9 7h8v8" }]],
  contract: [["rect", { x: 5, y: 3, width: 14, height: 18, rx: 1 }], ["path", { d: "M8 8h8M8 12h8M8 16h5" }]],
  info: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M12 11v5M12 8h.01" }]],
  warn: [["path", { d: "M12 3l10 18H2z" }], ["path", { d: "M12 10v4M12 17h.01" }]],
  clock: [["circle", { cx: 12, cy: 12, r: 8 }], ["path", { d: "M12 8v4l3 2" }]],
  half: [["circle", { cx: 12, cy: 12, r: 8 }], ["path", { d: "M12 4a8 8 0 0 1 0 16z", fill: "currentColor" }]],
  right: [["path", { d: "M9 6l6 6-6 6" }]],
  down: [["path", { d: "M6 9l6 6 6-6" }]],
};
const Icon = ({ name, size = 14, color }) =>
  h(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: size,
      height: size,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.8,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: { flexShrink: 0, color, display: "block" },
    },
    ...(ICONS[name] || []).map(([tag, attrs], i) => h(tag, { key: i, ...attrs })),
  );

const PILL_ICON = { done: "check", part: "half", bad: "warn", wait: "clock" };
// Rounded pill: the Request › Invoice › Payment steps and task chips.
const Pill = ({ tone, children, title }) => {
  const t = TONES[tone] || TONES.idle;
  const icon = PILL_ICON[tone];
  return h(
    "span",
    {
      title,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        background: t.bg,
        border: `1px solid ${t.bd}`,
        borderRadius: 12,
        color: t.fg,
        fontSize: 12,
        lineHeight: "18px",
        whiteSpace: "nowrap",
        maxWidth: "100%",
      },
    },
    icon
      ? h(Icon, { name: icon, size: 12 })
      : tone === "next"
        ? h("span", { style: { width: 6, height: 6, borderRadius: 3, background: t.fg, flexShrink: 0 } })
        : null,
    h("span", { style: { overflow: "hidden", textOverflow: "ellipsis" } }, children),
  );
};

// Square tag: record statuses (Active, Partial, Received…).
const StatusTag = ({ tone, children }) => {
  const t = TONES[tone] || TONES.grey;
  return h(
    "span",
    {
      style: {
        display: "inline-block",
        padding: "1px 8px",
        background: t.bg,
        border: `1px solid ${t.bd}`,
        borderRadius: 4,
        color: t.fg,
        fontSize: 12,
        lineHeight: "20px",
        whiteSpace: "nowrap",
      },
    },
    children,
  );
};

const Sub = ({ children, tone }) =>
  h("span", { style: { fontSize: 12, color: tone || C.faint, lineHeight: 1.45 } }, children);

// Long text cut to `lines` lines; the whole text shows on hover.
const Clamp = ({ lines = 2, children, title, style }) =>
  h(
    "span",
    {
      title: title || (typeof children === "string" ? children : undefined),
      style: {
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        overflowWrap: "anywhere",
        ...(style || {}),
      },
    },
    children,
  );

const Money = ({ value, tone, weight }) =>
  h("span", { style: { fontWeight: weight || 600, color: tone || C.text, whiteSpace: "nowrap" } }, formatVnd(value));

const Stack = ({ children, gap = 3, align }) =>
  h("div", { style: { display: "flex", flexDirection: "column", gap, alignItems: align, minWidth: 0 } }, children);

const FlowSteps = ({ flow, hint, hintTone }) =>
  h(
    Stack,
    { gap: 6 },
    h(
      "div",
      { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 } },
      ...flow.steps.flatMap((s, i) => [
        h(Pill, { key: s.key, tone: s.tone }, s.label),
        i < flow.steps.length - 1 ? h("span", { key: `${s.key}-sep`, style: { color: "#bfbfbf" } }, "›") : null,
      ]),
    ),
    hint ? h(Sub, { tone: hintTone || C.muted }, hint) : null,
  );

const TASK_STATUS_LABEL = {
  todo: tr("To do"),
  to_do: tr("To do"),
  in_progress: tr("In progress"),
  doing: tr("In progress"),
  review: tr("In review"),
  in_review: tr("In review"),
  pending: tr("Pending"),
  done: tr("Done"),
};
const shortTitle = (t) => (t && t.length > 30 ? `${t.slice(0, 28)}…` : t || tr("Task"));
const TaskChip = ({ task }) => {
  const st = lower(task.status);
  if (st === "done") return h(Pill, { tone: "done", title: task.title }, shortTitle(task.title));
  const label = TASK_STATUS_LABEL[st] || (st ? st.charAt(0).toUpperCase() + st.slice(1) : tr("Not started"));
  return h(
    Pill,
    { tone: st === "in_progress" || st === "doing" ? "next" : "idle", title: task.title },
    `${shortTitle(task.title)} · ${label}`,
  );
};

const ProgressLine = ({ done, total, text }) => {
  const all = total > 0 && done >= total;
  return h(
    "div",
    { style: { display: "flex", alignItems: "center", gap: 8 } },
    h(
      "div",
      { style: { width: 90, height: 6, background: C.line, borderRadius: 3, overflow: "hidden", flexShrink: 0 } },
      h("div", { style: { width: `${pct(done, total)}%`, height: 6, background: all ? "#52c41a" : "#4096ff" } }),
    ),
    h("span", { style: { fontSize: 12, color: all ? C.green : C.blue } }, text || tr("{0}/{1} done", { 0: done, 1: total })),
  );
};

const NoTriggerTag = ({ text }) =>
  h(
    "span",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-start",
        padding: "2px 8px",
        background: "#fffbe6",
        border: "1px solid #ffe58f",
        borderRadius: 4,
        fontSize: 12,
        color: C.amber,
      },
    },
    h(Icon, { name: "warn", size: 12 }),
    text,
  );

// Trigger tasks of a unit: progress, chips, and a note.
const TriggerCell = ({ tasks, doneText, note, emptyText, emptyNote }) => {
  if (!tasks.length) {
    return h(
      Stack,
      { gap: 6 },
      h(NoTriggerTag, { text: emptyText || tr("No trigger task") }),
      emptyNote ? h(Sub, { tone: C.amber }, emptyNote) : null,
    );
  }
  const doneCount = tasks.filter((t) => lower(t.status) === "done").length;
  return h(
    Stack,
    { gap: 6 },
    h(ProgressLine, { done: doneCount, total: tasks.length, text: doneCount === tasks.length && doneText ? doneText : null }),
    h("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 } }, ...tasks.map((t) => h(TaskChip, { key: t.id, task: t }))),
    note ? h(Sub, null, note) : null,
  );
};

const LegendDot = ({ color, label }) =>
  h(
    "span",
    { style: { display: "inline-flex", alignItems: "center", gap: 5 } },
    h("span", { style: { width: 8, height: 8, borderRadius: 4, background: color } }),
    label,
  );

const Card = ({ title, extra, legend, right, children }) =>
  h(
    "div",
    { className: "cfb-card" },
    title || extra || legend || right
      ? h(
          "div",
          { className: "cfb-card-head" },
          title ? h("span", { style: { fontSize: 16, fontWeight: 600 } }, title) : null,
          extra ? h("span", { style: { fontSize: 14, color: C.faint } }, extra) : null,
          legend ? h("span", { className: "cfb-legend" }, ...legend.map(([color, label]) => h(LegendDot, { key: label, color, label }))) : null,
          right || null,
        )
      : null,
    children,
  );

const Banner = ({ tone = "teal", children }) => {
  const t =
    tone === "teal"
      ? { bg: "#e6fffb", bd: "#87e8de", fg: "#00474f" }
      : tone === "amber"
        ? { bg: "#fffbe6", bd: "#ffe58f", fg: "#613400" }
        : { bg: "#e6f4ff", bd: "#91caff", fg: "#002c8c" };
  return h(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 16px",
        background: t.bg,
        border: `1px solid ${t.bd}`,
        borderRadius: 8,
        fontSize: 13,
        lineHeight: 1.6,
        color: t.fg,
      },
    },
    h("span", { style: { paddingTop: 3 } }, h(Icon, { name: "info", size: 16 })),
    h("span", { style: { flex: 1, minWidth: 0 } }, children),
  );
};

// ---- responsive grid table ----
// columns: [{ key, title, track (grid track), align: "right", wide, render(row), foot() }]
const gridCell = (col, content, { showLabel = true } = {}) => {
  const empty = content === null || content === undefined || content === false || content === "";
  return h(
    "div",
    {
      key: col.key,
      className: `cfb-cell${col.align === "right" ? " cfb-r" : ""}${col.wide ? " cfb-wide" : ""}${empty ? " cfb-empty" : ""}`,
    },
    showLabel && col.title && !empty ? h("span", { className: "cfb-lbl" }, col.title) : null,
    empty ? null : content,
  );
};
const gridStyle = (columns, extra) => ({ "--cfb-cols": columns.map((c) => c.track).join(" "), ...(extra || {}) });

const DataGrid = ({ columns, rows, footer }) =>
  h(
    React.Fragment,
    null,
    h(
      "div",
      { className: "cfb-head", style: gridStyle(columns) },
      ...columns.map((c) => h("div", { key: c.key, className: `cfb-cell${c.align === "right" ? " cfb-r" : ""}` }, c.title)),
    ),
    ...rows.flatMap((row) => [
      h(
        "div",
        { key: row.key, className: "cfb-row", style: gridStyle(columns, row.rowStyle) },
        ...columns.map((c) => gridCell(c, c.render(row))),
      ),
      ...(row.subRows || []),
    ]),
    footer
      ? h(
          "div",
          { key: "foot", className: "cfb-row cfb-foot", style: gridStyle(columns) },
          ...columns.map((c, i) => gridCell(c, c.foot ? c.foot() : null, { showLabel: i > 0 })),
        )
      : null,
  );

// One look for every action button: "+ New …" for creating, plain for the
// rest; compact in tables. A disabled one explains why on hover.
const COMPACT_BUTTON = { fontSize: 13, height: 26, paddingInline: 8 };
const NewButton = ({ label, onClick, disabled, tip, compact }) => {
  const creates = /^New /.test(label);
  const button = h(
    Button,
    {
      size: compact ? "small" : "middle",
      icon: creates ? h(Icon, { name: "plus", size: compact ? 12 : 14 }) : null,
      disabled: !!disabled,
      onClick,
      style: compact ? COMPACT_BUTTON : { fontSize: 14 },
    },
    label,
  );
  return disabled && tip ? h(Tooltip, { title: tip }, h("span", { style: { display: "inline-block" } }, button)) : button;
};
// The actions of a row / record: one → its button; two or more → one menu
// (label "Actions", or "New" for the strip's create actions).
const ActionsMenu = ({ items, onAction, label = tr("Actions"), compact = true, icon }) => {
  const group = groupActions(items);
  if (group.mode === "none") return h("span", { style: { color: "#bfbfbf" } }, "—");
  if (group.mode === "single") {
    const only = group.items[0];
    return h(NewButton, { compact, label: only.label, disabled: only.disabled, tip: only.tip, onClick: () => onAction(only.key) });
  }
  return h(
    Dropdown,
    {
      trigger: ["click"],
      menu: {
        items: group.items.map((m) => ({
          key: m.key,
          label: m.disabled && m.tip ? h("span", { title: m.tip }, m.label) : m.label,
          danger: !!m.danger,
          disabled: !!m.disabled,
        })),
        onClick: ({ key }) => onAction(key),
      },
    },
    h(
      Button,
      { size: compact ? "small" : "middle", style: compact ? COMPACT_BUTTON : { fontSize: 14 } },
      h(
        "span",
        { style: { display: "inline-flex", alignItems: "center", gap: 6 } },
        icon ? h(Icon, { name: icon, size: compact ? 12 : 14 }) : null,
        label,
        h(Icon, { name: "down", size: 12 }),
      ),
    ),
  );
};

// Unit tables: the unit's actions (+ its trigger tasks) in one place.
const RowActions = ({ actions, onAction, extraItems }) =>
  h(ActionsMenu, { items: [actions.primary, ...actions.menu, ...(extraItems || [])], onAction });

// Records tables: the record's actions in one place.
const ButtonActions = ({ buttons, menu, onAction }) => h(ActionsMenu, { items: [...buttons, ...menu], onAction });

// A unit's payment trigger tasks and where to tick them (from the row's menu).
const TriggersDialog = ({ tasks, onClose }) =>
  h(
    Modal,
    { open: true, title: tr("Payment trigger tasks"), onCancel: onClose, footer: null, width: MODAL_WIDTH },
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 10 } },
      tasks.length
        ? h("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 } }, ...tasks.map((t) => h(TaskChip, { key: t.id, task: t })))
        : h(Sub, null, tr("This unit has no trigger task yet.")),
      h(Sub, { tone: C.muted }, tr("Tick or untick “Payment trigger” on the tasks in the Tasks tab (Task Management).")),
    ),
  );

const AmountCell = ({ amount, sub, tone }) =>
  h(Stack, { gap: 2 }, h(Money, { value: amount, tone }), sub ? h(Sub, null, sub) : null);

const moneyColumns = (rows) => ({
  amount: rows.reduce((s, r) => s + toNum(r.amount), 0),
  received: rows.reduce((s, r) => s + toNum(r.received), 0),
  remaining: rows.reduce((s, r) => s + toNum(r.remaining), 0),
});

// Hint under the Request › Invoice › Payment pills for a unit with a request.
const requestHint = (request, today) => {
  if (!request) return null;
  const requested = toNum(request.requestedAmount);
  if (requested > 0 && toNum(request.paidAmount) >= requested) return { text: tr("Paid in full"), tone: C.green };
  const days = overdueDays(request, today);
  if (days > 0) return { text: tr("Due {0} · {1} overdue", { 0: fmtDate(request.dueDate), 1: plural(days, "day") }), tone: C.red };
  return request.dueDate ? { text: tr("Due {0}", { 0: fmtDate(request.dueDate) }), tone: C.muted } : null;
};

const unitMoney = (request, fallbackAmount) => {
  const amount = request ? toNum(request.requestedAmount) : toNum(fallbackAmount);
  return {
    amount,
    received: request ? toNum(request.paidAmount) : 0,
    remaining: request ? Math.max(owingOf(request), 0) : amount,
  };
};

// Columns shared by the By Case / By Service tables.
const unitColumns = ({ unitTitle, triggerTitle, totals, act }) => [
  {
    key: "unit",
    title: unitTitle,
    track: "minmax(0,1.35fr)",
    wide: true,
    render: (r) => r.unitCell,
    foot: () => tr("Total"),
  },
  {
    key: "amount",
    title: tr("Amount"),
    track: "minmax(0,1fr)",
    align: "right",
    render: (r) => h(AmountCell, { amount: r.amount, sub: r.amountSub, tone: r.dim ? C.faint : null }),
    foot: () => h(Money, { value: totals.amount }),
  },
  { key: "trigger", title: triggerTitle, track: "minmax(0,1.75fr)", wide: true, render: (r) => r.trigger },
  {
    key: "flow",
    title: tr("Request › Invoice › Payment"),
    track: "minmax(0,1.8fr)",
    wide: true,
    render: (r) => h(FlowSteps, { flow: r.flow, hint: r.flowHint, hintTone: r.flowHintTone }),
  },
  {
    key: "received",
    title: tr("Received"),
    track: "minmax(0,0.95fr)",
    align: "right",
    render: (r) =>
      r.dim && !r.received ? h(Sub, null, "—") : h(Money, { value: r.received, tone: r.received > 0 ? C.green : C.faint, weight: 500 }),
    foot: () => h(Money, { value: totals.received, tone: C.green }),
  },
  {
    key: "remaining",
    title: tr("Remaining"),
    track: "minmax(0,0.95fr)",
    align: "right",
    render: (r) =>
      r.dim && !r.remaining
        ? h(Sub, null, "—")
        : h(Money, {
            value: r.remaining,
            tone: r.flow.overdue ? C.red : r.remaining > 0 && r.received > 0 ? C.orange : r.remaining > 0 ? C.text : C.faint,
          }),
    foot: () => h(Money, { value: totals.remaining, tone: C.orange }),
  },
  {
    key: "actions",
    title: tr("Actions"),
    track: "minmax(0,1.05fr)",
    wide: true,
    render: (r) => h(RowActions, { actions: r.actions, extraItems: r.extraItems, onAction: (key) => act(key, r) }),
  },
];

const TRIGGER_TYPE_LABEL = {
  on_signed: tr("Contract signed"),
  on_task_done: tr("Linked tasks done"),
  on_case_done: tr("Case completed"),
  retainer_period: tr("Retainer period"),
  manual: tr("Created by hand"),
};

const ByCaseSection = ({ data, act, today }) => {
  const rows = [...data.schedules]
    .sort((a, b) => toNum(a.installmentNo) - toNum(b.installmentNo))
    .map((s) => {
      const request = openRequestFor(data.requests, (r) => idKey(r.contractPaymentScheduleId) === idKey(s.id));
      const linked = request ? data.tasks.filter((t) => idKey(t.linkedPaymentRequestId) === idKey(request.id)) : [];
      const triggerLabel = TRIGGER_TYPE_LABEL[s.triggerType] || s.triggerType || "—";
      const pending = request && lower(request.status) === "pending";
      const hint = requestHint(request, today);
      const name = s.label || tr("Installment {0}", { 0: s.installmentNo || "" });
      return {
        key: s.id,
        schedule: s,
        request,
        ...unitMoney(request, s.amount),
        amountSub: s.percentage ? `${toNum(s.percentage)}%` : null,
        unitCell: h(
          Stack,
          { gap: 2 },
          h("span", { style: { fontWeight: 600 } }, name),
          h(Sub, null, request && request.dueDate ? tr("Due {0}", { 0: fmtDate(request.dueDate) }) : tr("Due date set on activation")),
        ),
        trigger: linked.length
          ? h(TriggerCell, { tasks: linked })
          : h(
              "div",
              { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 } },
              h(Pill, { tone: request && !pending ? "done" : "idle" }, triggerLabel),
              pending ? h(Sub, null, tr("Waiting")) : null,
            ),
        flow: requestFlow(request, data.invoices),
        flowHint: pending ? tr("Waiting: {0}", { 0: triggerLabel }) : !request ? tr("No request — its last one was cancelled") : hint && hint.text,
        flowHintTone: pending || !request ? C.muted : hint && hint.tone,
        actions: unitActions(request, data.invoices, data.contract, { canCreate: true }),
      };
    });
  const totals = moneyColumns(rows);
  return h(
    Card,
    {
      title: tr("Payment schedule"),
      extra: plural(rows.length, "installment"),
      legend: [["#52c41a", tr("Done")], ["#fa8c16", tr("In progress")], ["#d9d9d9", tr("Not reached")]],
    },
    rows.length
      ? h(DataGrid, {
          columns: unitColumns({ unitTitle: tr("Installment"), triggerTitle: tr("Trigger"), totals, act }),
          rows,
          footer: true,
        })
      : h("div", { className: "cfb-note" }, tr("This contract has no installments yet.")),
  );
};

const serviceAmount = (ps) =>
  ps.paymentAllocatedAmount !== null && ps.paymentAllocatedAmount !== undefined && ps.paymentAllocatedAmount !== ""
    ? toNum(ps.paymentAllocatedAmount)
    : toNum(ps.totalAmount);
const csName = (cs) => cs.serviceName || cs.name || cs.title || tr("Service {0}", { 0: cs.id });
const csAmount = (cs) => toNum(cs.totalAmount !== undefined && cs.totalAmount !== null ? cs.totalAmount : cs.amount);

const ByServiceLineSection = ({ data, act, today }) => {
  const viewed = idKey(data.theCase.id);
  const caseById = Object.fromEntries(data.cases.map((c) => [idKey(c.id), c]));
  const services = [...data.projectServices].sort((a, b) => {
    const av = idKey(a.projectId) === viewed ? 0 : 1;
    const bv = idKey(b.projectId) === viewed ? 0 : 1;
    return av - bv || toNum(a.id) - toNum(b.id);
  });
  const rows = services.map((ps) => {
    const request = openRequestFor(data.requests, (r) => idKey(r.projectServiceId) === idKey(ps.id));
    const triggers = data.tasks.filter((t) => idKey(t.projectServiceId) === idKey(ps.id) && t.isPaymentTrigger);
    const otherCase = idKey(ps.projectId) !== viewed ? caseById[idKey(ps.projectId)] : null;
    const open = triggers.filter((t) => lower(t.status) !== "done").length;
    const hint = requestHint(request, today);
    const waiting = !request && triggers.length > 0;
    return {
      key: ps.id,
      request,
      unit: {
        kind: "service",
        id: ps.id,
        name: ps.serviceName || `Service ${ps.id}`,
        sub: ps.serviceType || null,
        amount: serviceAmount(ps),
        reason: triggers.length ? "early" : "noTrigger",
        titlePreview: `Dịch vụ ${ps.serviceName || ""} - ${data.contract.contractCode || ""} - ${data.contract.contractName || ""}`,
      },
      ...unitMoney(request, serviceAmount(ps)),
      amountSub: toNum(ps.vat) > 0 ? tr("incl. VAT {0}%", { 0: toNum(ps.vat) }) : null,
      rowStyle: !request && !triggers.length ? { background: "#fffdf5" } : request && requestFlow(request, data.invoices).overdue ? { background: "#fffafa" } : null,
      unitCell: h(
        Stack,
        { gap: 2 },
        h(Clamp, { lines: 2, style: { fontWeight: 600, lineHeight: 1.5, opacity: otherCase ? 0.6 : 1 } }, ps.serviceName || tr("Service {0}", { 0: ps.id })),
        ps.serviceType ? h(Sub, null, ps.serviceType) : null,
        otherCase ? h(Sub, null, tr("Case {0}", { 0: caseLabel(otherCase) })) : null,
      ),
      trigger:
        request && !triggers.length
          ? h(Sub, null, tr("No trigger task"))
          : h(TriggerCell, {
              tasks: triggers,
              doneText: request ? tr("{0}/{1} done · {2}", { 0: triggers.length, 1: triggers.length, 2: fmtDate(request.createdAt) }) : null,
              note: !request && open ? tr("{0} still open", { 0: plural(open, "trigger task") }) : null,
              emptyNote: tr("This service will not create a payment request automatically."),
            }),
      flow: requestFlow(request, data.invoices),
      flowHint: request
        ? hint && hint.text
        : triggers.length
          ? tr("Request created when {0} more task{1} Done", { 0: open, 1: open === 1 ? " is" : "s are" })
          : tr("Create the request by hand, or pick trigger tasks"),
      flowHintTone: request ? hint && hint.tone : triggers.length ? C.muted : C.amber,
      actions: unitActions(request, data.invoices, data.contract, { canCreate: true, waiting }),
      triggerTasks: triggers,
      extraItems: !request ? [{ key: "triggers", label: triggers.length ? tr("Trigger tasks") : tr("Set trigger") }] : [],
    };
  });
  // Services added on the contract after the case was created (no case service yet).
  const notInCase = data.contractServices
    .filter((cs) => !idKey(cs.projectServiceId))
    .map((cs) => ({
      key: `cs-${cs.id}`,
      request: null,
      amount: csAmount(cs),
      received: 0,
      remaining: csAmount(cs),
      unitCell: h(
        Stack,
        { gap: 4 },
        h("span", { style: { fontWeight: 600 } }, csName(cs)),
        h(StatusTag, { tone: "grey" }, tr("Not in case")),
      ),
      trigger: h(Sub, null, tr("No tasks yet — configure the trigger later in the Case / Task.")),
      flow: requestFlow(null, []),
      flowHint: tr("Added on the contract after the case was created"),
      actions: { primary: null, menu: [] },
    }));
  const all = [...rows, ...notInCase];
  const totals = moneyColumns(all);
  return h(
    Card,
    {
      title: tr("Billing by service"),
      extra: plural(all.length, "service"),
      legend: [["#52c41a", tr("Done")], ["#4096ff", tr("In progress")], ["#fa8c16", tr("Partly paid")], ["#d9d9d9", tr("Not reached")]],
    },
    all.length
      ? h(DataGrid, {
          columns: unitColumns({ unitTitle: tr("Service"), triggerTitle: tr("Trigger tasks"), totals, act }),
          rows: all,
          footer: true,
        })
      : h("div", { className: "cfb-note" }, tr("This contract has no services yet.")),
  );
};

const COMBO_PALETTE = ["#4096ff", "#9254de", "#36cfc9", "#ffc53d", "#ff7a45", "#73d13d"];
const COMBO_TAG_TONE = [
  { bg: "#e6f4ff", fg: "#0958d9" },
  { bg: "#f9f0ff", fg: "#531dab" },
  { bg: "#e6fffb", fg: "#08979c" },
  { bg: "#fffbe6", fg: "#ad6800" },
];
const KindTag = ({ kind, index }) => {
  const t = kind === "COMBO" ? COMBO_TAG_TONE[index % COMBO_TAG_TONE.length] : { bg: "#f5f5f5", fg: "#595959" };
  return h(
    "span",
    { style: { padding: "0 6px", background: t.bg, borderRadius: 4, fontSize: 11, fontWeight: 600, color: t.fg, whiteSpace: "nowrap" } },
    kind,
  );
};

// Everything the combo view needs, per billing item.
const comboItems = (data) => {
  const psByContractService = {};
  data.contractServices.forEach((cs) => {
    psByContractService[idKey(cs.id)] = idKey(cs.projectServiceId);
  });
  const psById = Object.fromEntries(data.projectServices.map((ps) => [idKey(ps.id), ps]));
  return [...data.schedules]
    .sort((a, b) => toNum(a.installmentNo) - toNum(b.installmentNo))
    .map((item, index) => {
      const serviceIds = data.scheduleServices
        .filter((x) => idKey(x.contractPaymentScheduleId) === idKey(item.id))
        .map((x) => psByContractService[idKey(x.contractServiceId)])
        .filter(Boolean);
      const services = serviceIds.map((id) => psById[id]).filter(Boolean);
      const triggers = data.tasks.filter((t) => serviceIds.includes(idKey(t.projectServiceId)) && t.isPaymentTrigger);
      const request = openRequestFor(data.requests, (r) => idKey(r.contractPaymentScheduleId) === idKey(item.id));
      const standalone = services.length === 1 && lower(services[0].serviceName) === lower(item.label);
      return {
        item,
        index,
        services,
        triggers,
        request,
        kind: standalone ? "SERVICE" : "COMBO",
        name: item.label || "Combo",
        title: `${item.label || "Combo"} - ${data.contract.contractCode || ""}`,
        auto: triggers.length > 0,
        color: COMBO_PALETTE[index % COMBO_PALETTE.length],
      };
    });
};

const ByServiceComboSection = ({ data, act, today }) => {
  const value = toNum(data.contract.totalAmount);
  const items = comboItems(data);
  const [expanded, setExpanded] = useState({});
  const allOpen = items.length > 0 && items.every((it) => expanded[idKey(it.item.id)]);
  const toggleAll = () =>
    setExpanded(allOpen ? {} : Object.fromEntries(items.map((it) => [idKey(it.item.id), true])));
  const allocated = items.reduce((s, it) => s + toNum(it.item.amount), 0);

  const subColumns = [
    { key: "unit", title: tr("Service"), track: "minmax(0,1.35fr)", wide: true, render: (r) => r.unitCell },
    { key: "amount", title: tr("Reference"), track: "minmax(0,1fr)", align: "right", render: (r) => r.amountCell },
    { key: "trigger", title: tr("Trigger tasks"), track: "minmax(0,1.75fr)", wide: true, render: (r) => r.chips },
    { key: "flow", title: "", track: "minmax(0,1.8fr)", wide: true, render: (r) => r.status },
    { key: "received", title: "", track: "minmax(0,0.95fr)", render: () => null },
    { key: "remaining", title: "", track: "minmax(0,0.95fr)", render: () => null },
    { key: "actions", title: "", track: "minmax(0,1.05fr)", render: () => null },
  ];

  const rows = items.map((it) => {
    const { item, services, triggers, request } = it;
    const open = triggers.filter((t) => lower(t.status) !== "done").length;
    const openServices = services.filter((ps) =>
      triggers.some((t) => idKey(t.projectServiceId) === idKey(ps.id) && lower(t.status) !== "done"),
    ).length;
    const zero = toNum(item.amount) <= 0;
    const hint = requestHint(request, today);
    const isOpen = !!expanded[idKey(item.id)];
    const subRows = isOpen
      ? [
          ...services.map((ps) => {
            const own = triggers.filter((t) => idKey(t.projectServiceId) === idKey(ps.id));
            const ownOpen = own.filter((t) => lower(t.status) !== "done").length;
            const ref = serviceAmount(ps);
            return h(
              "div",
              { key: `${item.id}-${ps.id}`, className: "cfb-row cfb-sub", style: gridStyle(subColumns) },
              ...subColumns.map((c) =>
                gridCell(
                  c,
                  c.render({
                    unitCell: h("span", { style: { paddingLeft: 28, display: "block" } }, ps.serviceName || tr("Service {0}", { 0: ps.id })),
                    amountCell: h(
                      Stack,
                      { gap: 2 },
                      h(Money, { value: ref, tone: C.muted, weight: 500 }),
                      h(Sub, null, tr("reference · {0}%", { 0: pct(ref, item.amount) })),
                    ),
                    chips: own.length
                      ? h("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 } }, ...own.map((t) => h(TaskChip, { key: t.id, task: t })))
                      : h(Sub, { tone: C.amber }, tr("No trigger task")),
                    status: own.length
                      ? ownOpen
                        ? h(Sub, null, tr("{0}/{1} trigger tasks done", { 0: own.length - ownOpen, 1: own.length }))
                        : h(Sub, { tone: C.green }, request ? tr("All trigger tasks done") : tr("All trigger tasks done · waiting for the rest of the combo"))
                      : null,
                  }),
                ),
              ),
            );
          }),
          h(
            "div",
            { key: `${item.id}-note`, className: "cfb-note", style: { background: "#fcfcfc", paddingLeft: 44 } },
            tr("Service amounts are for reference only — the whole {0} is billed in one request of {1}.", { 0: it.kind === "COMBO" ? "combo" : "item", 1: formatVnd(item.amount) }),
          ),
        ]
      : [];
    let flowHint;
    let flowHintTone = C.muted;
    if (zero) {
      flowHint = tr("Allocated 0 VND at contract creation — nothing to bill");
    } else if (request) {
      flowHint = hint && hint.text;
      flowHintTone = hint && hint.tone;
    } else if (triggers.length) {
      flowHint = h(
        React.Fragment,
        null,
        tr("Created when {0} more trigger task{1} Done, as ", { 0: open, 1: open === 1 ? " is" : "s are" }),
        h("strong", { style: { fontWeight: 600, color: C.text } }, it.title),
      );
    } else {
      flowHint = tr("Create it by hand, or tick trigger tasks in Task Management");
      flowHintTone = C.amber;
    }
    return {
      key: item.id,
      request,
      dim: zero,
      unit: { kind: "combo", id: item.id, name: it.name, sub: services.map((ps) => ps.serviceName).filter(Boolean).join(", "), amount: toNum(item.amount), reason: triggers.length ? "early" : "noTrigger", titlePreview: it.title },
      ...unitMoney(request, item.amount),
      ...(zero && !request ? { received: 0, remaining: 0 } : {}),
      amountSub: zero ? tr("allocated at contract") : `${pct(item.amount, value)}% · ${it.auto ? "auto" : "manual"}`,
      rowStyle: zero ? { background: "#fafafa" } : !request && !triggers.length ? { background: "#fffdf5" } : request && requestFlow(request, data.invoices).overdue ? { background: "#fffafa" } : null,
      unitCell: h(
        "div",
        { style: { display: "flex", alignItems: "flex-start", gap: 6 } },
        services.length
          ? h(
              Button,
              {
                size: "small",
                type: "text",
                "aria-label": tr("Show services in {0}", { 0: it.name }),
                style: { width: 22, height: 22, padding: 0, marginTop: 1 },
                onClick: () => setExpanded((prev) => ({ ...prev, [idKey(item.id)]: !prev[idKey(item.id)] })),
              },
              h(Icon, { name: isOpen ? "down" : "right", size: 14 }),
            )
          : h("span", { style: { width: 22, flexShrink: 0 } }),
        h(
          Stack,
          { gap: 3 },
          h(
            "span",
            { style: { display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 6 } },
            h(KindTag, { kind: it.kind, index: it.index }),
            h(Clamp, { lines: 2, style: { fontWeight: 600, color: zero ? C.faint : C.text } }, it.name),
          ),
          h(Clamp, { lines: 1, style: { fontSize: 12, color: C.faint } }, request ? tr("Request “{0}”", { 0: request.title || it.title }) : it.kind === "SERVICE" ? tr("Outside any combo · its own item") : plural(services.length, "service")),
        ),
      ),
      trigger: zero
        ? h(Sub, null, tr("Trigger tasks have no effect"))
        : request && !triggers.length
          ? h(Sub, null, tr("No trigger task — billed by hand"))
          : h(TriggerCell, {
            tasks: triggers,
            doneText: request ? tr("{0}/{1} done · {2}", { 0: triggers.length, 1: triggers.length, 2: fmtDate(request.createdAt) }) : null,
            note: triggers.length
              ? tr("across {0}{1}", { 0: plural(services.length, "service"), 1: !request && openServices ? tr(" · {0} still open", { 0: plural(openServices, "service") }) : "" })
              : null,
            emptyText: tr("No trigger task in this combo"),
            emptyNote: request ? null : tr("None of its services has a trigger task, so no request is ever created automatically."),
          }),
      flow: zero && !request
        ? { steps: [{ key: "request", label: tr("No request"), tone: "idle" }, { key: "invoice", label: tr("Invoice"), tone: "idle" }, { key: "payment", label: tr("Payment"), tone: "idle" }], overdue: false }
        : requestFlow(request, data.invoices),
      flowHint,
      flowHintTone,
      actions: zero && !request ? { primary: null, menu: [] } : unitActions(request, data.invoices, data.contract, { canCreate: true, waiting: !request && triggers.length > 0 }),
      triggerTasks: triggers,
      extraItems: !request && !zero ? [{ key: "triggers", label: triggers.length ? tr("Trigger tasks") : tr("Set trigger") }] : [],
      subRows,
    };
  });
  // Contract services outside every billing item: never billed.
  const inItems = new Set(data.scheduleServices.map((x) => idKey(x.contractServiceId)));
  const psById = Object.fromEntries(data.projectServices.map((ps) => [idKey(ps.id), ps]));
  const loose = data.contractServices
    .filter((cs) => !inItems.has(idKey(cs.id)))
    .map((cs) => {
      const ps = psById[idKey(cs.projectServiceId)];
      const name = (ps && ps.serviceName) || csName(cs);
      return {
        key: `loose-${cs.id}`,
        dim: true,
        amount: 0,
        received: 0,
        remaining: 0,
        rowStyle: { background: "#fafafa" },
        unitCell: h(
          "div",
          { style: { display: "flex", alignItems: "flex-start", gap: 6 } },
          h("span", { style: { width: 22, flexShrink: 0 } }),
          h(
            Stack,
            { gap: 3 },
            h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } }, h(KindTag, { kind: "SERVICE", index: 0 }), h("span", { style: { fontWeight: 600, color: C.faint } }, name)),
            h(Sub, null, tr("Not in any billing item")),
          ),
        ),
        amountSub: tr("not part of the allocation"),
        trigger: h(Sub, null, tr("Its tasks do not trigger any payment")),
        flow: { steps: [{ key: "request", label: tr("Not billed"), tone: "idle" }, { key: "invoice", label: tr("Invoice"), tone: "idle" }, { key: "payment", label: tr("Payment"), tone: "idle" }], overdue: false },
        flowHint: tr("Add it to a billing item on the contract to bill it"),
        actions: { primary: null, menu: [] },
      };
    });
  const allRows = [...rows, ...loose];
  const totals = moneyColumns(rows);
  const balanced = Math.round(allocated) === Math.round(value);
  return h(
    Stack,
    { gap: 16 },
    h(
      "div",
      { style: { padding: "14px 16px", border: `1px solid ${C.line}`, borderRadius: 8, display: "flex", flexDirection: "column", gap: 10 } },
      h(
        "div",
        { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 12px" } },
        h("span", { style: { fontWeight: 600 } }, tr("Contract value by billing item")),
        h(Sub, null, tr("set when the contract was created")),
        h(
          "span",
          { style: { marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: balanced ? C.green : C.red } },
          h(Icon, { name: balanced ? "check" : "warn", size: 14 }),
          tr("Allocated {0} / {1}", { 0: formatVnd(allocated).replace(" VND", ""), 1: formatVnd(value) }),
        ),
      ),
      h(
        "div",
        { style: { display: "flex", height: 12, borderRadius: 6, overflow: "hidden", gap: 2, background: "#f5f5f5" } },
        ...items.map((it) =>
          h(
            Tooltip,
            { key: it.item.id, title: `${it.name}: ${formatVnd(it.item.amount)}` },
            h("div", { style: { width: `${pct(it.item.amount, Math.max(value, allocated))}%`, background: it.color } }),
          ),
        ),
      ),
      h(
        "div",
        { style: { display: "flex", flexWrap: "wrap", gap: "6px 20px", fontSize: 13 } },
        ...items.map((it) =>
          h(
            "span",
            { key: it.item.id, style: { display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 8 } },
            h("span", { style: { width: 10, height: 10, borderRadius: 2, background: it.color } }),
            h("strong", { style: { fontWeight: 600 } }, it.name),
            `${formatVnd(it.item.amount)} · ${pct(it.item.amount, value)}%`,
            h(
              "span",
              {
                style: {
                  padding: "0 6px",
                  background: it.auto ? "#f5f5f5" : "#f9f0ff",
                  borderRadius: 4,
                  fontSize: 12,
                  color: it.auto ? "#595959" : C.purple,
                },
              },
              it.auto ? "auto" : "manual",
            ),
          ),
        ),
      ),
    ),
    h(
      Card,
      {
        title: tr("Billing items"),
        extra: tr("{0} · each billed as one request", { 0: plural(items.length, "item") }),
        right: items.some((it) => it.services.length)
          ? h(Button, { size: "small", style: { marginLeft: "auto" }, onClick: toggleAll }, allOpen ? tr("Collapse all") : tr("Expand all"))
          : null,
      },
      allRows.length
        ? h(DataGrid, {
            columns: unitColumns({ unitTitle: tr("Billing item"), triggerTitle: tr("Trigger tasks"), totals, act }),
            rows: allRows,
            footer: true,
          })
        : h("div", { className: "cfb-note" }, tr("This contract has no billing items yet.")),
    ),
  );
};

const PERIOD_TONE = {
  paid: ["done", "#52c41a"],
  partial: ["part", "#fa8c16"],
  overdue: ["bad", "#ff4d4f"],
  invoiced: ["next", "#4096ff"],
  requested: ["next", "#4096ff"],
  next: ["next", "#9254de"],
  stopped: ["wait", "#faad14"],
  scheduled: ["idle", "#d9d9d9"],
};

const Fact = ({ label, value, sub, subTone }) =>
  h(
    "div",
    { className: "cfb-fact" },
    h("span", { style: { fontSize: 12, color: C.muted } }, label),
    h("span", { style: { fontSize: 15, fontWeight: 600 } }, value),
    sub ? h("span", { style: { fontSize: 12, color: subTone || C.muted } }, sub) : null,
  );

const AutoBillingPanel = ({ plan, periods, data, open, today }) => {
  const cycles = toNum(plan.retainerTotalCycles);
  const billed = toNum(plan.retainerCyclesBilled);
  const completed = lower(plan.status) === "completed";
  const started = plan.isBillingActive !== false;
  const preview = billNowPreview(plan, data.contract);
  const next = plan.nextBillingDate ? String(plan.nextBillingDate).slice(0, 10) : null;
  const inDays = next ? daysBetween(today, next) : null;
  const onToggle = (e) => open({ kind: e.target.checked ? "start" : "stop", plan });
  const segments = cycles
    ? h(
        "div",
        { style: { display: "grid", gridTemplateColumns: `repeat(${cycles}, minmax(0, 1fr))`, gap: 4 } },
        ...periods.map((p) => h("div", { key: p.period, style: { height: 8, borderRadius: 2, background: (PERIOD_TONE[p.state] || PERIOD_TONE.scheduled)[1] } })),
      )
    : null;
  return h(
    "div",
    {
      className: "cfb-panel",
      style: { background: started ? "#f9f0ff" : "#fffbe6", border: `1px solid ${started ? "#d3adf7" : "#ffe58f"}` },
    },
    h(
      Stack,
      { gap: 8 },
      h(
        "label",
        { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600, color: started ? C.purple : C.amber, cursor: completed ? "default" : "pointer" } },
        h("input", {
          type: "checkbox",
          checked: started && !completed,
          disabled: completed || lower(data.contract.status) === "terminated",
          onChange: onToggle,
          style: { width: 18, height: 18, margin: 0, accentColor: "#722ed1" },
        }),
        tr("Auto-billing"),
      ),
      h(StatusTag, { tone: completed ? "grey" : started ? "done" : "part" }, completed ? tr("Completed") : started ? tr("Started") : tr("Stopped")),
    ),
    h(Fact, {
      label: tr("Per period"),
      value: formatVnd(retainerCycleAmount(plan.totalAmount, cycles || null, 1)),
      sub: cycles ? tr("the same fee each of {0}", { 0: plural(cycles, "period") }) : tr("open-ended · billed every period"),
    }),
    started
      ? h(Fact, { label: tr("First billing"), value: fmtDate(plan.startDate), sub: tr("End date: {0}", { 0: fmtDate(plan.endDate) }) })
      : h(Fact, { label: tr("Stopped since"), value: fmtDate(plan.pausedAt) }),
    started
      ? h(Fact, {
          label: tr("Next auto-request"),
          value: next ? fmtDate(next) : "—",
          sub: completed ? tr("All periods billed") : inDays === null ? null : inDays > 0 ? tr("in {0}", { 0: plural(inDays, "day") }) : inDays === 0 ? "today" : tr("on the next hourly run"),
        })
      : h(Fact, {
          label: tr("Next auto-request"),
          value: "—",
          sub: plan.resumeOn ? tr("Starts again on {0}", { 0: fmtDate(plan.resumeOn) }) : tr("Starts again when ticked"),
        }),
    started ? null : h(Fact, { label: tr("End date"), value: fmtDate(plan.endDate), sub: tr("moves by skipped periods") }),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 6, flex: "1 1 220px", minWidth: 200 } },
      h("span", { style: { fontSize: 12, color: C.muted } }, tr("Periods billed · {0}{1}", { 0: billed, 1: cycles ? `/${cycles}` : "" })),
      segments,
      h(
        Sub,
        { tone: C.muted },
        started ? tr("Untick to stop billing; periods skipped while stopped move to the end") : tr("Reason: {0}", { 0: plan.pauseReason || "—" }),
      ),
    ),
    h(
      Stack,
      { gap: 4, align: "flex-start" },
      h(
        Tooltip,
        { title: preview.ok ? null : preview.reason },
        h(
          Button,
          { disabled: !preview.ok, onClick: () => open({ kind: "billNow", plan }) },
          tr("Bill next period now"),
        ),
      ),
      !started ? h(Sub, { tone: C.amber }, tr("Tick Auto-billing to start again first")) : null,
    ),
  );
};

const RetainerSection = ({ data, act, open, today }) => {
  const plan = retainerPlanOf(data.plans);
  if (!plan) {
    // The contract form sends the plan with the contract; on an instance
    // without contracts.billingPlans (JsField/RegisterContractsBillingPlansInverseField.js)
    // NocoBase drops it silently — the plan is then set up here.
    return h(
      "div",
      { className: "cfb-panel", style: { background: "#fffbe6", border: "1px solid #ffe58f" } },
      h(
        Stack,
        { gap: 4 },
        h("span", { style: { fontWeight: 600, color: C.amber } }, tr("No billing plan yet")),
        h(
          Sub,
          { tone: C.muted },
          tr("This retainer has no auto-billing plan, so no period request is ever created. Set up how often and how much to bill; the hourly run then creates each period's request."),
        ),
      ),
      lower(data.contract.status) === "terminated"
        ? null
        : h(NewButton, { label: tr("New billing plan"), onClick: () => open({ kind: "planSetup" }) }),
    );
  }
  const periods = retainerPeriods(plan, data.requests, data.invoices, today);
  const cycles = toNum(plan.retainerTotalCycles);
  const preview = billNowPreview(plan, data.contract);
  const rows = periods.map((p) => {
    const hint = requestHint(p.request, today);
    const tone = PERIOD_TONE[p.state] || PERIOD_TONE.scheduled;
    const noteTone =
      p.state === "stopped" ? C.amber : p.state === "next" ? C.blue : p.request && requestSource(p.request) === "Bill now" ? C.blue : C.faint;
    return {
      key: p.period,
      plan,
      request: p.request,
      ...unitMoney(p.request, p.amount),
      rowStyle: p.state === "stopped" ? { background: "#fffdf5" } : p.state === "overdue" ? { background: "#fffafa" } : null,
      unitCell: h(
        Stack,
        { gap: 2 },
        h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 } }, h("span", { style: { width: 8, height: 8, borderRadius: 4, background: tone[1] } }), tr("Period {0}", { 0: p.period })),
        h(Sub, null, monthLabel(p.request ? p.request.createdAt : p.date)),
      ),
      dateCell: h(
        Stack,
        { gap: 2 },
        h("span", null, p.request ? fmtDate(p.request.createdAt) : p.date ? fmtDate(p.date) : "—"),
        h(Sub, { tone: noteTone }, retainerPeriodNote(p, plan, today)),
      ),
      flow: p.request
        ? requestFlow(p.request, data.invoices)
        : {
            steps: [
              { key: "request", label: tr("Request"), tone: p.state === "next" ? "next" : "idle" },
              { key: "invoice", label: tr("Invoice"), tone: "idle" },
              { key: "payment", label: tr("Payment"), tone: "idle" },
            ],
            overdue: false,
          },
      flowHint: hint && hint.text,
      flowHintTone: hint && hint.tone,
      actions: p.request
        ? unitActions(p.request, data.invoices, data.contract, {})
        : p.state === "next" && preview.ok
          ? { primary: { key: "billNow", label: tr("Bill now") }, menu: [] }
          : { primary: null, menu: [] },
    };
  });
  const totals = moneyColumns(rows);
  const columns = [
    { key: "unit", title: tr("Period"), track: "minmax(0,1fr)", render: (r) => r.unitCell, foot: () => tr("Total") },
    { key: "date", title: tr("Billing date"), track: "minmax(0,1.3fr)", render: (r) => r.dateCell },
    { key: "amount", title: tr("Amount"), track: "minmax(0,1fr)", align: "right", render: (r) => h(Money, { value: r.amount }), foot: () => h(Money, { value: totals.amount }) },
    { key: "flow", title: tr("Request › Invoice › Payment"), track: "minmax(0,1.9fr)", wide: true, render: (r) => h(FlowSteps, { flow: r.flow, hint: r.flowHint, hintTone: r.flowHintTone }) },
    {
      key: "received",
      title: tr("Received"),
      track: "minmax(0,0.95fr)",
      align: "right",
      render: (r) => h(Money, { value: r.received, tone: r.received > 0 ? C.green : C.faint, weight: 500 }),
      foot: () => h(Money, { value: totals.received, tone: C.green }),
    },
    {
      key: "remaining",
      title: tr("Remaining"),
      track: "minmax(0,0.95fr)",
      align: "right",
      render: (r) => h(Money, { value: r.remaining, tone: r.flow.overdue ? C.red : r.remaining > 0 ? C.text : C.faint }),
      foot: () => h(Money, { value: totals.remaining, tone: C.orange }),
    },
    { key: "actions", title: tr("Actions"), track: "minmax(0,1fr)", wide: true, render: (r) => h(RowActions, { actions: r.actions, onAction: (key) => act(key, r) }) },
  ];
  return h(
    Stack,
    { gap: 16 },
    h(AutoBillingPanel, { plan, periods, data, open, today }),
    h(
      Card,
      {
        title: tr("Billing periods"),
        extra: tr("{0} · every {1}", { 0: cycles ? plural(cycles, "period") : tr("open-ended"), 1: tr(UNIT_WORD[lower(plan.retainerUnit)] || "month") }),
        legend: [["#52c41a", tr("Done")], ["#ff4d4f", tr("Overdue")], ["#9254de", tr("Next")], ["#d9d9d9", tr("Scheduled")]],
      },
      h(DataGrid, { columns, rows, footer: true }),
    ),
  );
};

// ---- records: requests / invoices / payments ----
const REQUEST_STATUS_TONE = { pending: "grey", active: "next", cancelled: "idle" };
const INVOICE_STATUS_TONE = { draft: "grey", pending: "next", partial: "part", paid: "done", overdue: "bad", cancelled: "idle" };
const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : "—");

// What a request bills, in the words of its contract type.
const unitIndex = (data) => ({
  schedule: Object.fromEntries(data.schedules.map((s) => [idKey(s.id), s])),
  service: Object.fromEntries(data.projectServices.map((ps) => [idKey(ps.id), ps])),
  combo: Object.fromEntries(comboItems(data).map((it) => [idKey(it.item.id), it])),
});
const unitLabel = (request, mode, idx) => {
  if (!request) return tr("Contract");
  if (requestSource(request) === "Settlement") return tr("Settlement");
  if (request.billingPlanId && request.cycleNo) return tr("Period {0}", { 0: request.cycleNo });
  const schedule = idx.schedule[idKey(request.contractPaymentScheduleId)];
  if (schedule) {
    if (mode === "byServiceCombo") {
      const it = idx.combo[idKey(schedule.id)];
      return it ? `${it.name} · ${plural(it.services.length, "service")}` : schedule.label || tr("Combo");
    }
    return schedule.label || tr("Installment {0}", { 0: schedule.installmentNo || "" });
  }
  const ps = idx.service[idKey(request.projectServiceId)];
  if (ps) return ps.serviceName || tr("Service {0}", { 0: ps.id });
  return tr("Contract");
};
const UNIT_TITLE = { byCase: tr("Installment"), byServiceLine: tr("Service"), byServiceCombo: tr("Billing item"), retainer: tr("Period") };

const LinkText = ({ children, onClick, strong }) =>
  h(
    "a",
    {
      role: "button",
      onClick: (e) => {
        e.preventDefault();
        onClick();
      },
      style: { color: C.accent, fontWeight: strong ? 500 : 400, cursor: "pointer" },
    },
    children,
  );

const RecordsTabs = ({ data, mode, act, open, today }) => {
  const [tab, setTab] = useState("requests");
  const idx = useMemo(() => unitIndex(data), [data]);
  const reqById = Object.fromEntries(data.requests.map((r) => [idKey(r.id), r]));
  const invById = Object.fromEntries(data.invoices.map((i) => [idKey(i.id), i]));
  const invoiceOf = (r) => liveInvoicesFor(r, data.invoices)[0] || null;
  const requests = [...data.requests].sort((a, b) => {
    const ca = lower(a.status) === "cancelled" ? 1 : 0;
    const cb = lower(b.status) === "cancelled" ? 1 : 0;
    return ca - cb || String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });
  const invoices = [...data.invoices].sort((a, b) => String(b.issuedDate || b.createdAt || "").localeCompare(String(a.issuedDate || a.createdAt || "")));
  const payments = [...data.payments].sort((a, b) => String(b.paymentDate || "").localeCompare(String(a.paymentDate || "")));
  // Who is assigned to (and notified about) each record.
  const membersColumn = {
    key: "members",
    title: tr("Finance members"),
    track: "minmax(0,1.1fr)",
    render: (rec) => {
      const ids = memberIdsOf(rec);
      const text = membersText(ids, data.lawyersById);
      const all = ids.map((id) => (data.lawyersById[id] ? lawyerLabel(data.lawyersById[id]) : tr("Lawyer {0}", { 0: id }))).join(", ");
      return text ? h(Clamp, { lines: 2, title: all, style: { fontSize: 13 } }, text) : h("span", { style: { color: "#bfbfbf" } }, "—");
    },
  };
  const tabs = [
    ["requests", tr("Payment Requests"), requests.length],
    ["invoices", tr("Invoices"), invoices.length],
    ["payments", tr("Payments"), payments.length],
  ];

  const requestColumns = [
    {
      key: "title",
      title: tr("Payment request"),
      track: "minmax(0,1.9fr)",
      wide: true,
      render: (r) => {
        const cancelled = lower(r.status) === "cancelled";
        const combo = mode === "byServiceCombo" ? idx.combo[idKey(r.contractPaymentScheduleId)] : null;
        const covers = combo && combo.services.length ? combo.services.map((ps) => ps.serviceName).filter(Boolean) : [];
        return h(
          Stack,
          { gap: 3 },
          h(
            "span",
            { style: { display: "flex", alignItems: "flex-start", gap: 6, minWidth: 0, opacity: cancelled ? 0.55 : 1 } },
            combo ? h("span", { style: { flexShrink: 0, paddingTop: 2 } }, h(KindTag, { kind: combo.kind, index: combo.index })) : null,
            h(
              LinkText,
              { strong: true, onClick: () => open({ kind: "view", type: "request", record: r }) },
              h(Clamp, { lines: 2 }, r.title || tr("Request {0}", { 0: r.id })),
            ),
          ),
          h(
            Clamp,
            { lines: 1, title: covers.length ? tr("Covers {0}", { 0: covers.join(", ") }) : undefined, style: { fontSize: 12, color: C.faint } },
            [covers.length ? tr("Covers {0}", { 0: plural(covers.length, "service") }) : null, tr(requestSource(r)), tr("created {0}", { 0: fmtDate(r.createdAt) })]
              .filter(Boolean)
              .join(" · "),
          ),
        );
      },
    },
    {
      key: "unit",
      title: UNIT_TITLE[mode] || tr("Unit"),
      track: "minmax(0,1.1fr)",
      render: (r) => h(Clamp, { lines: 2, style: { fontSize: 13 } }, unitLabel(r, mode, idx)),
    },
    { key: "amount", title: tr("Amount"), track: "minmax(0,1fr)", align: "right", render: (r) => h(Money, { value: r.requestedAmount, tone: lower(r.status) === "cancelled" ? C.faint : null }) },
    { key: "due", title: tr("Due date"), track: "minmax(0,0.8fr)", render: (r) => (r.dueDate ? fmtDate(r.dueDate) : h("span", { style: { color: "#bfbfbf" } }, "—")) },
    {
      key: "status",
      title: tr("Status"),
      track: "minmax(0,1.2fr)",
      render: (r) => {
        const st = lower(r.status);
        const days = overdueDays(r, today);
        const paid = toNum(r.paidAmount);
        const requested = toNum(r.requestedAmount);
        return h(
          Stack,
          { gap: 3, align: "flex-start" },
          h(
            "div",
            { style: { display: "flex", flexWrap: "wrap", gap: 4 } },
            h(StatusTag, { tone: REQUEST_STATUS_TONE[st] || "grey" }, cap(st)),
            st === "active" && requested > 0 && paid >= requested ? h(StatusTag, { tone: "done" }, tr("Paid")) : null,
            days > 0 && paid < requested ? h(StatusTag, { tone: "bad" }, tr("Overdue {0}", { 0: plural(days, "day") })) : null,
          ),
          st === "pending"
            ? h(Sub, null, tr("Waiting: {0}", { 0: TRIGGER_TYPE_LABEL[(idx.schedule[idKey(r.contractPaymentScheduleId)] || {}).triggerType] || tr("its trigger") }))
            : null,
          st === "cancelled" && r.cancelReason ? h(Sub, null, r.cancelReason) : null,
        );
      },
    },
    {
      key: "invoice",
      title: tr("Invoice"),
      track: "minmax(0,0.9fr)",
      render: (r) => {
        const inv = invoiceOf(r);
        return inv
          ? h(LinkText, { onClick: () => open({ kind: "view", type: "invoice", record: inv }) }, inv.invoiceNumber || tr("Invoice {0}", { 0: inv.id }))
          : h("span", { style: { color: "#bfbfbf" } }, "—");
      },
    },
    membersColumn,
    {
      key: "actions",
      title: tr("Actions"),
      track: "minmax(0,2fr)",
      wide: true,
      render: (r) => {
        const a = recordRequestActions(r, data.invoices, data.contract);
        return h(ButtonActions, {
          ...a,
          onAction: (key) => (key === "members" ? open({ kind: "members", type: "request", record: r }) : act(key, { request: r })),
        });
      },
    },
  ];

  const invoiceColumns = [
    {
      key: "no",
      title: tr("Invoice no."),
      track: "minmax(0,1.1fr)",
      wide: true,
      render: (i) => h(LinkText, { strong: true, onClick: () => open({ kind: "view", type: "invoice", record: i }) }, i.invoiceNumber || tr("Invoice {0}", { 0: i.id })),
    },
    { key: "req", title: tr("For request"), track: "minmax(0,1.8fr)", wide: true, render: (i) => h(Clamp, { lines: 2, style: { fontSize: 13 } }, (reqById[idKey(i.paymentRequestId)] || {}).title || "—") },
    { key: "issued", title: tr("Issued"), track: "minmax(0,0.8fr)", render: (i) => fmtDate(i.issuedDate || i.createdAt) },
    { key: "due", title: tr("Due date"), track: "minmax(0,0.8fr)", render: (i) => fmtDate(i.deadline || (reqById[idKey(i.paymentRequestId)] || {}).dueDate) },
    { key: "amount", title: tr("Amount"), track: "minmax(0,1fr)", align: "right", render: (i) => h(Money, { value: i.totalAmount }) },
    { key: "paid", title: tr("Paid"), track: "minmax(0,1fr)", align: "right", render: (i) => h(Money, { value: i.amountPaid, tone: toNum(i.amountPaid) > 0 ? C.green : C.faint, weight: 500 }) },
    { key: "status", title: tr("Status"), track: "minmax(0,0.8fr)", render: (i) => h(StatusTag, { tone: INVOICE_STATUS_TONE[lower(i.status)] || "grey" }, cap(lower(i.status))) },
    membersColumn,
    {
      key: "actions",
      title: tr("Actions"),
      track: "minmax(0,1.1fr)",
      wide: true,
      render: (i) => {
        const req = reqById[idKey(i.paymentRequestId)];
        const canPay = req && requestActions(req, data.invoices, data.contract).recordPayment && lower(i.status) !== "cancelled";
        return h(ButtonActions, {
          buttons: canPay ? [{ key: "payment", label: tr("New payment") }] : [],
          menu: [{ key: "members", label: tr("Finance members") }],
          onAction: (key) => (key === "members" ? open({ kind: "members", type: "invoice", record: i }) : act(key, { request: req })),
        });
      },
    },
  ];

  const paymentColumns = [
    { key: "date", title: tr("Date"), track: "minmax(0,0.8fr)", render: (p) => fmtDate(p.paymentDate) },
    {
      key: "amount",
      title: tr("Amount"),
      track: "minmax(0,1.1fr)",
      align: "right",
      render: (p) =>
        h(
          Stack,
          { gap: 2 },
          h(Money, { value: paymentVnd(p), tone: isReceived(p.paymentStatus) ? C.green : C.faint }),
          toNum(p.exchangeRateToBase) > 1 ? h(Sub, null, `${toNum(p.amount)} × ${toNum(p.exchangeRateToBase).toLocaleString("vi-VN")}`) : null,
        ),
    },
    { key: "method", title: tr("Method"), track: "minmax(0,0.9fr)", render: (p) => p.paymentMethod || "—" },
    { key: "ref", title: tr("Reference"), track: "minmax(0,1fr)", render: (p) => (p.paymentRefer ? p.paymentRefer : h("span", { style: { color: "#bfbfbf" } }, "—")) },
    {
      key: "applied",
      title: tr("Applied to"),
      track: "minmax(0,1.6fr)",
      wide: true,
      render: (p) => {
        const inv = invById[idKey(p.invoiceId)];
        const req = reqById[idKey(p.paymentRequestId)] || (inv ? reqById[idKey(inv.paymentRequestId)] : null);
        return h(
          "span",
          { style: { display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 6 } },
          h("span", null, req ? unitLabel(req, mode, idx) : tr("Contract")),
          inv ? h("span", { style: { color: "#bfbfbf" } }, "·") : null,
          inv ? h(LinkText, { onClick: () => open({ kind: "view", type: "invoice", record: inv }) }, inv.invoiceNumber || tr("Invoice {0}", { 0: inv.id })) : null,
        );
      },
    },
    { key: "status", title: tr("Status"), track: "minmax(0,0.8fr)", render: (p) => h(StatusTag, { tone: isReceived(p.paymentStatus) ? "done" : "idle" }, p.paymentStatus || "—") },
    membersColumn,
    {
      key: "actions",
      title: tr("Actions"),
      track: "minmax(0,0.5fr)",
      render: (p) =>
        h(ButtonActions, {
          buttons: [],
          menu: [{ key: "members", label: tr("Finance members") }],
          onAction: () => open({ kind: "members", type: "payment", record: p }),
        }),
    },
  ];

  // Units still without a request, and requests still without an invoice.
  const notes = [];
  if (tab === "requests") {
    if (mode === "byServiceLine") {
      const missing = data.projectServices.filter((ps) => !openRequestFor(data.requests, (r) => idKey(r.projectServiceId) === idKey(ps.id)));
      if (missing.length) {
        notes.push(tr("{0} {1} no payment request yet — created when the last trigger task is Done, or by hand.", { 0: missing.map((ps) => ps.serviceName || tr("Service {0}", { 0: ps.id })).join(", "), 1: missing.length === 1 ? "has" : "have" }));
      }
    } else if (mode === "byServiceCombo") {
      comboItems(data)
        .filter((it) => toNum(it.item.amount) > 0 && !it.request)
        .forEach((it) => notes.push(tr("{0} has no payment request yet — it will be created as “{1}” when its last trigger task is Done.", { 0: it.name, 1: it.title })));
    }
  } else if (tab === "invoices") {
    data.requests
      .filter((r) => lower(r.status) === "pending")
      .forEach((r) => notes.push(tr("{0} has no invoice yet — it can be issued once its payment request is active.", { 0: r.title || tr("Request {0}", { 0: r.id }) })));
    invoiceCandidates(data.requests, data.invoices).forEach((r) =>
      notes.push(tr("{0} is active and not invoiced yet.", { 0: r.title || tr("Request {0}", { 0: r.id }) })),
    );
  }

  const body =
    tab === "requests"
      ? requests.length
        ? h(DataGrid, { columns: requestColumns, rows: requests.map((r) => ({ ...r, key: r.id })) })
        : null
      : tab === "invoices"
        ? invoices.length
          ? h(DataGrid, { columns: invoiceColumns, rows: invoices.map((i) => ({ ...i, key: i.id })) })
          : null
        : payments.length
          ? h(DataGrid, { columns: paymentColumns, rows: payments.map((p) => ({ ...p, key: p.id })) })
          : null;
  const emptyText = { requests: tr("No payment requests yet."), invoices: tr("No invoices yet."), payments: tr("No payments recorded yet.") }[tab];

  return h(
    Card,
    null,
    h(
      "div",
      { className: "cfb-tabs" },
      ...tabs.map(([key, label, count]) =>
        h(
          "button",
          {
            key,
            type: "button",
            onClick: () => setTab(key),
            style: {
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 48,
              padding: "0 12px",
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${tab === key ? C.accent : "transparent"}`,
              color: tab === key ? C.accent : "#595959",
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            },
          },
          label,
          h("span", { style: { padding: "0 7px", background: "#f5f5f5", borderRadius: 10, fontSize: 12, color: "#595959" } }, count),
        ),
      ),
    ),
    body || h("div", { style: { padding: 24 } }, h(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: emptyText })),
    ...notes.map((text, i) => h("div", { key: `note-${i}`, className: "cfb-note" }, text)),
  );
};

// ---- contract strip + KPI tiles ----
const CONTRACT_PAY_TONE = { paid: "done", partial: "part", unpaid: "grey" };

const ContractStrip = ({ data, mode, open, picks }) => {
  const { contract, cases, theCase } = data;
  const others = cases.filter((c) => idKey(c.id) !== idKey(theCase.id));
  const thisCase = cases.find((c) => idKey(c.id) === idKey(theCase.id)) || theCase;
  const caseMembers = membersText(memberIdsOf(thisCase), data.lawyersById || {});
  const terminated = lower(contract.status) === "terminated";
  const href = contractHref(contract.id);
  const badgeTone = MODE_BADGE_TONE[mode] || MODE_BADGE_TONE.byCase;
  return h(
    Stack,
    { gap: 12 },
    h(
      "div",
      { className: "cfb-strip" },
      h(
        "div",
        { className: "cfb-strip-id" },
        h("span", { style: { color: "#d48806" } }, h(Icon, { name: "contract", size: 18 })),
        h("span", { style: { fontSize: 15, color: C.faint } }, tr("Contract")),
        href
          ? h("a", { href, target: "_blank", rel: "noreferrer", style: { fontSize: 16, fontWeight: 600, color: C.accent } }, contract.contractCode || contract.contractName || "—")
          : h("span", { style: { fontSize: 16, fontWeight: 600, color: C.accent } }, contract.contractCode || contract.contractName || "—"),
        h("span", { style: { padding: "3px 10px", background: badgeTone.bg, borderRadius: 6, fontSize: 13, color: badgeTone.fg } }, modeBadge(mode, data)),
        h(StatusTag, { tone: CONTRACT_PAY_TONE[lower(contract.paymentStatus)] || "grey" }, cap(lower(contract.paymentStatus) || "unpaid")),
        terminated ? h(StatusTag, { tone: "bad" }, tr("Terminated {0}", { 0: fmtDate(contract.terminationDate) })) : null,
        href
          ? h(
              "a",
              { href, target: "_blank", rel: "noreferrer", style: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14, color: C.faint } },
              tr("Open contract"),
              h(Icon, { name: "external", size: 14 }),
            )
          : null,
        h(
          Tooltip,
          { title: tr("The case's Finance members (edited on Info Case). With the case Manager they are assigned to new payment requests, invoices and payments.") },
          h("span", { style: { fontSize: 13, color: C.faint } }, tr("Finance members: {0}", { 0: caseMembers || "—" })),
        ),
      ),
      h(
        "div",
        { className: "cfb-strip-actions" },
        // every create action in one "+ New" menu (a disabled one says why on hover)
        h(ActionsMenu, {
          label: tr("New"),
          icon: "plus",
          compact: false,
          items: [
            terminated ? { key: "settlement", label: tr("New settlement request") } : null,
            !terminated && mode === "byCase"
              ? {
                  key: "issue",
                  label: tr("New payment request"),
                  disabled: !picks.issue.length,
                  tip: tr("Every installment already has an active payment request."),
                }
              : null,
            {
              key: "invoice",
              label: tr("New invoice"),
              disabled: !picks.invoice.length,
              tip: tr("No active payment request is waiting for an invoice."),
            },
            {
              key: "payment",
              label: tr("New payment"),
              disabled: !picks.payment.length,
              tip: tr("No active payment request has money owed."),
            },
          ],
          onAction: (key) =>
            open(
              key === "settlement"
                ? { kind: "settlement" }
                : key === "issue"
                  ? { kind: "issue" }
                  : key === "invoice"
                    ? { kind: "invoice", request: picks.invoice[0], candidates: picks.invoice }
                    : { kind: "payment", request: picks.payment[0], candidates: picks.payment },
            ),
        }),
        h(Tooltip, { title: tr("Refresh") }, h(Button, { "aria-label": tr("Refresh"), icon: h(Icon, { name: "refresh", size: 14 }), onClick: () => open({ kind: "refresh" }) })),
      ),
    ),
    others.length
      ? h(
          Banner,
          { tone: "blue" },
          tr("This contract is also used by {0}: {1}. Figures below cover the whole contract.", { 0: plural(others.length, "other case"), 1: others.map(caseLabel).join(", ") }),
        )
      : null,
  );
};

const Tile = ({ label, value, tone, sub, children, highlight }) =>
  h(
    "div",
    {
      style: {
        padding: "14px 16px",
        border: `1px solid ${highlight ? "#ffd591" : C.line}`,
        background: highlight ? "#fffbf0" : C.card,
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
      },
    },
    h("span", { style: { fontSize: 13, color: C.faint } }, label),
    h("span", { style: { fontSize: 20, fontWeight: 600, color: tone || C.text, overflowWrap: "anywhere" } }, formatVnd(value)),
    sub ? h("span", { style: { fontSize: 12, color: C.faint } }, sub) : null,
    children,
  );

const KpiTiles = ({ summary, notes, mode }) =>
  h(
    "div",
    { className: "cfb-kpis" },
    h(Tile, { label: tr("Contract value (incl. VAT)"), value: summary.value, sub: notes.value }),
    h(Tile, { label: mode === "retainer" ? tr("Billed") : tr("Requested"), value: summary.requested, tone: C.blue, sub: notes.requested }),
    h(Tile, { label: tr("Invoiced"), value: summary.invoiced, sub: notes.invoiced }),
    h(
      Tile,
      { label: tr("Received"), value: summary.received, tone: C.green },
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8 } },
        h(
          "div",
          { style: { flexGrow: 1, height: 6, background: C.line, borderRadius: 3, overflow: "hidden" } },
          h("div", { style: { width: `${Math.min(summary.receivedPct, 100)}%`, height: 6, background: "#52c41a" } }),
        ),
        h("span", { style: { fontSize: 12, color: C.faint } }, `${summary.receivedPct}%`),
      ),
    ),
    h(Tile, {
      label: tr("Outstanding"),
      value: summary.outstanding,
      tone: C.orange,
      highlight: true,
      sub:
        summary.overdue > 0
          ? h(
              "span",
              { style: { display: "inline-flex", alignItems: "center", gap: 4, color: C.red } },
              h(Icon, { name: "warn", size: 12 }),
              tr("{0} overdue", { 0: formatVnd(summary.overdue) }),
            )
          : summary.nextDue
            ? tr("{0} due {1}", { 0: formatVnd(summary.nextDue.amount), 1: fmtDate(summary.nextDue.date) })
            : null,
    }),
  );

// ---- actions (Finance P4a): every rule is enforced by the database
// (pgsql/finance_foundation.sql, pgsql/finance_billing_rules.sql); the dialogs
// only collect input and show the database's own sentences. ----
const plusDays = (n) => new Date(Date.now() + 7 * 3600 * 1000 + n * 86400000).toISOString().slice(0, 10);
const localDateToIso = (d) => (d ? new Date(`${d}T00:00:00+07:00`).toISOString() : null);
const isoToLocalDate = (v) => (v ? localDate(v) : "");
const thousands = (v) => String(v === null || v === undefined ? "" : v).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const unthousands = (v) => String(v === null || v === undefined ? "" : v).replace(/\./g, "");
const PAYMENT_METHODS = ["Cash", "Bank transfer", "Credit card", "Other"];
const MODAL_WIDTH = "min(560px, calc(100vw - 32px))";

const Field = ({ label, hint, children }) =>
  h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 4 } },
    h("span", { style: { fontSize: 13, fontWeight: 500 } }, label),
    children,
    hint ? h("span", { style: { fontSize: 12, color: C.muted } }, hint) : null,
  );

// [label, value, sub?] facts in a grey box.
const Facts = ({ items }) =>
  h(
    "div",
    {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 12,
        padding: "12px 14px",
        background: "#fafafa",
        border: `1px solid ${C.line}`,
        borderRadius: 8,
      },
    },
    ...items.map(([label, value, sub]) =>
      h(
        "div",
        { key: label, style: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 } },
        h("span", { style: { fontSize: 12, color: C.muted } }, label),
        h("span", { style: { fontSize: 14, fontWeight: 600, overflowWrap: "anywhere" } }, value),
        sub ? h("span", { style: { fontSize: 12, color: C.faint } }, sub) : null,
      ),
    ),
  );

// "After you confirm" — what the action will do.
const AfterConfirm = ({ items }) =>
  h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 6 } },
    h("span", { style: { fontSize: 13, fontWeight: 500 } }, tr("After you confirm")),
    ...items.map((text, i) =>
      h(
        "span",
        { key: i, style: { display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: C.muted } },
        h("span", { style: { color: C.green, paddingTop: 3 } }, h(Icon, { name: "check", size: 13 })),
        text,
      ),
    ),
  );

const TwoCols = ({ children }) =>
  h("div", { style: { display: "flex", flexWrap: "wrap", gap: 12 } }, ...React.Children.toArray(children).map((c, i) => h("div", { key: i, style: { flex: "1 1 180px", minWidth: 0 } }, c)));

const DateInput = ({ value, onChange }) => h(Input, { type: "date", value, onChange: (e) => onChange(e.target.value) });
const MoneyInput = ({ value, onChange, max }) =>
  h(InputNumber, { value, min: 0, max, step: 1000, style: { width: "100%" }, onChange, formatter: thousands, parser: unthousands });

// Finance members of a record: pick / add / remove people (lawyers).
const MembersField = ({ value, onChange, lawyers, hint }) =>
  h(
    Field,
    { label: tr("Finance members"), hint: hint || tr("Assigned to this record and notified about it.") },
    h(Select, {
      mode: "multiple",
      value,
      onChange,
      allowClear: true,
      showSearch: true,
      optionFilterProp: "label",
      placeholder: tr("Choose people"),
      style: { width: "100%" },
      options: (lawyers || []).map((l) => ({ value: idKey(l.id), label: lawyerLabel(l) })),
    }),
  );
// The ids as the API takes them (numbers when they are safe integers).
const memberPayload = (ids) => (ids || []).map((id) => (/^\d+$/.test(id) && Number.isSafeInteger(Number(id)) ? Number(id) : id));

// One modal for every action: stays open and shows the error when the
// database refuses; OK is disabled while saving (no double submit).
const ActionModal = ({ title, okText, danger, okDisabled, onClose, onDone, submit, children }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const handleOk = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await submit();
      setSaving(false);
      onClose();
      onDone();
    } catch (e) {
      setSaving(false);
      setError(apiErrorMessage(e));
    }
  };
  return h(
    Modal,
    {
      open: true,
      title,
      okText,
      width: MODAL_WIDTH,
      onCancel: () => !saving && onClose(),
      onOk: handleOk,
      confirmLoading: saving,
      okButtonProps: { danger: !!danger, disabled: !!okDisabled },
      maskClosable: false,
      destroyOnClose: true,
    },
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 14 } },
      children,
      error ? h(Alert, { type: "error", showIcon: true, message: error }) : null,
    ),
  );
};

const contractLinks = (contract) => ({
  contractId: contract.id,
  contracts: contract.id,
  ...(idKey(contract.customerId) ? { customerId: contract.customerId, customers: contract.customerId } : {}),
  ...(idKey(contract.internalCompanyId)
    ? { internalCompanyId: contract.internalCompanyId, internalCompany: contract.internalCompanyId }
    : {}),
});

const CREATE_INTRO = {
  service: {
    noTrigger: tr("This service has no trigger task, so its payment request is never created automatically. Create it here when the work is ready to bill."),
    early: tr("Its trigger tasks are not all Done yet. Creating the request now bills this service early."),
  },
  combo: {
    noTrigger: tr("None of this combo's services has a trigger task, so its payment request is never created automatically. Create it here when the work is ready to bill."),
    early: tr("Its trigger tasks are not all Done yet. Creating the request now bills the whole combo early."),
  },
};

const CreateRequestDialog = ({ unit, lawyers, defaults, onClose, onDone }) => {
  const [due, setDue] = useState(plusDays(7));
  const [title, setTitle] = useState(unit.titlePreview || "");
  const [memberIds, setMemberIds] = useState(defaults);
  const isCombo = unit.kind === "combo";
  return h(
    ActionModal,
    {
      title: isCombo ? tr("New combo payment request") : tr("New payment request"),
      okText: tr("Create"),
      okDisabled: !title.trim(),
      onClose,
      onDone,
      submit: () => {
        const members = memberPayload(memberIds);
        return ctx.api.request({
          url: "paymentRequests:create",
          method: "POST",
          data: {
            requestType: "manual_unit",
            ...(isCombo ? { contractPaymentScheduleId: unit.id } : { projectServiceId: unit.id }),
            dueDate: localDateToIso(due),
            ...(title.trim() !== unit.titlePreview ? { title: title.trim() } : {}),
            financeMembers: members,
          },
        });
      },
    },
    h(Alert, { type: "warning", showIcon: true, message: (CREATE_INTRO[isCombo ? "combo" : "service"] || {})[unit.reason] || CREATE_INTRO.service.noTrigger }),
    h(Facts, {
      items: [
        [isCombo ? tr("Combo") : tr("Service"), unit.name, unit.sub],
        [tr("Amount"), formatVnd(unit.amount), isCombo ? tr("Allocated at contract · fixed") : tr("Service amount on the contract · fixed")],
      ],
    }),
    h(
      Field,
      { label: tr("Request title"), hint: isCombo ? tr("Same as an automatic combo request, so the combo is easy to recognise") : tr("Same format as automatic requests: {service} - {contract}") },
      h(Input, { value: title, onChange: (e) => setTitle(e.target.value) }),
    ),
    h(Field, { label: tr("Due date"), hint: tr("Default: today + 7 days") }, h(DateInput, { value: due, onChange: setDue })),
    h(MembersField, { value: memberIds, onChange: setMemberIds, lawyers }),
    h(AfterConfirm, {
      items: [
        isCombo
          ? tr("One payment request is created for the whole combo, with status Active, ready to invoice.")
          : tr("A payment request for this service is created with status Active, ready to invoice."),
        isCombo
          ? tr("Ticking trigger tasks later will not create a second request for this combo.")
          : tr("The service is marked as billed: ticking trigger tasks later will not create a second request."),
      ],
    }),
  );
};

// By Case "+ Payment Request" / "Issue now": a pending installment becomes
// Active now; one whose request was cancelled gets a new request.
const IssueDialog = ({ options, scheduleId, contract, lawyers, defaults, onClose, onDone }) => {
  const first = scheduleId || (options[0] ? idKey(options[0].schedule.id) : null);
  const [sel, setSel] = useState(first);
  const opt = options.find((o) => idKey(o.schedule.id) === sel) || null;
  const initialDue = (o) => (o && o.request && o.request.dueDate ? isoToLocalDate(o.request.dueDate) : plusDays(7));
  // a pending request keeps its people; a new one starts with the default people
  const initialMembers = (o) => (o && o.request && memberIdsOf(o.request).length ? memberIdsOf(o.request) : defaults);
  const [due, setDue] = useState(initialDue(opt));
  const [memberIds, setMemberIds] = useState(initialMembers(opt));
  const pick = (value) => {
    const next = options.find((o) => idKey(o.schedule.id) === value);
    setSel(value);
    setDue(initialDue(next));
    setMemberIds(initialMembers(next));
  };
  const name = (o) => o.schedule.label || tr("Installment {0}", { 0: o.schedule.installmentNo || "" });
  const trigger = opt ? TRIGGER_TYPE_LABEL[opt.schedule.triggerType] || opt.schedule.triggerType || tr("its trigger") : "";
  return h(
    ActionModal,
    {
      title: tr("Issue payment request"),
      okText: opt && opt.action === "create" ? tr("Create") : tr("Issue now"),
      okDisabled: !opt || !due,
      onClose,
      onDone,
      submit: () => {
        const members = memberPayload(memberIds);
        return opt.action === "issue"
          ? ctx.api.request({
              url: `paymentRequests:update?filterByTk=${opt.request.id}`,
              method: "POST",
              data: { status: "active", dueDate: localDateToIso(due), financeMembers: members },
            })
          : ctx.api.request({
              url: "paymentRequests:create",
              method: "POST",
              data: {
                requestType: "manual_unit",
                contractPaymentScheduleId: opt.schedule.id,
                dueDate: localDateToIso(due),
                financeMembers: members,
              },
            });
      },
    },
    options.length
      ? h(
          Field,
          { label: tr("Installment") },
          h(Select, {
            value: sel,
            onChange: pick,
            style: { width: "100%" },
            options: options.map((o) => ({
              value: idKey(o.schedule.id),
              label: `${name(o)} · ${formatVnd(o.schedule.amount)} · ${o.action === "issue" ? "pending" : tr("no request")}`,
            })),
          }),
        )
      : h(Alert, { type: "info", showIcon: true, message: tr("Every installment already has an active payment request.") }),
    opt
      ? h(Facts, {
          items: [
            [tr("Installment"), name(opt), opt.schedule.percentage ? tr("{0}% of the contract", { 0: toNum(opt.schedule.percentage) }) : null],
            [tr("Amount"), formatVnd(opt.request ? opt.request.requestedAmount : opt.schedule.amount)],
            [tr("Now"), opt.action === "issue" ? tr("Pending") : tr("No request"), opt.action === "issue" ? tr("Waiting: {0}", { 0: trigger }) : tr("Its last request was cancelled")],
          ],
        })
      : null,
    opt ? h(Field, { label: tr("Due date"), hint: tr("Default: today + 7 days") }, h(DateInput, { value: due, onChange: setDue })) : null,
    opt ? h(MembersField, { value: memberIds, onChange: setMemberIds, lawyers }) : null,
    opt
      ? h(AfterConfirm, {
          items:
            opt.action === "issue"
              ? [tr("The request becomes Active and can be invoiced right away."), tr("It no longer waits for “{0}”.", { 0: trigger })]
              : [tr("A new payment request “Đợt {0} - {1} - {2}” is created as Active.", { 0: opt.schedule.installmentNo || "", 1: contract.contractCode || "", 2: contract.contractName || "" })],
        })
      : null,
  );
};

const SettlementDialog = ({ contract, requests, lawyers, defaults, onClose, onDone }) => {
  const max = Math.max(unbilledAmount(contract, requests), 0);
  const [amount, setAmount] = useState(max);
  const [memberIds, setMemberIds] = useState(defaults);
  return h(
    ActionModal,
    {
      title: tr("Termination settlement"),
      okText: tr("Create"),
      okDisabled: !(toNum(amount) > 0),
      onClose,
      onDone,
      submit: () => {
        const members = memberPayload(memberIds);
        return ctx.api.request({
          url: "paymentRequests:create",
          method: "POST",
          data: {
            requestType: "termination_settlement",
            contractId: contract.id,
            requestedAmount: toNum(amount),
            financeMembers: members,
          },
        });
      },
    },
    h(Facts, { items: [[tr("Contract"), contract.contractCode || contract.contractName || "—"], [tr("Still unbilled"), formatVnd(max)]] }),
    h(
      Field,
      { label: tr("Amount to settle (VND)"), hint: tr("For the work actually done — at most {0}.", { 0: formatVnd(max) }) },
      h(MoneyInput, { value: amount, max, onChange: setAmount }),
    ),
    h(MembersField, { value: memberIds, onChange: setMemberIds, lawyers }),
  );
};

const CancelDialog = ({ request, onClose, onDone }) => {
  const [reason, setReason] = useState("");
  return h(
    ActionModal,
    {
      title: tr("Cancel payment request"),
      okText: tr("Cancel request"),
      danger: true,
      onClose,
      onDone,
      submit: () => {
        if (!reason.trim()) throw new Error(tr("Give a reason to cancel this payment request."));
        return ctx.api.request({
          url: `paymentRequests:update?filterByTk=${request.id}`,
          method: "POST",
          data: { status: "cancelled", cancelReason: reason.trim() },
        });
      },
    },
    h(Facts, { items: [[tr("Request"), request.title || tr("Request {0}", { 0: request.id })], [tr("Amount"), formatVnd(request.requestedAmount)]] }),
    h(Field, { label: tr("Reason (required)") }, h(Input.TextArea, { rows: 3, value: reason, onChange: (e) => setReason(e.target.value) })),
    h(Alert, {
      type: "warning",
      showIcon: true,
      message: tr("A cancelled request cannot be reopened; the unit can be billed again with a new request."),
    }),
  );
};

// A request picker for the strip's Invoice / Record Payment buttons.
const RequestPicker = ({ candidates, value, onChange }) =>
  candidates && candidates.length > 1
    ? h(
        Field,
        { label: tr("Payment request") },
        h(Select, {
          value,
          onChange,
          style: { width: "100%" },
          options: candidates.map((r) => ({ value: idKey(r.id), label: tr("{0} · {1} owed", { 0: r.title || tr("Request {0}", { 0: r.id }), 1: formatVnd(owingOf(r)) }) })),
        }),
      )
    : null;

// Invoice / Payment: the people of the request they are for, else the default people.
const requestMembersOr = (request, defaults) => (memberIdsOf(request).length ? memberIdsOf(request) : defaults);

const InvoiceDialog = ({ request: initial, candidates, contract, lawyers, defaults, onClose, onDone }) => {
  const [reqId, setReqId] = useState(idKey(initial.id));
  const request = (candidates || []).find((r) => idKey(r.id) === reqId) || initial;
  const [name, setName] = useState(initial.title || "");
  const [issued, setIssued] = useState(plusDays(0));
  const [deadline, setDeadline] = useState(isoToLocalDate(initial.dueDate) || plusDays(7));
  const [amount, setAmount] = useState(Math.max(owingOf(initial), 0));
  const [memberIds, setMemberIds] = useState(requestMembersOr(initial, defaults));
  const pick = (value) => {
    const r = (candidates || []).find((x) => idKey(x.id) === value);
    if (!r) return;
    setReqId(value);
    setName(r.title || "");
    setDeadline(isoToLocalDate(r.dueDate) || plusDays(7));
    setAmount(Math.max(owingOf(r), 0));
    setMemberIds(requestMembersOr(r, defaults));
  };
  return h(
    ActionModal,
    {
      title: tr("New invoice"),
      okText: tr("Create"),
      okDisabled: !(toNum(amount) > 0) || !name.trim(),
      onClose,
      onDone,
      submit: () => {
        const members = memberPayload(memberIds);
        return ctx.api.request({
          url: "invoices:create",
          method: "POST",
          data: {
            invoiceName: name.trim(),
            status: "pending",
            issuedDate: localDateToIso(issued),
            deadline: localDateToIso(deadline),
            totalAmount: toNum(amount),
            paymentRequestId: request.id,
            paymentRequest: request.id,
            ...contractLinks(contract),
            financeMembers: members,
          },
        });
      },
    },
    h(RequestPicker, { candidates, value: reqId, onChange: pick }),
    h(Facts, { items: [[tr("For request"), request.title || tr("Request {0}", { 0: request.id })], [tr("Still owed"), formatVnd(owingOf(request))]] }),
    h(Field, { label: tr("Invoice name") }, h(Input, { value: name, onChange: (e) => setName(e.target.value) })),
    h(
      TwoCols,
      null,
      h(Field, { label: tr("Issued") }, h(DateInput, { value: issued, onChange: setIssued })),
      h(Field, { label: tr("Deadline"), hint: tr("Default: the request's due date") }, h(DateInput, { value: deadline, onChange: setDeadline })),
    ),
    h(Field, { label: tr("Amount (VND)") }, h(MoneyInput, { value: amount, onChange: setAmount })),
    h(MembersField, { value: memberIds, onChange: setMemberIds, lawyers, hint: tr("Default: the people of its payment request.") }),
  );
};

const PaymentDialog = ({ request: initial, candidates, invoices, contract, lawyers, defaults, onClose, onDone }) => {
  const owedOf = (r) => {
    const inv = liveInvoicesFor(r, invoices)[0] || null;
    return Math.max(inv && toNum(inv.outStandingAmount) > 0 ? toNum(inv.outStandingAmount) : owingOf(r), 0);
  };
  const [reqId, setReqId] = useState(idKey(initial.id));
  const request = (candidates || []).find((r) => idKey(r.id) === reqId) || initial;
  const invoice = liveInvoicesFor(request, invoices)[0] || null;
  const owed = owedOf(request);
  const [amount, setAmount] = useState(owedOf(initial));
  const [date, setDate] = useState(plusDays(0));
  const [method, setMethod] = useState("Bank transfer");
  const [reference, setReference] = useState("");
  const [memberIds, setMemberIds] = useState(requestMembersOr(initial, defaults));
  const pick = (value) => {
    const r = (candidates || []).find((x) => idKey(x.id) === value);
    if (!r) return;
    setReqId(value);
    setAmount(owedOf(r));
    setMemberIds(requestMembersOr(r, defaults));
  };
  return h(
    ActionModal,
    {
      title: tr("New payment"),
      okText: tr("Save payment"),
      okDisabled: !(toNum(amount) > 0),
      onClose,
      onDone,
      submit: () => {
        const members = memberPayload(memberIds);
        return ctx.api.request({
          url: "payments:create",
          method: "POST",
          data: {
            paymentStatus: "Received",
            paymentDate: localDateToIso(date),
            amount: toNum(amount),
            paymentMethod: method,
            paymentRefer: reference.trim() || null,
            paymentRequestId: request.id,
            paymentRequest: request.id,
            ...(invoice ? { invoiceId: invoice.id, invoices: invoice.id } : {}),
            ...contractLinks(contract),
            sourceKey: `financeTab:paymentRequest:${request.id}:${Date.now()}`,
            financeMembers: members,
          },
        });
      },
    },
    h(RequestPicker, { candidates, value: reqId, onChange: pick }),
    h(Facts, {
      items: [
        [tr("For request"), request.title || tr("Request {0}", { 0: request.id })],
        [tr("Invoice"), invoice ? invoice.invoiceNumber || tr("Invoice {0}", { 0: invoice.id }) : tr("Not invoiced yet")],
        [tr("Still owed"), formatVnd(owed)],
      ],
    }),
    h(
      TwoCols,
      null,
      h(
        Field,
        { label: tr("Amount received (VND)"), hint: toNum(amount) > owed ? tr("More than what is owed — the request will show as paid.") : null },
        h(MoneyInput, { value: amount, onChange: setAmount }),
      ),
      h(Field, { label: tr("Date") }, h(DateInput, { value: date, onChange: setDate })),
    ),
    h(
      TwoCols,
      null,
      h(Field, { label: tr("Method") }, h(Select, { value: method, onChange: setMethod, options: PAYMENT_METHODS.map((v) => ({ value: v, label: tr(v) })), style: { width: "100%" } })),
      h(Field, { label: tr("Reference") }, h(Input, { value: reference, onChange: (e) => setReference(e.target.value), placeholder: tr("Bank transaction code") })),
    ),
    h(MembersField, { value: memberIds, onChange: setMemberIds, lawyers, hint: tr("Default: the people of its payment request.") }),
  );
};

const BillNowDialog = ({ plan, contract, requests, invoices, lawyers, defaults, onClose, onDone }) => {
  const [memberIds, setMemberIds] = useState(defaults);
  const preview = billNowPreview(plan, contract);
  const today = plusDays(0);
  const cycles = toNum(plan.retainerTotalCycles);
  const billed = toNum(plan.retainerCyclesBilled);
  const defaultTitle = preview.ok
    ? `Payment request - ${contract.contractCode || ""} - ${contract.contractName || ""} - Retainer period ${preview.period}`
    : "";
  const [title, setTitle] = useState(defaultTitle);
  const [due, setDue] = useState(plusDays(7));
  const unpaid = retainerPeriods(plan, requests, invoices, today).filter((p) => p.state === "overdue");
  const afterDate = preview.ok ? addUnit(preview.scheduledDate, plan.retainerUnit, 1) : null;
  const last = preview.ok && cycles && preview.period >= cycles;
  return h(
    ActionModal,
    {
      title: tr("Bill next period now"),
      okText: tr("Create"),
      okDisabled: !preview.ok || !title.trim(),
      onClose,
      onDone,
      submit: () => {
        const members = memberPayload(memberIds);
        return ctx.api.request({
          url: "paymentRequests:create",
          method: "POST",
          data: {
            requestType: "bill_now",
            billingPlanId: plan.id,
            dueDate: localDateToIso(due),
            ...(title.trim() !== defaultTitle ? { title: title.trim() } : {}),
            financeMembers: members,
          },
        });
      },
    },
    preview.ok
      ? h(Facts, {
          items: [
            [tr("Period"), tr("Period {0}", { 0: preview.period }), monthLabel(preview.scheduledDate)],
            [tr("Scheduled auto-request"), fmtDate(preview.scheduledDate), tr("Billed ahead of schedule")],
            [tr("Amount"), formatVnd(preview.amount), cycles ? tr("Per period · fixed") : tr("Per period · open-ended")],
          ],
        })
      : h(Alert, { type: "warning", showIcon: true, message: preview.reason }),
    preview.ok && unpaid.length
      ? h(Alert, {
          type: "warning",
          showIcon: true,
          message: unpaid
            .map((p) => tr("Period {0} is still unpaid — {1}, {2} overdue.", { 0: p.period, 1: formatVnd(owingOf(p.request)), 2: plural(overdueDays(p.request, today), "day") }))
            .concat([tr("Billing Period {0} early does not change {1}.", { 0: preview.period, 1: unpaid.length === 1 ? "it" : "them" })])
            .join(" "),
        })
      : null,
    preview.ok ? h(Field, { label: tr("Request title") }, h(Input, { value: title, onChange: (e) => setTitle(e.target.value) })) : null,
    preview.ok ? h(Field, { label: tr("Due date"), hint: tr("Default: today + 7 days") }, h(DateInput, { value: due, onChange: setDue })) : null,
    preview.ok ? h(MembersField, { value: memberIds, onChange: setMemberIds, lawyers }) : null,
    preview.ok
      ? h(AfterConfirm, {
          items: [
            tr("A payment request for Period {0} is created now with status Active.", { 0: preview.period }),
            last
              ? tr("This is the last period: auto-billing completes.")
              : tr("Auto-billing skips Period {0}; the next auto-request moves to {1}.", { 0: preview.period, 1: fmtDate(afterDate) }),
            tr("Periods billed: {0}{1} → {2}{3}.", { 0: billed, 1: cycles ? `/${cycles}` : "", 2: billed + 1, 3: cycles ? `/${cycles}` : "" }),
          ],
        })
      : null,
  );
};

const StopDialog = ({ plan, onClose, onDone }) => {
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState("manual");
  const [resumeOn, setResumeOn] = useState(plusDays(30));
  return h(
    ActionModal,
    {
      title: tr("Stop auto-billing"),
      okText: tr("Stop auto-billing"),
      danger: true,
      onClose,
      onDone,
      submit: () => {
        if (!reason.trim()) throw new Error(tr("Give a reason to stop auto-billing."));
        return ctx.api.request({
          url: `contractBillingPlans:update?filterByTk=${plan.id}`,
          method: "POST",
          data: { isBillingActive: false, pauseReason: reason.trim(), resumeOn: until === "date" ? resumeOn : null },
        });
      },
    },
    h(Alert, {
      type: "warning",
      showIcon: true,
      message:
        tr("Use this when the service itself is paused. No period is billed while stopped, and none is lost: when billing starts again, the skipped periods move to the end and the contract end date moves by the same number of periods. To only delay a payment, change the request's due date instead."),
    }),
    h(
      Field,
      { label: tr("Start again") },
      h(
        Radio.Group,
        { value: until, onChange: (e) => setUntil(e.target.value), style: { display: "flex", flexDirection: "column", gap: 6 } },
        h(Radio, { value: "manual" }, tr("When someone ticks Auto-billing again")),
        h(Radio, { value: "date" }, tr("Automatically on")),
      ),
    ),
    until === "date" ? h(Field, { label: tr("Date") }, h(DateInput, { value: resumeOn, onChange: setResumeOn })) : null,
    h(Field, { label: tr("Reason (required)") }, h(Input.TextArea, { rows: 3, value: reason, onChange: (e) => setReason(e.target.value) })),
  );
};

// Retainer without a plan: how often, how many periods, how much.
const UNIT_OPTIONS = [
  { value: "month", label: tr("Month") },
  { value: "quarter", label: tr("Quarter") },
  { value: "year", label: tr("Year") },
  { value: "week", label: tr("Week") },
  { value: "day", label: tr("Day") },
];
const PlanSetupDialog = ({ contract, onClose, onDone }) => {
  const today = plusDays(0);
  const contractEnd = localDate(contract.endDate) || "";
  const [startDate, setStartDate] = useState(localDate(contract.paymentDate || contract.signedAt || contract.issuedDate) || today);
  const [endDate, setEndDate] = useState(contractEnd);
  const [unit, setUnit] = useState("month");
  const [duration, setDuration] = useState(contractEnd ? "fixed" : "open");
  const [cycles, setCycles] = useState(periodsBetween(startDate, contractEnd, "month") || 12);
  const [amount, setAmount] = useState(toNum(contract.totalAmount));
  const fixed = duration === "fixed";
  const fromDates = periodsBetween(startDate, endDate, unit);
  const preview = planSetupPreview({ total: amount, cycles: fixed ? cycles : null, unit, startDate });
  const valid = toNum(amount) > 0 && !!startDate && (!fixed || toNum(cycles) >= 1);
  return h(
    ActionModal,
    {
      title: tr("New billing plan"),
      okText: tr("Start auto-billing"),
      okDisabled: !valid,
      onClose,
      onDone,
      submit: () =>
        ctx.api.request({
          url: "contractBillingPlans:create",
          method: "POST",
          data: {
            planType: "retainer",
            status: "active",
            contractId: contract.id,
            contracts: contract.id,
            totalAmount: toNum(amount),
            startDate,
            endDate: endDate || null,
            retainerUnit: unit,
            retainerTotalCycles: fixed ? toNum(cycles) : null,
          },
        }),
    },
    h(
      Field,
      { label: tr("Duration") },
      h(
        Radio.Group,
        { value: duration, onChange: (e) => setDuration(e.target.value), style: { display: "flex", flexDirection: "column", gap: 6 } },
        h(Radio, { value: "fixed" }, tr("A fixed number of periods — the amount is billed every period")),
        h(Radio, { value: "open" }, tr("Open-ended — the same amount every period, until stopped or the end date")),
      ),
    ),
    h(
      TwoCols,
      null,
      h(Field, { label: tr("Bill every") }, h(Select, { value: unit, onChange: setUnit, options: UNIT_OPTIONS, style: { width: "100%" } })),
      h(Field, { label: tr("First billing date") }, h(DateInput, { value: startDate, onChange: setStartDate })),
    ),
    h(
      TwoCols,
      null,
      fixed
        ? h(
            Field,
            { label: tr("Number of periods"), hint: fromDates ? tr("{0} fit between the first billing date and the end date.", { 0: plural(fromDates, "period") }) : null },
            h(InputNumber, { value: cycles, min: 1, max: 999, style: { width: "100%" }, onChange: setCycles }),
          )
        : null,
      h(Field, { label: tr("End date"), hint: fixed ? tr("Optional.") : tr("Optional — billing stops after it.") }, h(DateInput, { value: endDate, onChange: setEndDate })),
    ),
    h(
      Field,
      { label: tr("Amount per period (VND)"), hint: tr("Contract amount per period: {0}", { 0: formatVnd(contract.totalAmount) }) },
      h(MoneyInput, { value: amount, onChange: setAmount }),
    ),
    valid
      ? h(Facts, {
          items: fixed
            ? [
                [tr("Per period"), formatVnd(preview.perPeriod), `${plural(toNum(cycles), "period")}`],
                [tr("Contract value"), formatVnd(preview.contractValue), tr("{0} × per period", { 0: plural(toNum(cycles), "period") })],
                [tr("Last billing date"), fmtDate(preview.lastDate)],
              ]
            : [
                [tr("Per period"), formatVnd(preview.perPeriod), tr("open-ended")],
                [tr("First billing"), fmtDate(startDate)],
              ],
        })
      : null,
    h(AfterConfirm, {
      items: [
        tr("The first period's request is created on {0} (Active, due 7 days later), then one every {1}.", { 0: fmtDate(startDate), 1: tr(UNIT_WORD[unit]) }),
        startDate < today
          ? tr("Periods whose date has already passed are billed one per hourly run until the plan catches up.")
          : tr("Stop / Start and Bill now work on this plan from the Auto-billing panel."),
        tr("Each new request is assigned to the case's Finance members and Manager, who are notified."),
      ],
    }),
  );
};

const StartDialog = ({ plan, onClose, onDone }) => {
  const preview = startPreview(plan, plusDays(0));
  return h(
    ActionModal,
    {
      title: tr("Start auto-billing again"),
      okText: tr("Start auto-billing"),
      onClose,
      onDone,
      submit: () =>
        ctx.api.request({ url: `contractBillingPlans:update?filterByTk=${plan.id}`, method: "POST", data: { isBillingActive: true } }),
    },
    h(Facts, {
      items: [
        [tr("Skipped periods"), String(preview.skipped)],
        [tr("Next auto-request"), fmtDate(preview.nextBillingDate)],
        [tr("End date"), preview.skipped > 0 && plan.endDate ? `${fmtDate(plan.endDate)} → ${fmtDate(preview.endDate)}` : fmtDate(plan.endDate)],
      ],
    }),
    h(Alert, {
      type: "info",
      showIcon: true,
      message:
        preview.skipped > 0
          ? tr("{0} fell while billing was stopped; they move to the end of the schedule.", { 0: plural(preview.skipped, "period") })
          : tr("No billing date fell while billing was stopped; the schedule is unchanged."),
    }),
  );
};

// Add / remove the people of one Payment Request, Invoice or Payment.
const MEMBER_RESOURCE = { request: "paymentRequests", invoice: "invoices", payment: "payments" };
const recordName = (type, rec) =>
  type === "request"
    ? rec.title || tr("Request {0}", { 0: rec.id })
    : type === "invoice"
      ? rec.invoiceNumber || tr("Invoice {0}", { 0: rec.id })
      : tr("Payment {0} · {1}", { 0: fmtDate(rec.paymentDate), 1: formatVnd(paymentVnd(rec)) });
const MembersDialog = ({ type, record, lawyers, defaults, onClose, onDone }) => {
  const current = memberIdsOf(record);
  const [memberIds, setMemberIds] = useState(current);
  return h(
    ActionModal,
    {
      title: tr("Finance members"),
      okText: tr("Save"),
      onClose,
      onDone,
      submit: () => {
        const members = memberPayload(memberIds);
        return ctx.api.request({
          url: `${MEMBER_RESOURCE[type]}:update?filterByTk=${record.id}`,
          method: "POST",
          data: { financeMembers: members },
        });
      },
    },
    h(Facts, { items: [[cap(type), recordName(type, record)]] }),
    h(MembersField, {
      value: memberIds,
      onChange: setMemberIds,
      lawyers,
      hint: tr("These people handle this record and are notified about it."),
    }),
    defaults.length
      ? h(
          Button,
          { size: "small", style: { alignSelf: "flex-start" }, onClick: () => setMemberIds([...new Set([...memberIds, ...defaults])]) },
          tr("Add the case's Finance members and Manager"),
        )
      : null,
  );
};

// ---- View: one record with its links and actions ----
const InfoLine = ({ label, value }) =>
  h(
    "div",
    { style: { flex: "0 1 auto", minWidth: 110 } },
    h("div", { style: { color: "rgba(0,0,0,0.45)", fontSize: 12, marginBottom: 4 } }, label),
    h("div", { style: { fontWeight: 500, wordBreak: "break-word" } }, value === null || value === undefined || value === "" ? "—" : value),
  );
const FieldRow = ({ children }) => h("div", { style: { display: "flex", flexWrap: "wrap", columnGap: 32, rowGap: 14 } }, children);
const DrawerSection = ({ title, children }) =>
  h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 10, paddingTop: 14, borderTop: `1px solid ${C.line}` } },
    h("span", { style: { fontSize: 13, fontWeight: 600, color: C.muted } }, title),
    children,
  );
const MiniList = ({ items, empty }) =>
  items.length
    ? h(Stack, { gap: 6 }, ...items.map((node, i) => h("div", { key: i, style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 13 } }, node)))
    : h(Sub, null, empty);

const RecordDrawer = ({ type, record, data, mode, act, open, onClose }) => {
  const idx = unitIndex(data);
  const reqById = Object.fromEntries(data.requests.map((r) => [idKey(r.id), r]));
  let title = "";
  let body = null;
  let footer = null;
  // every name in the drawer (the tables shorten to "A, B +n")
  const membersLine = (rec) =>
    h(InfoLine, {
      label: tr("Finance members"),
      value: memberIdsOf(rec)
        .map((id) => (data.lawyersById[id] ? lawyerLabel(data.lawyersById[id]) : `Lawyer ${id}`))
        .join(", "),
    });
  // same rule as the tables: one action -> its button, two or more -> one menu
  const footerOf = (buttons, onAction) =>
    buttons.length
      ? h("div", { style: { display: "flex", justifyContent: "flex-end" } }, h(ActionsMenu, { items: buttons, onAction, compact: false }))
      : null;
  const payRow = (p) => [
    h("span", { key: "d" }, fmtDate(p.paymentDate)),
    h(Money, { key: "a", value: paymentVnd(p), tone: isReceived(p.paymentStatus) ? C.green : C.faint }),
    h(Sub, { key: "m" }, [p.paymentMethod, p.paymentRefer].filter(Boolean).join(" · ")),
    h(StatusTag, { key: "s", tone: isReceived(p.paymentStatus) ? "done" : "idle" }, p.paymentStatus || "—"),
  ];
  if (type === "request") {
    const r = reqById[idKey(record.id)] || record;
    const invs = data.invoices.filter((i) => idKey(i.paymentRequestId) === idKey(r.id));
    const pays = data.payments.filter((p) => idKey(p.paymentRequestId) === idKey(r.id));
    const a = recordRequestActions(r, data.invoices, data.contract);
    title = r.title || tr("Request {0}", { 0: r.id });
    body = h(
      Stack,
      { gap: 14 },
      h(
        FieldRow,
        null,
        h(InfoLine, { label: tr("Status"), value: h(StatusTag, { tone: REQUEST_STATUS_TONE[lower(r.status)] || "grey" }, cap(lower(r.status))) }),
        h(InfoLine, { label: UNIT_TITLE[mode] || tr("Unit"), value: unitLabel(r, mode, idx) }),
        h(InfoLine, { label: tr("Amount"), value: formatVnd(r.requestedAmount) }),
        h(InfoLine, { label: tr("Paid"), value: formatVnd(r.paidAmount) }),
        h(InfoLine, { label: tr("Outstanding"), value: formatVnd(Math.max(owingOf(r), 0)) }),
        h(InfoLine, { label: tr("Due date"), value: fmtDate(r.dueDate) }),
        r.overdueSince ? h(InfoLine, { label: tr("Overdue since"), value: fmtDate(r.overdueSince) }) : null,
        h(InfoLine, { label: tr("Created"), value: `${fmtDate(r.createdAt)} · ${tr(requestSource(r))}` }),
      ),
      membersLine(r),
      r.requestNote ? h(InfoLine, { label: tr("Note"), value: r.requestNote }) : null,
      lower(r.status) === "cancelled" ? h(InfoLine, { label: tr("Cancel reason"), value: `${r.cancelReason || "—"}${r.cancelledAt ? ` · ${fmtDate(r.cancelledAt)}` : ""}` }) : null,
      h(
        DrawerSection,
        { title: tr("Invoices ({0})", { 0: invs.length }) },
        h(MiniList, {
          empty: tr("No invoice yet."),
          items: invs.map((i) => [
            h("span", { key: "n", style: { fontWeight: 500 } }, i.invoiceNumber || tr("Invoice {0}", { 0: i.id })),
            h(Money, { key: "a", value: i.totalAmount }),
            h(StatusTag, { key: "s", tone: INVOICE_STATUS_TONE[lower(i.status)] || "grey" }, cap(lower(i.status))),
          ]),
        }),
      ),
      h(DrawerSection, { title: tr("Payments ({0})", { 0: pays.length }) }, h(MiniList, { empty: tr("No payment yet."), items: pays.map(payRow) })),
    );
    footer = footerOf([...a.buttons, ...a.menu], (key) =>
      key === "members" ? open({ kind: "members", type: "request", record: r }) : act(key, { request: r }),
    );
  } else if (type === "invoice") {
    const i = data.invoices.find((x) => idKey(x.id) === idKey(record.id)) || record;
    const req = reqById[idKey(i.paymentRequestId)];
    const pays = data.payments.filter((p) => idKey(p.invoiceId) === idKey(i.id));
    const canPay = req && requestActions(req, data.invoices, data.contract).recordPayment && lower(i.status) !== "cancelled";
    title = i.invoiceNumber || tr("Invoice {0}", { 0: i.id });
    body = h(
      Stack,
      { gap: 14 },
      h(
        FieldRow,
        null,
        h(InfoLine, { label: tr("Status"), value: h(StatusTag, { tone: INVOICE_STATUS_TONE[lower(i.status)] || "grey" }, cap(lower(i.status))) }),
        h(InfoLine, { label: tr("Name"), value: i.invoiceName }),
        h(InfoLine, { label: tr("For request"), value: req ? req.title : "—" }),
        h(InfoLine, { label: tr("Issued"), value: fmtDate(i.issuedDate || i.createdAt) }),
        h(InfoLine, { label: tr("Due date"), value: fmtDate(i.deadline || (req || {}).dueDate) }),
        h(InfoLine, { label: tr("Amount"), value: formatVnd(i.totalAmount) }),
        h(InfoLine, { label: tr("Paid"), value: formatVnd(i.amountPaid) }),
        h(InfoLine, { label: tr("Outstanding"), value: formatVnd(Math.max(toNum(i.totalAmount) - toNum(i.amountPaid), 0)) }),
      ),
      membersLine(i),
      h(DrawerSection, { title: tr("Payments ({0})", { 0: pays.length }) }, h(MiniList, { empty: tr("No payment yet."), items: pays.map(payRow) })),
    );
    footer = footerOf(
      [{ key: "members", label: tr("Finance members") }, ...(canPay ? [{ key: "payment", label: tr("New payment") }] : [])],
      (key) => (key === "members" ? open({ kind: "members", type: "invoice", record: i }) : act(key, { request: req })),
    );
  } else {
    const p = record;
    const inv = data.invoices.find((x) => idKey(x.id) === idKey(p.invoiceId));
    const req = reqById[idKey(p.paymentRequestId)] || (inv ? reqById[idKey(inv.paymentRequestId)] : null);
    title = tr("Payment {0}", { 0: fmtDate(p.paymentDate) });
    body = h(
      FieldRow,
      null,
      h(InfoLine, { label: tr("Status"), value: h(StatusTag, { tone: isReceived(p.paymentStatus) ? "done" : "idle" }, p.paymentStatus || "—") }),
      h(InfoLine, { label: tr("Amount (VND)"), value: formatVnd(paymentVnd(p)) }),
      toNum(p.exchangeRateToBase) > 1 ? h(InfoLine, { label: tr("Paid in currency"), value: `${toNum(p.amount)} × ${toNum(p.exchangeRateToBase).toLocaleString("vi-VN")}` }) : null,
      h(InfoLine, { label: tr("Date"), value: fmtDate(p.paymentDate) }),
      h(InfoLine, { label: tr("Method"), value: p.paymentMethod }),
      h(InfoLine, { label: tr("Reference"), value: p.paymentRefer }),
      h(InfoLine, { label: tr("Request"), value: req ? req.title : "—" }),
      h(InfoLine, { label: tr("Invoice"), value: inv ? inv.invoiceNumber : "—" }),
      membersLine(p),
    );
    footer = footerOf([{ key: "members", label: tr("Finance members") }], () => open({ kind: "members", type: "payment", record: p }));
  }
  return h(
    Drawer,
    { open: true, title, onClose, width: "min(560px, 100vw)", footer, destroyOnClose: true },
    h("div", { style: { fontFamily: FONT } }, body),
  );
};

const DialogHost = ({ dialog, data, mode, act, open, onClose, onDone }) => {
  if (!dialog) return null;
  // every dialog that creates or edits a record offers its Finance members
  const common = { onClose, onDone, lawyers: data.lawyers || [], defaults: defaultMemberIds(data.cases) };
  if (dialog.kind === "createRequest") return h(CreateRequestDialog, { ...common, unit: dialog.unit });
  if (dialog.kind === "issue") {
    return h(IssueDialog, {
      ...common,
      options: installmentIssueOptions(data.schedules, data.requests),
      scheduleId: dialog.scheduleId || null,
      contract: data.contract,
    });
  }
  if (dialog.kind === "members") return h(MembersDialog, { ...common, type: dialog.type, record: dialog.record });
  if (dialog.kind === "settlement") return h(SettlementDialog, { ...common, contract: data.contract, requests: data.requests });
  if (dialog.kind === "cancel") return h(CancelDialog, { ...common, request: dialog.request });
  if (dialog.kind === "invoice") {
    return h(InvoiceDialog, { ...common, request: dialog.request, candidates: dialog.candidates, contract: data.contract });
  }
  if (dialog.kind === "payment") {
    return h(PaymentDialog, {
      ...common,
      request: dialog.request,
      candidates: dialog.candidates,
      invoices: data.invoices,
      contract: data.contract,
    });
  }
  if (dialog.kind === "billNow") {
    return h(BillNowDialog, { ...common, plan: dialog.plan, contract: data.contract, requests: data.requests, invoices: data.invoices });
  }
  if (dialog.kind === "planSetup") return h(PlanSetupDialog, { ...common, contract: data.contract });
  if (dialog.kind === "triggers") return h(TriggersDialog, { tasks: dialog.tasks || [], onClose });
  if (dialog.kind === "stop") return h(StopDialog, { ...common, plan: dialog.plan });
  if (dialog.kind === "start") return h(StartDialog, { ...common, plan: dialog.plan });
  if (dialog.kind === "view") {
    return h(RecordDrawer, { type: dialog.type, record: dialog.record, data, mode, act, open, onClose });
  }
  return null;
};

// ---- root ----
const ModeNote = ({ mode }) => {
  if (mode === "byServiceLine") {
    return h(
      Banner,
      null,
      tr("Each service gets its own payment request, created automatically once "),
      h("strong", null, tr("all")),
      tr(" of its trigger tasks are Done. The request's due date is set to 7 days after that. "),
      h("strong", { style: { fontWeight: 500 } }, tr("Configure trigger tasks in the Tasks tab.")),
    );
  }
  if (mode === "byServiceCombo") {
    return h(
      Banner,
      null,
      tr("Combo pricing: each combo is billed as "),
      h("strong", null, tr("one package")),
      tr(". Trigger tasks are ticked inside the combo's services; once "),
      h("strong", null, tr("every")),
      tr(" trigger task across all of them is Done, one payment request is created, titled "),
      h("strong", null, tr("{combo name} - {contract}")),
      tr(". Due date = creation + 7 days."),
    );
  }
  return null;
};

const FinanceView = ({ data, onReload }) => {
  const [dialog, setDialog] = useState(null);
  const open = (next) => (next && next.kind === "refresh" ? onReload() : setDialog(next));
  const mode = financeMode(data.contract, data.schedules);
  const today = plusDays(0);
  const summary = useMemo(
    () =>
      summarizeFinance({
        contract: data.contract,
        plans: data.plans,
        requests: data.requests,
        invoices: data.invoices,
        payments: data.payments,
      }),
    [data],
  );
  const notes = useMemo(() => kpiNotes(mode, data), [mode, data]);
  const picks = useMemo(
    () => ({
      issue: mode === "byCase" ? installmentIssueOptions(data.schedules, data.requests) : [],
      invoice: invoiceCandidates(data.requests, data.invoices),
      payment: paymentCandidates(data.requests),
    }),
    [mode, data],
  );
  // Row / menu actions → dialogs.
  const act = (key, row) => {
    const request = row && row.request;
    if (key === "invoice") open({ kind: "invoice", request });
    else if (key === "payment") open({ kind: "payment", request });
    else if (key === "cancel") open({ kind: "cancel", request });
    else if (key === "view") open({ kind: "view", type: "request", record: request });
    else if (key === "issue") open({ kind: "issue", scheduleId: idKey(request.contractPaymentScheduleId) });
    else if (key === "create") {
      if (row.schedule) open({ kind: "issue", scheduleId: idKey(row.schedule.id) });
      else open({ kind: "createRequest", unit: row.unit });
    } else if (key === "billNow") open({ kind: "billNow", plan: row.plan });
    else if (key === "members") open({ kind: "members", type: "request", record: request });
    else if (key === "triggers") open({ kind: "triggers", tasks: row.triggerTasks || [] });
  };
  let body = null;
  if (mode === "byCase") body = h(ByCaseSection, { data, act, today });
  else if (mode === "byServiceLine") body = h(ByServiceLineSection, { data, act, today });
  else if (mode === "byServiceCombo") body = h(ByServiceComboSection, { data, act, today });
  else if (mode === "retainer") body = h(RetainerSection, { data, act, open, today });
  const legacyCombo = mode === "byServiceLine" && data.contract.pricingMode === "package";
  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 20 } },
    h(ContractStrip, { data, mode, open, picks }),
    h(KpiTiles, { summary, notes, mode }),
    h(ModeNote, { mode }),
    legacyCombo
      ? h(
          Banner,
          { tone: "amber" },
          tr("This combo contract was created before per-item billing: each service is still billed on its own trigger tasks."),
        )
      : null,
    body,
    h(RecordsTabs, { data, mode, act, open, today }),
    h(DialogHost, { dialog, data, mode, act, open, onClose: () => setDialog(null), onDone: onReload }),
  );
};

const CaseFinanceBlock = () => {
  const [reloadKey, setReloadKey] = useState(0);
  const [pollKey, setPollKey] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setPollKey((k) => k + 1), POLL_MS);
    return () => clearInterval(timer);
  }, []);
  const state = useFinanceData(CASE_ID, reloadKey, pollKey);
  const reload = () => setReloadKey((k) => k + 1);
  let content;
  if (state.kind === "loading") {
    content = h("div", { style: { padding: 48, textAlign: "center" } }, h(Spin, null));
  } else if (state.kind === "none") {
    content = h(Empty, {
      description: h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 6 } },
        h("strong", null, tr("No contract linked to this case")),
        h("span", { style: { color: C.muted } }, tr("Payment schedule, payment requests, invoices and payments appear here once a contract is linked to the case.")),
      ),
    });
  } else if (state.kind === "denied") {
    content = h(Alert, {
      type: "info",
      showIcon: true,
      message: tr("Finance is visible to the case manager and the contract's finance members."),
    });
  } else if (state.kind === "error") {
    content = h(Alert, {
      type: "error",
      showIcon: true,
      message: tr("Could not load the finance data."),
      description: String(state.error?.message || state.error || ""),
      action: h(Button, { size: "small", onClick: reload }, tr("Retry")),
    });
  } else {
    content = h(Spin, { spinning: !!state.refreshing }, h(FinanceView, { data: state.data, onReload: reload }));
  }
  return h(
    "div",
    {
      className: "cfb-root",
      style: {
        fontFamily: FONT,
        // the page theme is 16px; tables and buttons read better (and stay
        // compact) at the Ant Design default
        fontSize: 14,
        lineHeight: 1.5715,
        color: C.text,
        background: C.card,
        padding: 20,
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 0,
        width: "100%",
      },
    },
    h("style", null, CSS),
    content,
  );
};

ctx.render(React.createElement(CaseFinanceBlock, null));
