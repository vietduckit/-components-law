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
  "By case": "Theo hồ sơ",
  "Retainer": "Retainer",
  "By Service": "Theo dịch vụ",
  "Non-recurring": "Không định kỳ",
  "Recurring (Retainer)": "Định kỳ (Retainer)",
  "One time": "Một lần",
  "Multiple payments": "Nhiều đợt",
  "Day": "Ngày",
  "Week": "Tuần",
  "Month": "Tháng",
  "Year": "Năm",
  "Draft": "Nháp",
  "Pending approval": "Chờ duyệt",
  "Approved": "Đã duyệt",
  "Sent for signature": "Đã gửi ký",
  "Signed": "Đã ký",
  "Negotiation": "Đang đàm phán",
  "Pending": "Chờ xử lý",
  "Approval": "Phê duyệt",
  "Execution": "Đang thực hiện",
  "Completed": "Đã hoàn tất",
  "Terminated": "Đã chấm dứt",
  "Cancelled": "Đã hủy",
  "Rejected": "Bị từ chối",
  "Closed": "Đã đóng",
  "Expired": "Hết hạn",
  "≈ {0} VND": "≈ {0} VND",
  "Base currency": "Tiền tệ gốc",
  "No rate": "Chưa có tỷ giá",
  "Manual": "Thủ công",
  "Please configure POPUP_VIEW_UIDS.{0} first.": "Vui lòng cấu hình POPUP_VIEW_UIDS.{0} trước.",
  "ctx.openView is not available in this runtime.": "ctx.openView không khả dụng trong môi trường này.",
  "Cannot open configured popup view.": "Không thể mở popup đã cấu hình.",
  "Discard changes?": "Bỏ các thay đổi?",
  "Your unsaved input will be lost.": "Dữ liệu chưa lưu sẽ bị mất.",
  "Discard": "Bỏ",
  "Continue editing": "Tiếp tục chỉnh sửa",
  "MST {0}": "MST {0}",
  "Customer": "Khách hàng",
  "Total {0}": "Tổng {0}",
  "Customer #{0}": "Khách hàng #{0}",
  "Company #{0}": "Công ty #{0}",
  "Company": "Công ty",
  "Lawyer": "Luật sư",
  "Legal assistant": "Trợ lý pháp lý",
  "Partner": "Luật sư đối tác",
  "Managing partner": "Luật sư điều hành",
  "Senior partner": "Luật sư thành viên cấp cao",
  "Associate": "Luật sư cộng sự",
  "Senior associate": "Luật sư cộng sự cấp cao",
  "Counsel": "Luật sư tư vấn",
  "Of counsel": "Luật sư cố vấn",
  "Consultant": "Chuyên viên tư vấn",
  "Paralegal": "Trợ lý luật sư",
  "Trainee lawyer": "Luật sư tập sự",
  "Intern": "Thực tập sinh",
  "Collaborator": "Cộng tác viên",
  "External": "Bên ngoài",
  "Lawyer #{0}": "Luật sư #{0}",
  "Quotation": "Báo giá",
  "Case #{0}": "Hồ sơ #{0}",
  "Case": "Hồ sơ",
  "Contract #{0}": "Hợp đồng #{0}",
  "Contract": "Hợp đồng",
  "Service #{0}": "Dịch vụ #{0}",
  "Service": "Dịch vụ",
  "Installment {0}": "Đợt thanh toán {0}",
  "Untitled task": "Công việc chưa đặt tên",
  "Tasks of case {0}": "Công việc của hồ sơ {0}",
  "Tasks of this case": "Công việc của hồ sơ này",
  "Sample tasks — applied when a Case is created from this contract": "Công việc mẫu — áp dụng khi tạo Hồ sơ từ hợp đồng này",
  "Select service(s)": "Chọn dịch vụ",
  "The firm entity that provides the services. The service list is filtered by it.": "Pháp nhân của công ty cung cấp dịch vụ. Danh sách dịch vụ được lọc theo pháp nhân này.",
  "Non-recurring: billed by case or by service. Recurring: a retainer billed every period.": "Không định kỳ: thu theo hồ sơ hoặc theo dịch vụ. Định kỳ: retainer thu mỗi kỳ.",
  "By Case: installments for the whole matter. By Service: each service or combo is billed when its trigger tasks are done.": "Theo hồ sơ: các đợt thanh toán cho toàn bộ vụ việc. Theo dịch vụ: mỗi dịch vụ hoặc combo được thu khi các công việc kích hoạt hoàn thành.",
  "Internal processing status of the contract.": "Trạng thái xử lý nội bộ của hợp đồng.",
  "Leave blank to generate CT… (main contract) or PL… (appendix) from the signed month.": "Để trống để tự sinh CT… (hợp đồng chính) hoặc PL… (phụ lục) theo tháng ký.",
  "Name used to find the contract in lists and search.": "Tên dùng để tìm hợp đồng trong danh sách và tìm kiếm.",
  "The main contract, when this one is an appendix.": "Hợp đồng chính, khi hợp đồng này là phụ lục.",
  "Tick when the contract must be approved before execution.": "Đánh dấu khi hợp đồng cần được duyệt trước khi thực hiện.",
  "The lawyer who approves the contract.": "Luật sư duyệt hợp đồng.",
  "The client. Quotations are filtered by this customer.": "Khách hàng. Báo giá được lọc theo khách hàng này.",
  "The lawyer in charge.": "Luật sư phụ trách.",
  "The document template used to draft or print the contract.": "Mẫu tài liệu dùng để soạn hoặc in hợp đồng.",
  "The related quotation. Picking one fills customer, company and lawyer; the amounts come from the services below.": "Báo giá liên quan. Chọn báo giá sẽ điền khách hàng, công ty và luật sư; số tiền lấy từ các dịch vụ bên dưới.",
  "The case this contract serves.": "Hồ sơ mà hợp đồng này phục vụ.",
  "The day the contract is signed. Foreign-currency services are converted to VND at this day's rate.": "Ngày ký hợp đồng. Dịch vụ ngoại tệ được quy đổi sang VND theo tỷ giá ngày này.",
  "One time: a single payment. Multiple payments: enter the installments below.": "Một lần: thanh toán một lần. Nhiều đợt: nhập các đợt thanh toán bên dưới.",
  "The first payment date (one-time By Case, or the first retainer period).": "Ngày thanh toán đầu tiên (theo hồ sơ một lần, hoặc kỳ retainer đầu tiên).",
  "The end of the contract. A retainer stops billing after this date.": "Ngày kết thúc hợp đồng. Retainer dừng thu sau ngày này.",
  "The contract value. With priced services it is their sum in VND and cannot be edited.": "Giá trị hợp đồng. Khi có dịch vụ có giá, đây là tổng của chúng theo VND và không thể sửa.",
  "Retainer: billed every period (not split over the periods).": "Retainer: thu mỗi kỳ (không chia đều cho các kỳ).",
  "Number of periods. Each period bills the amount per period; the contract is worth amount × periods. Blank: billed every period until End date.": "Số kỳ. Mỗi kỳ thu số tiền mỗi kỳ; giá trị hợp đồng = số tiền × số kỳ. Để trống: thu mỗi kỳ đến Ngày kết thúc.",
  "The period length: day, week, month or year.": "Độ dài kỳ: ngày, tuần, tháng hoặc năm.",
  "Worked out from First payment and Retainer repeat.": "Tính từ Thanh toán đầu tiên và Chu kỳ lặp retainer.",
  "Add new": "Thêm mới",
  "Select": "Chọn",
  "No matching records": "Không có bản ghi phù hợp",
  "Clear": "Bỏ chọn",
  "Related": "Liên quan",
  "Commercial terms": "Điều khoản thương mại",
  "Services and payments": "Dịch vụ và thanh toán",
  "Services": "Dịch vụ",
  "Pick from the company's catalog or create one. Line pricing: each service has its own price and VAT. Combo pricing: one price for the whole combo.": "Chọn từ danh mục của công ty hoặc tạo mới. Giá theo dòng: mỗi dịch vụ có giá và VAT riêng. Giá combo: một giá cho cả combo.",
  "Currencies": "Tiền tệ",
  "Each service keeps its own currency; totals are in VND at the Signed-date rate. View currency breakdown shows the rates used.": "Mỗi dịch vụ giữ tiền tệ riêng; tổng tính bằng VND theo tỷ giá ngày ký. Xem chi tiết tiền tệ để thấy tỷ giá đã dùng.",
  "Payment schedule": "Lịch thanh toán",
  "Multiple payments only: percentages add up to 100% and each installment names at least one service.": "Chỉ với nhiều đợt: tổng phần trăm bằng 100% và mỗi đợt có ít nhất một dịch vụ.",
  "Payment triggers": "Kích hoạt thanh toán",
  "Tick the tasks whose completion activates a payment.": "Đánh dấu các công việc mà khi hoàn thành sẽ kích hoạt thanh toán.",
  "Contract fields": "Các trường hợp đồng",
  "What each field means. Fields you are unsure about can be left blank and filled in later.": "Ý nghĩa của từng trường. Trường nào chưa chắc có thể để trống và điền sau.",
  "No description": "Không có mô tả",
  "Show less": "Thu gọn",
  "Show more": "Xem thêm",
  "Please enter a combo name": "Vui lòng nhập tên combo",
  "Please select a currency": "Vui lòng chọn tiền tệ",
  "Please add at least 1 service to the combo": "Vui lòng thêm ít nhất 1 dịch vụ vào combo",
  "One or more services are missing a name": "Một hoặc nhiều dịch vụ chưa có tên",
  "Duplicate service name in combo": "Trùng tên dịch vụ trong combo",
  "Service name": "Tên dịch vụ",
  "Type": "Loại",
  "Unit Price": "Đơn giá",
  "Description": "Mô tả",
  "New service name...": "Tên dịch vụ mới...",
  "Already in the standardized catalog": "Đã có trong danh mục chuẩn",
  "Type (optional)...": "Loại (không bắt buộc)...",
  "Description (optional)...": "Mô tả (không bắt buộc)...",
  "Remove": "Gỡ",
  "Search combo...": "Tìm combo...",
  "+ New combo": "+ Combo mới",
  "Combo": "Combo",
  "Combo Price": "Giá combo",
  "No combos yet": "Chưa có combo",
  "New combo": "Combo mới",
  "Package #{0}": "Gói #{0}",
  "VAT {0}%": "VAT {0}%",
  "Save {0} ({1}%)": "Tiết kiệm {0} ({1}%)",
  "Close": "Đóng",
  "Combo Name": "Tên combo",
  "E.g. Business incorporation consulting combo...": "VD: Combo tư vấn thành lập doanh nghiệp...",
  "Combo Type": "Loại combo",
  "E.g. Business, Education...": "VD: Doanh nghiệp, Giáo dục...",
  "Combo Subtotal": "Tạm tính combo",
  "Currency": "Tiền tệ",
  "Individual price: {0}": "Giá lẻ: {0}",
  "Discount {0}": "Giảm {0}",
  "Increase {0}": "Tăng {0}",
  "VAT %": "VAT %",
  "Services in package ({0})": "Dịch vụ trong gói ({0})",
  "+ Add existing service...": "+ Thêm dịch vụ có sẵn...",
  "+ New service": "+ Dịch vụ mới",
  "No services yet — add one from the list or create a new one.": "Chưa có dịch vụ — thêm từ danh sách hoặc tạo mới.",
  "Also save this combo to the shared catalog (created only if you finish creating this contract). All custom services in it are saved too — services already in the catalog are simply reused.": "Lưu combo này vào danh mục chung (chỉ tạo khi bạn hoàn tất tạo hợp đồng). Các dịch vụ tự tạo trong combo cũng được lưu — dịch vụ đã có trong danh mục sẽ được dùng lại.",
  "Back": "Quay lại",
  "Applying...": "Đang áp dụng...",
  "Submit": "Gửi",
  "This service is already added.": "Dịch vụ này đã được thêm.",
  "This service is already selected in another row.": "Dịch vụ này đã được chọn ở dòng khác.",
  "Please enter service name.": "Vui lòng nhập tên dịch vụ.",
  "Please enter unit price greater than 0.": "Vui lòng nhập đơn giá lớn hơn 0.",
  "Please select currency.": "Vui lòng chọn tiền tệ.",
  "This service already exists in the catalog. Please select it instead.": "Dịch vụ này đã có trong danh mục. Vui lòng chọn dịch vụ đó.",
  "This service is already added in another row.": "Dịch vụ này đã được thêm ở dòng khác.",
  "Select service": "Chọn dịch vụ",
  "COMBO": "COMBO",
  "Add service to this combo": "Thêm dịch vụ vào combo này",
  "+ Add service": "+ Thêm dịch vụ",
  "Remove this combo": "Gỡ combo này",
  "× Remove combo": "× Gỡ combo",
  "New Combo": "Combo mới",
  "Select Combo": "Chọn combo",
  "Create New Service": "Tạo dịch vụ mới",
  "Select Service": "Chọn dịch vụ",
  "Add to combo:": "Thêm vào combo:",
  "Combo pricing keeps every service inside a combo.": "Giá combo giữ mọi dịch vụ trong một combo.",
  "Line pricing": "Giá theo dòng",
  "Combo pricing": "Giá combo",
  "Search service name...": "Tìm tên dịch vụ...",
  "Create new": "Tạo mới",
  "Service Name": "Tên dịch vụ",
  "Selected": "Đã chọn",
  "Used": "Đã dùng",
  "No services found": "Không tìm thấy dịch vụ",
  "Create now": "Tạo ngay",
  "e.g., Labor contract consulting...": "VD: Tư vấn hợp đồng lao động...",
  "Service Type": "Loại dịch vụ",
  "e.g., Consulting, Legal...": "VD: Tư vấn, Pháp lý...",
  "Scope of work, notes...": "Phạm vi công việc, ghi chú...",
  "Also save to the shared catalog (created only if you finish creating this contract).": "Lưu vào danh mục chung (chỉ tạo khi bạn hoàn tất tạo hợp đồng).",
  "This service already exists in the catalog. Select it from the list to avoid duplicates.": "Dịch vụ này đã có trong danh mục. Hãy chọn từ danh sách để tránh trùng lặp.",
  "Cancel": "Hủy",
  "Save & Select": "Lưu & Chọn",
  " New service": " Dịch vụ mới",
  "New service": "Dịch vụ mới",
  "Service Name & Type": "Tên & loại dịch vụ",
  "VAT (%)": "VAT (%)",
  "Total": "Tổng",
  "Service scope or note": "Phạm vi dịch vụ hoặc ghi chú",
  "Included in combo": "Đã gồm trong combo",
  "Line currency": "Tiền tệ của dòng",
  "Original: {0}": "Gốc: {0}",
  "Missing rate to {0}": "Thiếu tỷ giá sang {0}",
  "No services added. Click \"New service\" to add contract services.": "Chưa có dịch vụ. Bấm \"Dịch vụ mới\" để thêm dịch vụ cho hợp đồng.",
  "View currency breakdown ({0} currencies)": "Xem chi tiết tiền tệ ({0} loại tiền)",
  "Missing exchange rate ({0}) — the total is not final.": "Thiếu tỷ giá ({0}) — tổng chưa phải cuối cùng.",
  "Combo subtotal:": "Tạm tính combo:",
  "VAT (%):": "VAT (%):",
  "VAT amount:": "Tiền VAT:",
  "Combo total:": "Tổng combo:",
  "Subtotal (excl. VAT)": "Tạm tính (chưa VAT)",
  "VAT amount": "Tiền VAT",
  "Currency breakdown": "Chi tiết tiền tệ",
  "Base currency: {0}. Rates on the Signed date.": "Tiền tệ gốc: {0}. Tỷ giá tại ngày ký.",
  "Original total": "Tổng gốc",
  "Rate to ": "Tỷ giá sang ",
  "Converted total": "Tổng quy đổi",
  "Effective date": "Ngày hiệu lực",
  "Source": "Nguồn",
  "Missing": "Thiếu",
  "Converted total in ": "Tổng quy đổi theo ",
  "Payment Schedule": "Lịch thanh toán",
  "{0} installment{1}": "{0} đợt",
  "Total: {0}%{1}": "Tổng: {0}%{1}",
  " — exceeds 100%, please adjust": " — vượt 100%, vui lòng điều chỉnh",
  " Add row": " Thêm dòng",
  "Add row": "Thêm dòng",
  "Installment": "Đợt thanh toán",
  "Content": "Nội dung",
  "% Payment": "% Thanh toán",
  "Due Date": "Hạn",
  "Amount": "Số tiền",
  "e.g. 50% upon signing": "VD: 50% khi ký",
  "To do": "Cần làm",
  "In progress": "Đang làm",
  "Blocked": "Bị chặn",
  "Done": "Hoàn thành",
  "Allocated {0} / {1}": "Đã phân bổ {0} / {1}",
  " — off by {0}": " — lệch {0}",
  "Already linked to {0} — a task can trigger one {1} only.": "Đã liên kết với {0} — mỗi công việc chỉ kích hoạt được một {1}.",
  "A cancelled task can never be Done, so it can't trigger a payment.": "Công việc đã hủy không thể Done, nên không thể kích hoạt thanh toán.",
  "Linked to {0}": "Đã liên kết với {0}",
  "No tasks": "Không có công việc",
  "Payment Request amount": "Số tiền yêu cầu thanh toán",
  " · auto": " · tự động",
  "No price reference — enter this {0}'s amount by hand.": "Không có giá tham chiếu — hãy nhập số tiền của {0} này.",
  "Not in the Case — its services have no tasks, so its Payment Request would stay pending.": "Không thuộc Hồ sơ — các dịch vụ không có công việc, nên yêu cầu thanh toán sẽ luôn ở trạng thái chờ.",
  "Amount 0 — no Payment Request will be created for this {0}.": "Số tiền 0 — sẽ không tạo yêu cầu thanh toán cho {0} này.",
  "Unusually small amount — check it before submitting.": "Số tiền nhỏ bất thường — hãy kiểm tra trước khi gửi.",
  "Check this amount before submitting.": "Hãy kiểm tra số tiền này trước khi gửi.",
  "No tasks for the services {0} this {1}.": "Không có công việc cho các dịch vụ của {1} này.",
  "tagged on": "gắn với",
  "No tasks yet — configure the trigger later in the Case / Task.": "Chưa có công việc — cấu hình kích hoạt sau trong Hồ sơ / Công việc.",
  "This {0} will not be activated automatically.": "{0} này sẽ không được kích hoạt tự động.",
  "This service will not create a Payment Request automatically.": "Dịch vụ này sẽ không tự động tạo yêu cầu thanh toán.",
  "A service's Payment Request is created once ALL its ticked tasks are Done.": "Yêu cầu thanh toán của dịch vụ được tạo khi TẤT CẢ công việc đã đánh dấu đều Done.",
  "Auto-distribute": "Tự động phân bổ",
  "Payment Triggers": "Kích hoạt thanh toán",
  " Loading tasks...": " Đang tải công việc...",
  "Add services above to configure payment triggers.": "Thêm dịch vụ ở trên để cấu hình kích hoạt thanh toán.",
  "Add installments above to choose their trigger tasks.": "Thêm đợt thanh toán ở trên để chọn công việc kích hoạt.",
  "{0}/{1} {2}s have trigger tasks": "{0}/{1} {2} có công việc kích hoạt",
  "{0}/{1} services have a payment trigger": "{0}/{1} dịch vụ có kích hoạt thanh toán",
  "No tasks available yet": "Chưa có công việc",
  "⚠ {0} without trigger": "⚠ {0} chưa có kích hoạt",
  "{0} with no tasks yet": "{0} chưa có công việc",
  "Configure": "Cấu hình",
  "Keep at least one service from the source Case/Quotation.": "Giữ lại ít nhất một dịch vụ từ Hồ sơ/Báo giá nguồn.",
  "Could not load tasks — you can set payment triggers later in Task detail.": "Không thể tải công việc — bạn có thể đặt kích hoạt thanh toán sau trong chi tiết công việc.",
  "another item": "hạng mục khác",
  "another installment": "đợt khác",
  "another contract's Payment Request": "yêu cầu thanh toán của hợp đồng khác",
  "another contract's installment": "đợt của hợp đồng khác",
  "Custom service": "Dịch vụ tự tạo",
  "Template": "Mẫu",
  "Customer: {0}": "Khách hàng: {0}",
  "No exchange rate from the combo's currency to VND — the original amount is kept; check the rates.": "Không có tỷ giá từ tiền tệ của combo sang VND — giữ nguyên số tiền gốc; hãy kiểm tra tỷ giá.",
  "This combo has no services yet.": "Combo này chưa có dịch vụ.",
  "Skipped {0} service(s) already on the contract: {1}": "Bỏ qua {0} dịch vụ đã có trên hợp đồng: {1}",
  "Merged {0} standalone service(s) into combo \"{1}\": {2}": "Đã gộp {0} dịch vụ lẻ vào combo \"{1}\": {2}",
  "Combo \"{0}\" applied.": "Đã áp dụng combo \"{0}\".",
  "Also removed {0} service(s) merged into this combo: {1}": "Đồng thời gỡ {0} dịch vụ đã gộp vào combo này: {1}",
  "This service is already added in the contract.": "Dịch vụ này đã có trong hợp đồng.",
  "Missing exchange rate {0} → VND — this service is not in the total yet; check the rates.": "Thiếu tỷ giá {0} → VND — dịch vụ này chưa được tính vào tổng; hãy kiểm tra tỷ giá.",
  "Service row added.": "Đã thêm dòng dịch vụ.",
  "Selected service was not found in catalog.": "Không tìm thấy dịch vụ đã chọn trong danh mục.",
  "Please select service currency.": "Vui lòng chọn tiền tệ của dịch vụ.",
  "Please enter the contract name.": "Vui lòng nhập tên hợp đồng.",
  "Please select a customer.": "Vui lòng chọn khách hàng.",
  "Please select an internal company.": "Vui lòng chọn công ty nội bộ.",
  "Please select contract currency.": "Vui lòng chọn tiền tệ hợp đồng.",
  "Please select the contract type.": "Vui lòng chọn loại hợp đồng.",
  "Please enter service pricing before adding payment installments.": "Vui lòng nhập giá dịch vụ trước khi thêm đợt thanh toán.",
  "Please add at least one payment installment.": "Vui lòng thêm ít nhất một đợt thanh toán.",
  "Please enter payment percentage for every payment installment.": "Vui lòng nhập phần trăm cho mọi đợt thanh toán.",
  "Payment installment percentages must add up to 100%.": "Tổng phần trăm các đợt thanh toán phải bằng 100%.",
  "Please select at least one service for every payment installment.": "Vui lòng chọn ít nhất một dịch vụ cho mọi đợt thanh toán.",
  "Please select a valid retainer repeat unit.": "Vui lòng chọn đơn vị chu kỳ retainer hợp lệ.",
  "Please select at least one service for this contract.": "Vui lòng chọn ít nhất một dịch vụ cho hợp đồng này.",
  "Please add at least one service before creating the contract.": "Vui lòng thêm ít nhất một dịch vụ trước khi tạo hợp đồng.",
  "Please select a service for every contract service row.": "Vui lòng chọn dịch vụ cho mọi dòng dịch vụ của hợp đồng.",
  "Duplicate services are not allowed in contract service rows.": "Không được trùng dịch vụ trong các dòng dịch vụ của hợp đồng.",
  "Duplicate service names are not allowed in contract service rows.": "Không được trùng tên dịch vụ trong các dòng dịch vụ của hợp đồng.",
  "A manually created service already exists in the catalog. Please select the existing service instead.": "Dịch vụ tự tạo đã có trong danh mục. Vui lòng chọn dịch vụ có sẵn.",
  "Please enter base price for every line-priced service.": "Vui lòng nhập giá cho mọi dịch vụ tính giá theo dòng.",
  "Please select currency for every service row.": "Vui lòng chọn tiền tệ cho mọi dòng dịch vụ.",
  "Please enter combo subtotal.": "Vui lòng nhập tạm tính combo.",
  "Please select the main contract before creating an appendix.": "Vui lòng chọn hợp đồng chính trước khi tạo phụ lục.",
  "Enter the Total amount first — it's what the services' Payment Request amounts are split from.": "Hãy nhập Tổng số tiền trước — số tiền yêu cầu thanh toán của các dịch vụ được chia từ đó.",
  "Payment Request amounts add up to {0} but the Total amount is {1}. Open Payment Triggers → Configure to adjust them or use Auto-distribute.": "Tổng số tiền yêu cầu thanh toán là {0} nhưng Tổng số tiền là {1}. Mở Kích hoạt thanh toán → Cấu hình để điều chỉnh hoặc dùng Tự động phân bổ.",
  "Payment triggers are still loading — please try again in a moment.": "Kích hoạt thanh toán đang tải — vui lòng thử lại sau giây lát.",
  "These services have no trigger task and will not create a Payment Request automatically: {0}. Create the contract anyway?": "Các dịch vụ này không có công việc kích hoạt và sẽ không tự động tạo yêu cầu thanh toán: {0}. Vẫn tạo hợp đồng?",
  "These items have no trigger task, so their Payment Request will stay pending: {0}. Create the contract anyway?": "Các hạng mục này không có công việc kích hoạt, nên yêu cầu thanh toán sẽ luôn chờ: {0}. Vẫn tạo hợp đồng?",
  "These installments have no trigger task and will not be activated automatically: {0}. Create the contract anyway?": "Các đợt này không có công việc kích hoạt và sẽ không được kích hoạt tự động: {0}. Vẫn tạo hợp đồng?",
  "Services without payment trigger": "Dịch vụ chưa có kích hoạt thanh toán",
  "Items without trigger tasks": "Hạng mục chưa có công việc kích hoạt",
  "Installments without trigger tasks": "Đợt chưa có công việc kích hoạt",
  "Create anyway": "Vẫn tạo",
  "Back to form": "Quay lại biểu mẫu",
  "Missing exchange rate: {0}": "Thiếu tỷ giá: {0}",
  "Could not save payment trigger on {0} task(s) — set it in Task detail.": "Không thể lưu kích hoạt thanh toán cho {0} công việc — hãy đặt trong chi tiết công việc.",
  "Could not retrieve contract id after creation": "Không lấy được ID hợp đồng sau khi tạo",
  "The contract was created, but its retainer billing plan could not be saved — set it up from the case's Finance tab (New billing plan).": "Đã tạo hợp đồng, nhưng không lưu được kế hoạch thu phí retainer — hãy thiết lập ở tab Finance của hồ sơ (Kế hoạch thu phí mới).",
  "Could not update the case line.": "Không thể cập nhật dòng dịch vụ của hồ sơ.",
  "Could not update the quotation line.": "Không thể cập nhật dòng dịch vụ của báo giá.",
  "Could not create the Payment Request for \"{0}\" — create it manually for this contract.": "Không thể tạo yêu cầu thanh toán cho \"{0}\" — hãy tạo thủ công cho hợp đồng này.",
  "Could not create payment schedule installment \"{0}\" — its Payment Request was not auto-created. You can add it manually from the contract's Payment Schedule tab.": "Không thể tạo đợt thanh toán \"{0}\" — yêu cầu thanh toán của đợt chưa được tự tạo. Bạn có thể thêm thủ công ở tab Lịch thanh toán của hợp đồng.",
  "Could not link {0} task(s) to their installment — link them in Task Management.": "Không thể liên kết {0} công việc với đợt thanh toán — hãy liên kết trong Task Management.",
  "Contract created successfully.": "Đã tạo hợp đồng.",
  "{0} service{1} added to the catalog.": "Đã thêm {0} dịch vụ vào danh mục.",
  "Combo \"{0}\" was not saved to the catalog — its services could not be linked (a name may already be in use, or saving one of them failed).": "Combo \"{0}\" chưa được lưu vào danh mục — không liên kết được các dịch vụ (có thể tên đã được dùng, hoặc lưu một dịch vụ bị lỗi).",
  "Combo \"{0}\" saved to the catalog — {1} custom service(s) without a catalog link were left out.": "Đã lưu combo \"{0}\" vào danh mục — bỏ qua {1} dịch vụ tự tạo chưa liên kết danh mục.",
  "Combo \"{0}\" saved to the catalog.": "Đã lưu combo \"{0}\" vào danh mục.",
  "Could not save combo \"{0}\" to the catalog.": "Không thể lưu combo \"{0}\" vào danh mục.",
  "Could not create contract{0}": "Không thể tạo hợp đồng{0}",
  "Guide": "Hướng dẫn",
  "Contract information": "Thông tin hợp đồng",
  "Internal company": "Công ty nội bộ",
  "Select company": "Chọn công ty",
  "Payment mode": "Hình thức thanh toán",
  "Contract type": "Loại hợp đồng",
  "Status": "Trạng thái",
  "Contract code": "Mã hợp đồng",
  "Leave blank to auto-generate {0}": "Để trống để tự sinh {0}",
  "Contract name": "Tên hợp đồng",
  "Parent contract": "Hợp đồng chính",
  "No parent": "Không có hợp đồng chính",
  "Require approval": "Cần phê duyệt",
  "Require approval before execution": "Cần duyệt trước khi thực hiện",
  "Approver": "Người duyệt",
  "Search and select approver": "Tìm và chọn người duyệt",
  "Select the Internal company above to continue.": "Chọn Công ty nội bộ ở trên để tiếp tục.",
  "Select customer": "Chọn khách hàng",
  "Add new customer": "Thêm khách hàng mới",
  "Select lawyer": "Chọn luật sư",
  "Select template": "Chọn mẫu",
  "Add new template": "Thêm mẫu mới",
  "Search customer quotation": "Tìm báo giá của khách hàng",
  "Search quotation": "Tìm báo giá",
  "Add new quotation": "Thêm báo giá mới",
  "No case": "Không có hồ sơ",
  "Commercial Terms": "Điều khoản thương mại",
  "Signed date": "Ngày ký",
  "Billing cycle": "Chu kỳ thanh toán",
  "First payment": "Thanh toán đầu tiên",
  "End date": "Ngày kết thúc",
  "Amount per period": "Số tiền mỗi kỳ",
  "Billed every period; the contract is worth this amount × Retainer duration.": "Thu mỗi kỳ; giá trị hợp đồng = số tiền này × Thời hạn retainer.",
  "Open-ended retainer (Retainer duration blank): this amount is billed EVERY period until the next period passes End date (for ever without an End date).": "Retainer không thời hạn (để trống Thời hạn retainer): số tiền này được thu MỖI kỳ cho đến khi kỳ tiếp theo vượt Ngày kết thúc (mãi mãi nếu không có Ngày kết thúc).",
  "Total amount": "Tổng số tiền",
  "= the sum of the services (VND). Change a service price to change the contract total.": "= tổng các dịch vụ (VND). Đổi giá dịch vụ để đổi tổng hợp đồng.",
  "Retainer duration": "Thời hạn retainer",
  "Leave blank to bill the amount every cycle until End date": "Để trống để thu số tiền này mỗi kỳ đến Ngày kết thúc",
  "Number of billing cycles": "Số kỳ thu phí",
  "Retainer repeat": "Chu kỳ lặp retainer",
  "Next payment": "Thanh toán tiếp theo",
  "Auto calculated after first payment and duration": "Tự tính từ thanh toán đầu tiên và thời hạn",
  "An installment is activated when ALL its ticked tasks are Done.": "Một đợt được kích hoạt khi TẤT CẢ công việc đã đánh dấu đều Done.",
  "The payment is activated when ALL its ticked tasks are Done. Tick none to activate it when the Case is Done.": "Thanh toán được kích hoạt khi TẤT CẢ công việc đã đánh dấu đều Done. Không đánh dấu công việc nào để kích hoạt khi Hồ sơ Done.",
  "Each item's Payment Request is created on submit and activated when ALL its ticked tasks are Done. Items whose amount you don't edit share the rest of the Total amount automatically.": "Yêu cầu thanh toán của từng hạng mục được tạo khi gửi và kích hoạt khi TẤT CẢ công việc đã đánh dấu đều Done. Các hạng mục không sửa số tiền sẽ tự chia phần còn lại của Tổng số tiền.",
  "Saving...": "Đang lưu...",
  "Contract guide": "Hướng dẫn hợp đồng",
  "item": "hạng mục",
  "installment": "đợt",
  "service": "dịch vụ",
};
// ---- end ui language ----
const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);

const { React } = ctx;
      const { useCallback, useEffect, useMemo, useRef, useState } = React;
      const {
        Spin,
        message,
        Tooltip,
        Modal,
        Form: AntForm,
        Input: AntInput,
        Select: AntSelect,
        Button: AntButton,
        Checkbox,
      } = ctx.antd;

      const FONT = "inherit";
      const CASE_DOCUMENT_SCOPE = "case_document";
      const AUTO_CREATE_CONTRACT_FOLDERS = false;
      const DEFAULT_CURRENCY_CODE = "VND";
      const CURRENCY_RESOURCE_CANDIDATES = [
        "currencies:list",
        "currency:list",
        "Currency:list",
      ];
      const EXCHANGE_RATE_RESOURCE_CANDIDATES = [
        "exchangeRates:list",
        "exchangeRate:list",
        "ExchangeRates:list",
      ];

      const C = {
        primary: "#1677ff",
        border: "#d9d9d9",
        borderFocus: "#1677ff",
        text: "rgba(0, 0, 0, 0.88)",
        sub: "rgba(0, 0, 0, 0.45)",
        label: "rgba(0, 0, 0, 0.88)",
        bg: "#ffffff",
        bgSoft: "#fafafa",
        danger: "#ff4d4f",
        approvalBg: "#f5f5f5",
        approvalBorder: "#d9d9d9",
        approvalText: "rgba(0, 0, 0, 0.65)",
        approvalBadgeBg: "#f5f5f5",
      };

      // Current page context from the NocoBase record JSON.
      const PROJECT_RECORD_CONFIG = {
        record: ctx.record || null,
      };

      const CONTRACT_TYPES = [
        { value: "byCase", label: tr("By case") },
        { value: "retainer", label: tr("Retainer") },
        // Selectable now that this backend (contractPaymentSchedules,
        // tasks.isPaymentTrigger, the by_service_task_group_done_creates_
        // payment_request SQL trigger) exists — see
        // docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md.
        // No dedicated By Service section exists in this form yet (its
        // billing lives per-service on contractServices/tasks, not on a
        // contract-level schedule), so the Billing Cycle field and the
        // installment Payment Schedule table are hidden for it (see isByCase
        // below) rather than showing By Case's fields against it.
        { value: "byService", label: tr("By Service") },
      ];

      // UI-only grouping (§6i) — contracts.contractType keeps its existing 3
      // values (byCase/byService/retainer); this just organizes the Contract
      // type Select into 2 steps so "Recurring" (Retainer) isn't presented as
      // a 3rd sibling of 2 unrelated non-recurring billing styles. Step 1
      // picks a mode, step 2 (only for "Non-recurring") picks byCase vs
      // byService — see docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md.
      const PAYMENT_MODE_OPTIONS = [
        { value: "non_periodic", label: tr("Non-recurring") },
        { value: "periodic", label: tr("Recurring (Retainer)") },
      ];
      const NON_PERIODIC_CONTRACT_TYPES = CONTRACT_TYPES.filter(
        (option) => option.value !== "retainer",
      );

      // Fee model + its Fixed amount/Hourly rate/Estimated hours/Success fee
      // sub-fields removed entirely (2026-09-22) — confirmed with the user
      // that in practice "Total amount" is always typed by hand, never left
      // to this auto-calc. Also confirmed genuinely broken for By Case
      // specifically: getFeeVisibility only showed "Fixed amount" for
      // Retainer (`isRetainerType && ...`), so By Case's "fixed" model read
      // form.fixedAmount in calcByCaseTotal with no input anywhere to ever
      // set it — By Case's real total always came from the selected
      // services' sum instead, making the whole mechanism dead weight there.
      // Replaced by a single always-visible, directly-editable "Total
      // amount" Field in "Commercial Terms" for all 3 contract types.

      // "monthly"/"quarterly"/"milestone"/"manual" removed from the visible
      // options (2026-09-21) — By Case only ever exercises one_time or
      // multiple_payments (see showFirstPaymentDate/showPaymentSchedule);
      // the others weren't wired to any automation and only added confusion.
      const BILLING_CYCLES = [
        { value: "one_time", label: tr("One time") },
        { value: "multiple_payments", label: tr("Multiple payments") },
      ];

      const RETAINER_REPEAT_ANCHORS = [
        { value: "day", label: tr("Day") },
        { value: "week", label: tr("Week") },
        { value: "month", label: tr("Month") },
        { value: "year", label: tr("Year") },
      ];

      const STATUS_OPTIONS = [
        { value: "draft", label: tr("Draft") },
        { value: "pending_approval", label: tr("Pending approval") },
        { value: "approved", label: tr("Approved") },
        { value: "sent", label: tr("Sent for signature") },
        { value: "signed", label: tr("Signed") },
        { value: "negotiation", label: tr("Negotiation") },
        { value: "pending", label: tr("Pending") },
        { value: "approval", label: tr("Approval") },
        { value: "execution", label: tr("Execution") },
        { value: "completed", label: tr("Completed") },
        { value: "terminated", label: tr("Terminated") },
        { value: "cancelled", label: tr("Cancelled") },
        { value: "rejected", label: tr("Rejected") },
        { value: "closed", label: tr("Closed") },
        { value: "expired", label: tr("Expired") },
      ];

      const todayInput = () => new Date().toISOString().slice(0, 10);

      const extractId = (value) => {
        const id = value && typeof value === "object" ? value.id : value;
        return id ? parseInt(id, 10) : null;
      };

      const extractFirstId = (value) => {
        if (Array.isArray(value)) return extractId(value[0]);
        return extractId(value);
      };

      // 2026-09-29: a retainer's billing plan is sent with the contract
      // (payload.billingPlans), but NocoBase drops it silently on an instance
      // without the contracts.billingPlans field
      // (JsField/RegisterContractsBillingPlansInverseField.js). The plan is what
      // bills the periods and what pgsql/finance_retainer_schedule.sql turns
      // into the contract's payment schedule ("Kỳ 1…N", shown on the Case
      // Finance tab), so after creating the contract it is created here if it
      // is still missing.
      const ensureRetainerBillingPlan = async (contractId, plan) => {
        const res = await ctx.api.request({
          url: "contractBillingPlans:list",
          params: { filter: JSON.stringify({ contractId: { $eq: contractId } }), paginate: false },
        });
        if ((res?.data?.data || []).length) return;
        await ctx.api.request({
          url: "contractBillingPlans:create",
          method: "POST",
          data: {
            ...plan,
            contractId,
            contracts: contractId,
          },
        });
      };

      // Unique identity for a service line in the "select which services to
      // bring into this Contract" picker. Most lines are anchored to a real
      // projectServices row (a Case exists) and key off projectServiceId, same
      // as before this helper existed. A Quotation with no linked Case has no
      // projectServices at all, so its lines are keyed off quotationServiceId
      // instead (prefixed to avoid ever colliding with a numeric
      // projectServiceId string).
      const lineKey = (line) => {
        const psId = extractId(line?.projectServiceId);
        if (psId) return String(psId);
        const qsId = extractId(line?.quotationServiceId);
        if (qsId) return `qsvc-${qsId}`;
        return String(line?.id || "");
      };

      // Group key for a combo section header, for a row that was NOT applied
      // fresh in this session (no _comboInstanceId) but carries the persisted
      // comboId/comboName from its source Case/Quotation. Always prefixed with
      // "persisted-" so callers can tell it apart from a real appliedCombos
      // instanceId without a lookup.
      const getPersistedComboGroupKey = (row) =>
        row?.comboId
          ? `persisted-id-${row.comboId}`
          : row?.comboName
            ? `persisted-name-${row.comboName}`
            : null;

      const parseNum = (value) => {
        const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
        return Number.isFinite(n) ? n : 0;
      };
      const extractCurrencyId = (value) => {
        if (!value) return null;
        if (Array.isArray(value)) return extractCurrencyId(value[0]);
        if (typeof value === "object")
          return extractCurrencyId(value.id || value.value || value.key);
        const parsed = parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const extractCurrencyCode = (value) => {
        if (!value) return "";
        if (Array.isArray(value)) return extractCurrencyCode(value[0]);
        if (typeof value === "object")
          return extractCurrencyCode(
            value.code ||
              value.currencyCode ||
              value.isoCode ||
              value.title ||
              value.label ||
              value.name,
          );
        const match = String(value)
          .trim()
          .toUpperCase()
          .match(/\b[A-Z]{3}\b/);
        return match ? match[0] : "";
      };
      const getRecordCurrencyId = (record) =>
        extractCurrencyId(
          record?.currencyId ||
            record?.currency ||
            record?.currencies ||
            record?.Currencies ||
            record?.defaultCurrencyId ||
            record?.defaultCurrency,
        );
      const getRecordCurrencyCode = (record) =>
        extractCurrencyCode(
          record?.currencyCode ||
            record?.currency ||
            record?.currencies ||
            record?.Currencies ||
            record?.defaultCurrencyCode ||
            record?.defaultCurrency,
        );
      const getCurrencyCode = (currency) =>
        String(
          currency?.code ||
            currency?.currencyCode ||
            currency?.name ||
            DEFAULT_CURRENCY_CODE,
        ).toUpperCase();
      const getCurrencyDecimals = (currency) => {
        const explicit = Number(currency?.decimalPlaces ?? currency?.precision);
        if (Number.isFinite(explicit)) return Math.max(0, explicit);
        return getCurrencyCode(currency) === DEFAULT_CURRENCY_CODE ? 0 : 2;
      };
      const getCurrencyLocale = (currency) =>
        currency?.locale ||
        (getCurrencyCode(currency) === DEFAULT_CURRENCY_CODE ? "vi-VN" : "en-US");
      const defaultCurrencyObject = () => ({
        code: DEFAULT_CURRENCY_CODE,
        currencyCode: DEFAULT_CURRENCY_CODE,
        decimalPlaces: 0,
        locale: "vi-VN",
      });
      const findCurrencyById = (currencies = [], id) => {
        const safeId = extractCurrencyId(id);
        if (!safeId) return null;
        return (
          currencies.find((currency) => extractCurrencyId(currency?.id) === safeId) ||
          null
        );
      };
      const findCurrencyByCode = (currencies = [], code) => {
        const safeCode = extractCurrencyCode(code);
        if (!safeCode) return null;
        return (
          currencies.find((currency) => extractCurrencyCode(currency) === safeCode) ||
          null
        );
      };
      const currencyObjectFromCode = (code) => {
        const safeCode = extractCurrencyCode(code);
        return safeCode
          ? {
              code: safeCode,
              currencyCode: safeCode,
              decimalPlaces: safeCode === DEFAULT_CURRENCY_CODE ? 0 : 2,
            }
          : null;
      };
      const resolveCurrency = (value, currencies = []) => {
        const source = Array.isArray(value) ? value[0] : value;
        return (
          findCurrencyById(currencies, source) ||
          findCurrencyByCode(currencies, source) ||
          (typeof source === "object" && extractCurrencyCode(source)
            ? source
            : null) ||
          currencyObjectFromCode(source)
        );
      };
      const findDefaultCurrency = (currencies = []) =>
        currencies.find(
          (currency) =>
            currency?.isBaseCurrency ||
            getCurrencyCode(currency) === DEFAULT_CURRENCY_CODE,
        ) ||
        currencies[0] ||
        defaultCurrencyObject();
      const currencyFromRecordOptional = (record, currencies = [], fallback = null) =>
        resolveCurrency(
          record?.currency ||
            record?.currencies ||
            record?.Currencies ||
            record?.currencyId,
          currencies,
        ) ||
        resolveCurrency(getRecordCurrencyId(record), currencies) ||
        resolveCurrency(getRecordCurrencyCode(record), currencies) ||
        resolveCurrency(fallback, currencies);
      const currencyFromRecord = (record, currencies = [], fallback = null) =>
        currencyFromRecordOptional(record, currencies, fallback) ||
        fallback ||
        defaultCurrencyObject();
      const currencySelectLabel = (currency) => {
        const code = getCurrencyCode(currency);
        return code;
      };
      const formatMoneyAmountByCurrency = (value, currency = null) => {
        if (!value && value !== 0) return "";
        const info = currency || defaultCurrencyObject();
        const n = Number(value);
        if (!Number.isFinite(n)) return "";
        return n.toLocaleString(getCurrencyLocale(info), {
          minimumFractionDigits: getCurrencyDecimals(info),
          maximumFractionDigits: getCurrencyDecimals(info),
        });
      };
      const formatMoneyByCurrency = (value, currency = null) => {
        const info = currency || defaultCurrencyObject();
        const amount = formatMoneyAmountByCurrency(value, info);
        return amount ? `${amount} ${getCurrencyCode(info)}` : "";
      };
      const isSameCurrency = (a, b) => {
        const aId = extractCurrencyId(a);
        const bId = extractCurrencyId(b);
        if (aId && bId) return aId === bId;
        const aCode = extractCurrencyCode(a);
        const bCode = extractCurrencyCode(b);
        return !!aCode && !!bCode && aCode === bCode;
      };
      const parseDateMillis = (value) => {
        if (!value) return 0;
        const ms = new Date(value).getTime();
        return Number.isFinite(ms) ? ms : 0;
      };
      const getExchangeRateCurrencyId = (rate, side) =>
        extractCurrencyId(rate?.[`${side}CurrencyId`] || rate?.[`${side}Currency`]);
      const getExchangeRateCurrencyCode = (rate, side) =>
        extractCurrencyCode(
          rate?.[`${side}Currency`] || rate?.[`${side}CurrencyCode`],
        );
      const isUsableExchangeRateStatus = (status) => {
        const value = String(status || "")
          .trim()
          .toLowerCase();
        if (!value) return true;
        return ![
          "inactive",
          "disabled",
          "archived",
          "cancelled",
          "canceled",
          "draft",
        ].includes(value);
      };
      const exchangeRateMatchesCurrency = (rate, side, currency) => {
        const rateCurrencyId = getExchangeRateCurrencyId(rate, side);
        const currencyId = extractCurrencyId(currency);
        if (rateCurrencyId && currencyId) return rateCurrencyId === currencyId;
        const rateCurrencyCode = getExchangeRateCurrencyCode(rate, side);
        const currencyCode = extractCurrencyCode(currency);
        return (
          !!rateCurrencyCode && !!currencyCode && rateCurrencyCode === currencyCode
        );
      };
      // Business dates are Vietnam dates, as in the database (money_local_date):
      // "2026-09-01" stays as it is; a timestamp is read in Asia/Ho_Chi_Minh.
      const moneyDateKey = (value) => {
        if (!value && value !== 0) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
        const ms = parseDateMillis(value);
        return ms === null ? null : new Date(ms + 7 * 3600 * 1000).toISOString().slice(0, 10);
      };
      // Rates carry 15 significant digits, as float8 -> numeric does in Postgres.
      const rate15 = (value) => Number(Number(value).toPrecision(15));
      const pickExchangeRate = (rates = [], fromCurrency, toCurrency, pricingDate, when = "onOrBefore") => {
        const cutoff = moneyDateKey(pricingDate) || moneyDateKey(Date.now());
        const candidates = (rates || [])
          .map((rate) => ({
            record: rate,
            rate: parseNum(rate?.rate),
            effectiveMs: parseDateMillis(rate?.effectiveDate) || 0,
            day: moneyDateKey(rate?.effectiveDate) || "1900-01-01",
          }))
          .filter(
            (item) =>
              item.rate > 0 &&
              isUsableExchangeRateStatus(item.record?.status) &&
              exchangeRateMatchesCurrency(item.record, "from", fromCurrency) &&
              exchangeRateMatchesCurrency(item.record, "to", toCurrency),
          );
        if (when === "after") {
          return candidates.filter((item) => item.day > cutoff).sort((a, b) => a.effectiveMs - b.effectiveMs || (Number(b.record?.id) || 0) - (Number(a.record?.id) || 0))[0] || null;
        }
        return candidates.filter((item) => item.day <= cutoff).sort((a, b) => b.effectiveMs - a.effectiveMs || (Number(b.record?.id) || 0) - (Number(a.record?.id) || 0))[0] || null;
      };
      // same order as money_rate_to_base(): the latest direct rate on or before
      // the date, else the latest inverse one; only then the earliest after it.
      const pickConversionRate = (rates = [], fromCurrency, toCurrency, pricingDate) => {
        for (const when of ["onOrBefore", "after"]) {
          const direct = pickExchangeRate(rates, fromCurrency, toCurrency, pricingDate, when);
          if (direct) return { ...direct, rate: rate15(direct.rate), direction: "direct" };
          const inverse = pickExchangeRate(rates, toCurrency, fromCurrency, pricingDate, when);
          if (inverse) {
            return {
              ...inverse,
              direction: "inverse",
              originalRate: inverse.rate,
              rate: rate15(1 / rate15(inverse.rate)),
            };
          }
        }
        return null;
      };
      // ---- catalog VND text (pure; tested by scripts/tests/catalog-vnd-display.test.js) ----
      // The VND a catalog / company price was converted to at the latest rate
      // (stored by pgsql/currency_catalog.sql): a company price shows only its own
      // priceVnd, a catalog service its basePriceVnd; nothing for a VND price.
      const catalogVndText = (record, currency) => {
        const code = String(currency?.code || currency?.currencyCode || "").toUpperCase();
        if (!record || code === "VND") return null;
        const own = Object.prototype.hasOwnProperty.call(record, "priceVnd") ? record.priceVnd : record.basePriceVnd;
        const n = Number(own);
        return own === null || own === undefined || own === "" || !Number.isFinite(n)
          ? null
          : tr("≈ {0} VND", { 0: Math.round(n).toLocaleString("vi-VN") });
      };
      // ---- end catalog VND text ----
      // ---- base conversion helpers (pure; tested by scripts/tests/money-cases.test.js) ----
      // VND of some lines: each line converted and rounded on its own, then
      // summed, as the database does (money_line_amounts), so the total shown
      // is the one the database stores.
      const convertLinesToBase = (lines, rate) =>
        (lines || []).reduce(
          (acc, line) => {
            const sub = Math.round((Number(line?.subTotal) || 0) * rate);
            const vat = Math.round((Number(line?.vatAmount) || 0) * rate);
            return {
              subTotal: acc.subTotal + sub,
              vatAmount: acc.vatAmount + vat,
              totalAmount: acc.totalAmount + sub + vat,
            };
          },
          { subTotal: 0, vatAmount: 0, totalAmount: 0 },
        );
      // ---- end base conversion helpers ----
      // ---- currency breakdown helpers (pure; tested by scripts/tests/create-forms-look.test.js) ----
      // One row per currency for the "Currency breakdown" modal, the columns of the
      // Case form: original total, rate to VND, converted total (each line on its
      // own, as the database), rate date and source.
      const currencyBreakdownRows = (groups, { isBase, matchOf, codeOf, convert }) =>
        (groups || []).map((group, index) => {
          const base = isBase(group);
          const matched = base ? { rate: 1, record: null, direction: "base" } : matchOf(group);
          const rate = Number(matched?.rate) || 0;
          const converted = rate ? convert(group.lines || [], rate) : null;
          return {
            key: `${codeOf(group.currency)}-${index}`,
            currency: group.currency,
            currencyCode: codeOf(group.currency),
            lineCount: group.lineCount || (group.lines || []).length,
            originalTotal: group.totalAmount,
            rate: rate || null,
            convertedTotal: converted ? converted.totalAmount : null,
            effectiveDate: base ? null : matched?.record?.effectiveDate || null,
            source: base
              ? tr("Base currency")
              : !rate
                ? tr("No rate")
                : `${matched?.record?.source || matched?.record?.status || tr("Manual")}${matched?.direction === "inverse" ? " (inverse)" : ""}`,
            status: base ? "base" : rate ? "converted" : "missing",
          };
        });
      // ---- end currency breakdown helpers ----
      // ---- contract total helpers (pure; tested by scripts/tests/money-cases.test.js) ----
      // The total the contract keeps, which its installments are split from.
      // Priced service lines (no retainer, no combo): the database sets it to
      // Σ lines (money_contract_header), so a typed total cannot win there;
      // otherwise the typed total, else the services' sum.
      const contractTotalFromLines = ({ rows = [], isRetainer = false, packageMode = false } = {}) =>
        !isRetainer &&
        !packageMode &&
        (rows || []).length > 0 &&
        (rows || []).every((row) => String(row?.basePrice ?? "").trim() !== "");
      const resolveContractTotal = ({ rows = [], isRetainer = false, packageMode = false, typedTotal, linesTotal } = {}) =>
        contractTotalFromLines({ rows, isRetainer, packageMode })
          ? parseNum(linesTotal)
          : parseNum(typedTotal) || parseNum(linesTotal) || 0;
      // ---- end contract total helpers ----
      // ---- contract summary helpers (pure; tested by scripts/tests/create-forms-money.test.js) ----
      const buildContractFinancialSummary = ({
        rows = [],
        currencies = [],
        baseCurrency = null,
        exchangeRates = [],
        pricingDate,
        packageMode = false,
        packageTotals = null,
      } = {}) => {
        const targetCurrency = baseCurrency || findDefaultCurrency(currencies);
        if (packageMode) {
          const amounts = resolveServiceAmounts(packageTotals || {});
          return {
            groups: [],
            missing: [],
            converted: { ...amounts, canConvert: true, currency: targetCurrency },
          };
        }
        const byCurrency = {};
        (rows || []).forEach((row) => {
          if (!row) return;
          const rowCurrency = currencyFromRecord(row, currencies, targetCurrency);
          const amounts = lineAmountsInCurrency(row, getCurrencyDecimals(rowCurrency));
          if (!amounts.subTotal && !amounts.vatAmount && !amounts.totalAmount) return;
          const key =
            extractCurrencyId(row.currencyId) ||
            extractCurrencyId(rowCurrency) ||
            getCurrencyCode(rowCurrency);
          if (!byCurrency[key]) {
            byCurrency[key] = {
              currency: rowCurrency,
              subTotal: 0,
              vatAmount: 0,
              totalAmount: 0,
              lineCount: 0,
              lines: [],
            };
          }
          byCurrency[key].subTotal += amounts.subTotal;
          byCurrency[key].vatAmount += amounts.vatAmount;
          byCurrency[key].totalAmount += amounts.totalAmount;
          byCurrency[key].lineCount += 1;
          byCurrency[key].lines.push(amounts);
        });
        const groups = Object.values(byCurrency);
        const missing = [];
        const converted = groups.reduce(
          (acc, group) => {
            const matched = isSameCurrency(group.currency, targetCurrency)
              ? { rate: 1 }
              : pickConversionRate(
                  exchangeRates,
                  group.currency,
                  targetCurrency,
                  pricingDate,
                );
            if (!matched?.rate) {
              missing.push(group);
              return acc;
            }
            // Whole đồng per line, total = subtotal + VAT: the contract total
            // shown here is the one the database stores (Σ of its lines).
            const g = convertLinesToBase(group.lines, matched.rate);
            return {
              subTotal: acc.subTotal + g.subTotal,
              vatAmount: acc.vatAmount + g.vatAmount,
              totalAmount: acc.totalAmount + g.totalAmount,
            };
          },
          { subTotal: 0, vatAmount: 0, totalAmount: 0 },
        );
        return {
          groups,
          missing,
          converted: {
            ...converted,
            canConvert: missing.length === 0,
            currency: targetCurrency,
          },
        };
      };
      // The one row a combo document's header is summed from: its first package
      // line carrying every combo group's total. That line's *Native amounts
      // and rate are only its own group's (money_line_compute), so they go —
      // else they would win over the summed total (25,000,000 became 10,000,000).
      const packageHeaderRow = (packageLine, packageAmounts, currencyId) => {
        const {
          subTotalNative, vatAmountNative, totalAmountNative,
          exchangeRateToBase, exchangeRateDate, basePriceVnd,
          ...rest
        } = packageLine || {};
        return {
          ...rest,
          currencyId,
          subTotal: packageAmounts.subTotal,
          vatAmount: packageAmounts.vatAmount,
          totalAmount: packageAmounts.totalAmount,
        };
      };
      // ---- end contract summary helpers ----
      const getConversionSourceCurrencyIds = (groups = [], baseCurrency = null) =>
        Array.from(
          new Set(
            (groups || [])
              .filter((group) => !isSameCurrency(group.currency, baseCurrency))
              .map((group) => extractCurrencyId(group.currency))
              .filter(Boolean),
          ),
        );
      const formatMissingRatePairs = (groups = [], baseCurrency = null) => {
        const baseCode = getCurrencyCode(baseCurrency || defaultCurrencyObject());
        return (groups || [])
          .map((group) => `${getCurrencyCode(group.currency)} → ${baseCode}`)
          .join(", ");
      };

      const nullableNum = (value) =>
        value === undefined || value === null || value === ""
          ? null
          : parseNum(value);

      // ---- money draft helpers (pure; tested by scripts/tests/money-input.test.js) ----
      const formatMoneyNumber = (value) => {
        const raw = String(value ?? "").replace(/[^\d]/g, "");
        if (!raw) return "";
        return Number(raw).toLocaleString("vi-VN");
      };

      const moneyRaw = (value) => String(value ?? "").replace(/[^\d]/g, "");
      // Vietnamese typing too: a comma is the decimal point when 1-2 digits
      // (or nothing yet) follow it, and groups thousands when 3 do ("1,500");
      // a dot is the decimal point unless several dots group thousands.
      const cleanDecimalDraft = (value, decimals) => {
        const s = String(value ?? "").replace(/[^\d.,]/g, "");
        const last = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
        if (last < 0) return s;
        const tail = s.slice(last + 1);
        const sameSeps = (s.match(/[.,]/g) || []).every((c) => c === s[last]);
        const grouping = tail.length === 3 && sameSeps && (s[last] === "," || s.split(".").length > 2);
        if (grouping) return s.replace(/[.,]/g, "");
        return `${s.slice(0, last).replace(/[.,]/g, "")}.${tail.slice(0, Math.max(0, decimals))}`;
      };
      // What a money box shows: VND grouped "1.000.000" (a stored decimal
      // amount, e.g. switched from USD, rounds to whole đồng); a foreign
      // amount as typed ("120.5", "120."). What it hands back (a string, as
      // before): digits for VND, "120.50" for a foreign currency.
      const moneyInputShow = (value, decimals) => {
        if (decimals > 0) return cleanDecimalDraft(value, decimals);
        const s = String(value ?? "").trim();
        return formatMoneyNumber(/^\d+\.\d+$/.test(s) ? String(Math.round(Number(s))) : s);
      };
      const moneyInputRaw = (value, decimals) =>
        decimals > 0 ? cleanDecimalDraft(value, decimals) : moneyRaw(value);
      // ---- end money draft helpers ----
      const hasInputValue = (value) =>
        value !== undefined && value !== null && value !== "";

      const compact = (items) =>
        items
          .map((item) =>
            item === undefined || item === null ? "" : String(item).trim(),
          )
          .filter(Boolean);

      const SYSTEM_USER_ID = 1;
      const QUICK_CREATE_CREATED_EVENT = "law:quick-create:created";
      const QUICK_CREATE_BRIDGE_KEY = "__lawQuickCreateBridge";
      const CONTRACT_REFRESH_BLOCK_UID = "7be57facee6";
      const QUOTATION_REFRESH_BLOCK_UID = "sowlvtiiqkv";
      // The Contract module's own list block — confirmed via NocoBase View Settings.
      const DEFAULT_REFRESH_BLOCK_UID = CONTRACT_REFRESH_BLOCK_UID;
      const ADDITIONAL_REFRESH_BLOCK_UIDS = [
        CONTRACT_REFRESH_BLOCK_UID,
        QUOTATION_REFRESH_BLOCK_UID,
      ];
      const POPUP_VIEW_UIDS = {
        customerCreate: "onjascp1npq",
        quotationCreate: "v44ehxkcghx",
        templateCreate: "c17e97e4828",
      };
      const QUICK_CREATE_COLLECTION_BY_VIEW = {
        customerCreate: "customers",
        quotationCreate: "quotations",
        templateCreate: "template",
      };
      const QUICK_CREATE_REFRESH_BLOCK_UID_BY_VIEW = {
        quotationCreate: QUOTATION_REFRESH_BLOCK_UID,
      };
      const isSystemUserId = (value) => extractId(value) === SYSTEM_USER_ID;
      const filterSelectableLawyers = (items = []) =>
        (items || []).filter((item) => {
          const linkedUserId =
            extractId(item?.userId) ||
            extractId(item?.user) ||
            extractId(item?.users) ||
            extractId(item?.accountId) ||
            extractId(item?.account);
          return linkedUserId
            ? !isSystemUserId(linkedUserId)
            : !isSystemUserId(item?.id);
        });

      const getQuickCreateBridge = () => {
        const scope =
          ctx.engine || ctx.app || (typeof window !== "undefined" ? window : null);
        if (!scope) return null;
        if (!scope[QUICK_CREATE_BRIDGE_KEY]) {
          const listeners = new Set();
          const recent = [];
          scope[QUICK_CREATE_BRIDGE_KEY] = {
            emit(detail) {
              const payload = { ...(detail || {}), emittedAt: Date.now() };
              recent.unshift(payload);
              if (recent.length > 20) recent.pop();
              listeners.forEach((listener) => {
                try {
                  listener(payload);
                } catch (error) {
                  console.warn(
                    "[ContractCreateForm] quick-create bridge listener failed",
                    error,
                  );
                }
              });
            },
            subscribe(listener, options = {}) {
              if (typeof listener !== "function") return () => {};
              listeners.add(listener);
              if (options.replay) {
                recent.forEach((detail) => {
                  try {
                    listener(detail);
                  } catch (error) {
                    console.warn(
                      "[ContractCreateForm] quick-create bridge replay failed",
                      error,
                    );
                  }
                });
              }
              return () => listeners.delete(listener);
            },
          };
        }
        return scope[QUICK_CREATE_BRIDGE_KEY];
      };

      // `getPopupParams()` (defined below) merges the exact same raw ctx sources plus
      // derived fields, so this just delegates to it as the single source of truth.
      const getRuntimeInput = () => {
        try {
          return getPopupParams();
        } catch {
          return {};
        }
      };

      const getBlockModelByUid = (uid) => {
        if (!uid) return null;
        const engine = ctx.engine || ctx.app;
        try {
          let foundVia = "NOT FOUND";
          let model = ctx.getModel?.(uid, true);
          if (model) foundVia = "ctx.getModel(uid,true)";
          if (!model) {
            model = ctx.getModel?.(uid);
            if (model) foundVia = "ctx.getModel(uid)";
          }
          if (!model) {
            model = engine?.getModel?.(uid);
            if (model) foundVia = "engine.getModel(uid)";
          }
          if (!model && ctx.app && ctx.app !== engine) {
            model = ctx.app?.getModel?.(uid);
            if (model) foundVia = "ctx.app.getModel(uid)";
          }
          console.log("[ContractCreateForm][refresh-debug] getBlockModelByUid", {
            uid,
            foundVia,
            hasEngine: !!engine,
            hasCtxGetModel: typeof ctx.getModel === "function",
            resolvedHasResource: !!(model && model.resource),
            resolvedHasRefreshFn: !!(model && typeof model.refresh === "function"),
          });
          return model || null;
        } catch (error) {
          console.warn("[ContractCreateForm] get model failed", uid, error);
          return null;
        }
      };

      const refreshBlockModel = async (blockModel, uidForLog) => {
        if (!blockModel) return false;
        try {
          const resource = blockModel.resource;
          if (resource && typeof resource.refresh === "function") {
            await resource.refresh();
            console.log(
              "[ContractCreateForm][refresh-debug] refreshed via resource.refresh()",
              uidForLog,
            );
            return true;
          }
          if (typeof blockModel.refresh === "function") {
            await blockModel.refresh();
            console.log(
              "[ContractCreateForm][refresh-debug] refreshed via blockModel.refresh()",
              uidForLog,
            );
            return true;
          }
          console.warn(
            "[ContractCreateForm][refresh-debug] model found but has no resource.refresh/refresh function",
            uidForLog,
            blockModel,
          );
        } catch (error) {
          console.warn("[ContractCreateForm] refresh failed", uidForLog, error);
        }
        return false;
      };

      // ctx.getModel(uid)/engine.getModel(uid) do not actually resolve blocks by a
      // foreign UID in this NocoBase runtime (verified: even a UID copied straight
      // from the block's own "Copy UID" menu returns nothing) — there is no
      // documented cross-block "get model by uid" API (see
      // nocobase-docs/runjs-ctx-api.md). The one thing that reliably updates the
      // list is a real click on its own "Refresh" button, so simulate that via
      // the DOM instead of guessing at model APIs.
      const REFRESH_BUTTON_TEXT_VARIANTS = [
        "refresh",
        "làm mới",
        "tải lại",
        "reload",
      ];
      const clickVisibleRefreshButtons = () => {
        try {
          const candidates = Array.from(
            document.querySelectorAll("button, [role='button']"),
          );
          const matches = candidates.filter((el) => {
            const text = (el.textContent || "").trim().toLowerCase();
            return REFRESH_BUTTON_TEXT_VARIANTS.includes(text);
          });
          matches.forEach((el) => {
            try {
              el.click();
            } catch (error) {
              console.warn(
                "[ContractCreateForm][refresh-debug] click failed on refresh button",
                error,
              );
            }
          });
          console.log(
            "[ContractCreateForm][refresh-debug] clickVisibleRefreshButtons matched",
            matches.length,
            "button(s)",
          );
          return matches.length > 0;
        } catch (error) {
          console.warn(
            "[ContractCreateForm][refresh-debug] clickVisibleRefreshButtons failed",
            error,
          );
          return false;
        }
      };

      // Mirrors CaseCreateForm.js's refreshNocoBaseDataBlocks: try each candidate
      // block UID via ctx.getModel first (explicit runtime params, then the
      // hardcoded DEFAULT_REFRESH_BLOCK_UID/ADDITIONAL_REFRESH_BLOCK_UIDS), fall
      // back to the current block/model, and finally simulate a real click on any
      // visible "Refresh" button as the mechanism actually proven to work.
      const refreshNocoBaseDataBlocks = async () => {
        const input = getRuntimeInput();
        const inputRefreshBlockUids = Array.isArray(input.refreshBlockUids)
          ? input.refreshBlockUids
          : [input.refreshBlockUid, input.refreshBlockUids];
        const uidCandidates = Array.from(
          new Set(
            compact([
              input.targetBlockUid,
              input.sourceBlockUid,
              input.blockUid,
              input.dataBlockUid,
              ...inputRefreshBlockUids,
              DEFAULT_REFRESH_BLOCK_UID,
              ...ADDITIONAL_REFRESH_BLOCK_UIDS,
            ]),
          ),
        );
        console.log(
          "[ContractCreateForm][refresh-debug] uidCandidates",
          uidCandidates,
        );

        let refreshedAny = false;
        for (const uid of uidCandidates) {
          const refreshed = await refreshBlockModel(getBlockModelByUid(uid), uid);
          refreshedAny = refreshedAny || refreshed;
        }

        if (!refreshedAny) {
          console.warn(
            "[ContractCreateForm][refresh-debug] no candidate UID resolved to a refreshable model, falling back to ctx.blockModel/ctx.model",
          );
          refreshedAny = await refreshBlockModel(
            ctx.blockModel || ctx.model,
            "ctx.blockModel||ctx.model",
          );
        }

        const clickedRefreshButton = clickVisibleRefreshButtons();
        refreshedAny = refreshedAny || clickedRefreshButton;

        console.log(
          "[ContractCreateForm][refresh-debug] refreshNocoBaseDataBlocks result:",
          refreshedAny,
        );
        return refreshedAny;
      };

      const emitQuickCreateCreated = (collection, record) => {
        const id = extractId(record);
        if (!id) return;
        const input = getRuntimeInput();
        const detail = {
          collection,
          id: String(id),
          record,
          quickCreateRequestId: input.quickCreateRequestId || null,
          quickCreateViewKey: input.quickCreateViewKey || null,
          quickCreateSource: input.quickCreateSource || null,
          quickCreateTargetCollection:
            input.quickCreateTargetCollection || collection,
          sourceBlockUid: input.sourceBlockUid || null,
          targetBlockUid: input.targetBlockUid || CONTRACT_REFRESH_BLOCK_UID,
          dataBlockUid: input.dataBlockUid || CONTRACT_REFRESH_BLOCK_UID,
          refreshBlockUids: compact([
            input.refreshBlockUid,
            ...(Array.isArray(input.refreshBlockUids) ? input.refreshBlockUids : []),
            input.targetBlockUid,
            input.dataBlockUid,
            CONTRACT_REFRESH_BLOCK_UID,
          ]),
          createdAt: Date.now(),
        };
        try {
          getQuickCreateBridge()?.emit(detail);
        } catch {}
        try {
          window.dispatchEvent(
            new CustomEvent(QUICK_CREATE_CREATED_EVENT, { detail }),
          );
        } catch {}
        try {
          if (window.parent && window.parent !== window) {
            window.parent.dispatchEvent(
              new CustomEvent(QUICK_CREATE_CREATED_EVENT, { detail }),
            );
          }
        } catch {}
        try {
          ctx.emit?.(QUICK_CREATE_CREATED_EVENT, detail);
        } catch {}
        try {
          ctx.eventBus?.emit?.(QUICK_CREATE_CREATED_EVENT, detail);
        } catch {}
        try {
          ctx.view?.emit?.(QUICK_CREATE_CREATED_EVENT, detail);
        } catch {}
      };

      const openPopupViewByUid = async (viewKey, params = {}) => {
        const uid = POPUP_VIEW_UIDS[viewKey];
        if (!uid) {
          message.warning(tr("Please configure POPUP_VIEW_UIDS.{0} first.", { 0: viewKey }));
          return false;
        }

        if (!ctx.openView) {
          message.error(tr("ctx.openView is not available in this runtime."));
          return false;
        }

        try {
          const defineProperties = {};
          for (const key in params) {
            if (Object.prototype.hasOwnProperty.call(params, key)) {
              defineProperties[key] = {
                value: params[key],
                writable: true,
                enumerable: true,
                configurable: true,
              };
            }
          }

          const result = ctx.openView(uid, {
            navigation: false,
            inputArgs: params,
            params,
            defineProperties,
            ...params,
          });
          if (result?.then) await result;
          return true;
        } catch (error) {
          console.warn("[ContractCreateForm] ctx.openView failed", error);
          message.error(tr("Cannot open configured popup view."));
          return false;
        }
      };

      const closePopupAfterSubmit = async () => {
        await refreshNocoBaseDataBlocks();
        return closeCurrentPopup();
      };

      const closeCurrentPopup = () => {
        const calls = [
          [ctx.view, "close", []],
          [ctx, "onClose", []],
          [ctx, "close", []],
          [ctx.popup, "onClose", []],
          [ctx.popup, "close", []],
          [ctx.popup, "closeModal", []],
          [ctx.modal, "onClose", []],
          [ctx.modal, "close", []],
          [ctx.drawer, "onClose", []],
          [ctx.drawer, "close", []],
          [ctx.action, "onClose", []],
          [ctx.action, "close", []],
          [ctx.popup, "setVisible", [false]],
          [ctx.modal, "setVisible", [false]],
          [ctx.modal, "setOpen", [false]],
          [ctx.drawer, "setOpen", [false]],
        ];

        for (const [target, method, args] of calls) {
          if (target && typeof target[method] === "function") {
            try {
              target[method](...(args || []));
              return true;
            } catch (error) {
              console.warn("[ContractCreateForm] close popup failed", error);
            }
          }
        }
        return false;
      };

      const showDiscardConfirm = (onOk) => {
        if (showDiscardConfirm._open) return;
        const run = async () => {
          try {
            await onOk?.();
          } catch (error) {
            console.warn("[ContractCreateForm] discard close failed", error);
          } finally {
            showDiscardConfirm._open = false;
          }
        };

        if (Modal?.confirm) {
          showDiscardConfirm._open = true;
          Modal.confirm({
            title: tr("Discard changes?"),
            content: tr("Your unsaved input will be lost."),
            okText: tr("Discard"),
            cancelText: tr("Continue editing"),
            okButtonProps: { danger: true },
            maskClosable: false,
            onCancel: () => {
              showDiscardConfirm._open = false;
            },
            onOk: run,
          });
          return;
        }
        run();
      };

      const configureGuardedModalClose = (requestClose) => {
        if (typeof requestClose !== "function") return;
        const restoreFns = [];
        const props = {
          maskClosable: true,
          keyboard: false,
          onCancel: requestClose,
          onClose: requestClose,
        };
        [
          [ctx.view, "setProps"],
          [ctx.view, "setOptions"],
          [ctx.popup, "setProps"],
          [ctx.popup, "setOptions"],
          [ctx.modal, "setProps"],
          [ctx.modal, "setOptions"],
          [ctx.drawer, "setProps"],
          [ctx.drawer, "setOptions"],
          [ctx.action, "setProps"],
        ].forEach(([target, method]) => {
          if (target && typeof target[method] === "function") {
            try {
              target[method](props);
            } catch (error) {
              console.warn(
                "[ContractCreateForm] configure modal close failed",
                error,
              );
            }
          }
        });

        const patchMethod = (target, method) => {
          if (!target || typeof target[method] !== "function") return;
          const original = target[method];
          const patchedClose = function patchedClose(...args) {
            const isSetter = method === "setVisible" || method === "setOpen";
            if (isSetter && args[0] !== false) return original.apply(this, args);
            requestClose(() => original.apply(this, args));
            return undefined;
          };
          try {
            target[method] = patchedClose;
          } catch (error) {
            console.warn("[ContractCreateForm] patch close failed", error);
            return;
          }
          restoreFns.push(() => {
            if (target[method] !== patchedClose) return;
            try {
              target[method] = original;
            } catch {}
          });
        };

        [ctx.view, ctx.popup, ctx.modal, ctx.drawer, ctx.action, ctx].forEach(
          (target) => {
            ["onClose", "close", "closeModal", "setVisible", "setOpen"].forEach(
              (method) => patchMethod(target, method),
            );
          },
        );

        return () => {
          restoreFns.forEach((restore) => {
            try {
              restore();
            } catch {}
          });
        };
      };

      const toIso = (dateValue) => {
        if (!dateValue) return null;
        const d = new Date(`${dateValue}T00:00:00`);
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
      };

      const toIsoDateTime = (dateValue) => {
        if (!dateValue) return null;
        const value = String(dateValue);
        const d = new Date(value.includes("T") ? value : `${value}T00:00:00`);
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
      };

      const labelOf = (item, fields, fallbackPrefix) => {
        for (const field of fields) {
          if (item?.[field]) return String(item[field]);
        }
        return `${fallbackPrefix} #${item?.id || ""}`.trim();
      };

      const firstPresent = (item, fields) => {
        for (const field of fields) {
          const value = item?.[field];
          if (value !== undefined && value !== null && value !== "") return value;
        }
        return "";
      };

      const quotationCustomerId = (quotation) =>
        extractId(quotation?.customerId) ||
        extractId(quotation?.customer) ||
        extractId(quotation?.customers);

      const quotationInternalCompanyId = (quotation) =>
        extractId(quotation?.internalCompanyId) ||
        extractId(quotation?.internalCompany);

      const quotationLawyerId = (quotation) =>
        extractId(quotation?.lawyerId) || extractId(quotation?.lawyer);

      const isPackagePricing = (record) =>
        String(record?.pricingMode || "").toLowerCase() === "package";

      const hasPackageMoney = (record) =>
        !!(
          record &&
          (parseNum(record.packageSubTotal) ||
            parseNum(record.packageTotalAmount) ||
            parseNum(record.packageVatAmount))
        );

      const isPackageSource = (record) =>
        isPackagePricing(record) || hasPackageMoney(record);

      // ---- package group sum (pure; tested by scripts/tests/package-group-totals.test.js) ----
      // Combo pricing on a Case/Quotation: every combo keeps its OWN amount,
      // stamped on each of its rows (packageSubTotal) — rows do not carry the
      // document total. The package total is the sum of each distinct group,
      // counted once: group = comboId, else comboName, else the row itself —
      // exactly CaseServices' servicePricingSummary, so a Contract made from a
      // Case shows the same total as the Case. VAT is on the summed subtotal
      // (rate from the lines, else fallbackVatRate). 2026-09-25: reading the
      // first package line gave a Case with combos A + B a contract total of
      // combo A only.
      const sumPackageGroups = (packageLines = [], fallbackVatRate = 0) => {
        const groups = new Map();
        (packageLines || []).forEach((line, index) => {
          const comboIdVal = extractId(line?.comboId) || extractId(line?._comboCatalogId);
          const comboName = String(line?.comboName || "").trim();
          const key = comboIdVal
            ? `id:${comboIdVal}`
            : comboName
              ? `name:${comboName}`
              : `row:${line?.id ?? line?.projectServiceId ?? index}`;
          if (!groups.has(key)) groups.set(key, parseNum(line?.packageSubTotal));
        });
        const subTotal = Array.from(groups.values()).reduce((sum, amount) => sum + amount, 0);
        const rateLine = (packageLines || []).find(
          (line) =>
            line?.packageVatRate !== undefined &&
            line?.packageVatRate !== null &&
            line?.packageVatRate !== "" &&
            (parseNum(line?.packageSubTotal) || parseNum(line?.packageTotalAmount)),
        );
        const vatRate = rateLine ? parseNum(rateLine.packageVatRate) : parseNum(fallbackVatRate);
        const vatAmount = Math.round((subTotal * vatRate) / 100);
        return { subTotal, vatRate, vatAmount, totalAmount: subTotal + vatAmount };
      };
      // ---- end package group sum ----

      const customerOverview = (customer) => {
        if (!customer) return "";
        return compact([
          firstPresent(customer, ["email", "customerEmail"]),
          firstPresent(customer, ["phone", "phoneNumber", "mobile"]),
          firstPresent(customer, ["companyName", "shortName"]),
          firstPresent(customer, ["taxCode"])
            ? tr("MST {0}", { 0: firstPresent(customer, ["taxCode"]) })
            : "",
        ])
          .slice(0, 2)
          .join(" · ");
      };

      const quotationOverview = (quotation, customers = [], currencies = []) => {
        const customerId = quotationCustomerId(quotation);
        const customer = customers.find(
          (item) => String(item.id) === String(customerId),
        );
        const customerName = customer
          ? labelOf(
              customer,
              ["customerName", "name", "fullName", "shortName"],
              tr("Customer"),
            )
          : firstPresent(quotation, ["customerName"]);
        const amount = formatMoneyByCurrency(
          firstPresent(quotation, ["totalAmount", "grandTotal"]),
          currencyFromRecord(quotation, currencies),
        );
        return compact([customerName, amount ? tr("Total {0}", { 0: amount }) : ""]).join(" · ");
      };

      const customerLabel = (customer) =>
        compact([
          firstPresent(customer, [
            "customerName",
            "contactName",
            "clientName",
            "fullName",
            "name",
            "companyName",
            "shortName",
            "displayName",
          ]),
          firstPresent(customer, [
            "customerCode",
            "contactCode",
            "clientCode",
            "code",
          ])
            ? `(${firstPresent(customer, ["customerCode", "contactCode", "clientCode", "code"])})`
            : "",
        ]).join(" ") || (customer?.id ? tr("Customer #{0}", { 0: customer.id }) : tr("Customer"));

      const relatedRecord = (value) => {
        if (Array.isArray(value)) {
          return value.find((item) => item && typeof item === "object") || null;
        }
        return value && typeof value === "object" ? value : null;
      };

      const relatedCustomerId = (record) =>
        extractId(record?.customerId) ||
        extractId(record?.customer) ||
        extractFirstId(record?.customers) ||
        extractId(record?.clientId) ||
        extractId(record?.client) ||
        extractFirstId(record?.clients);

      const relatedCustomerName = (record, customers = []) => {
        const direct =
          relatedRecord(record?.customers) ||
          relatedRecord(record?.customer) ||
          relatedRecord(record?.clients) ||
          relatedRecord(record?.client);
        if (direct) return customerLabel(direct);

        const embeddedName = firstPresent(record, [
          "customerName",
          "clientName",
          "contactName",
          "customerFullName",
          "customerCompanyName",
        ]);
        if (embeddedName) return embeddedName;

        const customerId = relatedCustomerId(record);
        const lookup = customers.find(
          (item) => String(extractId(item?.id)) === String(customerId),
        );
        return lookup ? customerLabel(lookup) : "";
      };

      const companyLabel = (company) =>
        compact([
          firstPresent(company, ["name", "companyName", "displayName"]),
          firstPresent(company, ["shortName"])
            ? `(${firstPresent(company, ["shortName"])})`
            : "",
        ]).join(" ") || (company?.id ? tr("Company #{0}", { 0: company.id }) : tr("Company"));

      const lawyerTypeLabel = (value) => {
        const raw = String(value || "").trim();
        if (!raw) return "";
        const key = raw
          .replace(/([a-z])([A-Z])/g, "$1_$2")
          .replace(/[\s-]+/g, "_")
          .toLowerCase();
        const labels = {
          lawyer: tr("Lawyer"),
          suppliant: tr("Legal assistant"),
          partner: tr("Partner"),
          managing_partner: tr("Managing partner"),
          senior_partner: tr("Senior partner"),
          associate: tr("Associate"),
          senior_associate: tr("Senior associate"),
          junior_associate: tr("Associate"),
          counsel: tr("Counsel"),
          of_counsel: tr("Of counsel"),
          consultant: tr("Consultant"),
          paralegal: tr("Paralegal"),
          legal_assistant: tr("Legal assistant"),
          trainee: tr("Trainee lawyer"),
          intern: tr("Intern"),
          collaborator: tr("Collaborator"),
          external: tr("External"),
        };
        return labels[key] || raw;
      };

      const lawyerLabel = (lawyer) => {
        const typeLabel = firstPresent(lawyer, ["lawyerType"])
          ? lawyerTypeLabel(firstPresent(lawyer, ["lawyerType"]))
          : "";
        return (
          compact([
            firstPresent(lawyer, [
              "lawyerName",
              "fullName",
              "nickname",
              "username",
              "name",
              "displayName",
            ]),
            // "Luật sư" (the generic/default lawyerType) omitted — it's
            // redundant for the vast majority of entries (most lawyers ARE
            // type "lawyer"), so it added noise without distinguishing
            // anything. Other, more specific roles (Partner, Paralegal, etc.)
            // still show their suffix, since that's real distinguishing
            // information for an Approver/Lawyer picker.
            typeLabel && typeLabel !== tr("Lawyer") ? `(${typeLabel})` : "",
          ]).join(" ") || (lawyer?.id ? tr("Lawyer #{0}", { 0: lawyer.id }) : tr("Lawyer"))
        );
      };

      const quotationLabel = (quotation) =>
        firstPresent(quotation, [
          "quotationNumber",
          "quotationCode",
          "code",
          "title",
          "name",
        ]) || (quotation?.id ? `Quotation #${quotation.id}` : tr("Quotation"));

      const caseLabel = (project) => {
        const code = firstPresent(project, ["caseCode", "code"]);
        const name = firstPresent(project, [
          "projectName",
          "caseName",
          "title",
          "name",
        ]);
        return (
          compact([code, name]).join(" - ") ||
          (project?.id ? tr("Case #{0}", { 0: project.id }) : tr("Case"))
        );
      };

      const contractLabel = (contract) => {
        const code = firstPresent(contract, [
          "contractCode",
          "contractNumber",
          "code",
        ]);
        const name = firstPresent(contract, ["contractName", "name", "title"]);
        return (
          compact([code, name]).join(" - ") ||
          (contract?.id ? tr("Contract #{0}", { 0: contract.id }) : tr("Contract"))
        );
      };

      const relationRecord = (value, id) => {
        if (Array.isArray(value)) {
          return (
            value.find((item) => String(extractId(item)) === String(id)) ||
            value[0] ||
            null
          );
        }
        return value && typeof value === "object" ? value : null;
      };

      const CONTRACTED_SERVICE_STATUSES = [
        "contracted",
        "contract_pending_signature",
        "active",
        "completed",
        "cancelled",
        "canceled",
      ];

      const numberOrNull = (value) => {
        const parsed = nullableNum(value);
        return parsed === null || parsed === undefined ? null : parsed;
      };

      const firstNumber = (...values) => {
        for (const value of values) {
          const parsed = numberOrNull(value);
          if (parsed !== null) return parsed;
        }
        return null;
      };

      const firstNonZeroNumber = (...values) => {
        for (const value of values) {
          const parsed = numberOrNull(value);
          if (parsed !== null && parsed !== 0) return parsed;
        }
        return 0;
      };

      const roundAmount = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? Math.round(n) : 0;
      };

      // ---- amount resolution helpers (pure; tested by scripts/tests/money-rounding.test.js) ----
      // 2026-09-30: the database stores a line's subTotal / vatAmount /
      // totalAmount in VND (money flow INV-1). This form works in the line's
      // own currency, so a source gives its *Native amounts; a line the
      // database priced (it has a rate date) without them is recomputed from
      // its price. Read as-is, 261,765 VND became 261,765 USD, converted again.
      const hasValue = (value) => value !== undefined && value !== null && value !== "";
      const lineCurrencySource = (item) => {
        if (!item) return item;
        if (hasValue(item.subTotalNative)) {
          return {
            ...item,
            subTotal: item.subTotalNative,
            vatAmount: item.vatAmountNative,
            totalAmount: item.totalAmountNative,
          };
        }
        if (hasValue(item.exchangeRateDate) && hasValue(item.basePrice)) {
          const { subTotal, vatAmount, totalAmount, ...inputs } = item;
          return inputs;
        }
        return item;
      };
      const resolveServiceAmounts = (...sources) => {
        const items = sources.filter(Boolean).map(lineCurrencySource);
        const values = (field) => items.map((item) => item?.[field]);
        const quantity = firstNonZeroNumber(...values("quantity"), 1) || 1;
        let vat = firstNumber(...values("vat")) ?? 0;
        let basePrice = firstNonZeroNumber(...values("basePrice"));
        // a price someone typed is an input: kept as is (10.50 USD stayed
        // 10.50 — rounding it to the unknown currency's 0 decimals sent 11 to
        // the database); only a price derived from totals is rounded
        const basePriceGiven = !!basePrice;
        let subTotal = firstNonZeroNumber(...values("subTotal"));
        const totalFromSource = firstNonZeroNumber(...values("totalAmount"));
        const vatAmountFromSource = firstNonZeroNumber(...values("vatAmount"));
        // 2026-09-29: a source may carry the line currency's decimalPlaces —
        // cents for USD / EUR / SGD, whole đồng for VND (the default). Rounding a
        // foreign line to whole units turned 10 USD + 8% VAT into 11 USD.
        const decimals = Math.max(0, Math.floor(firstNumber(...values("decimalPlaces")) ?? 0));
        const factor = 10 ** decimals;
        const roundLine = (value) => {
          if (!decimals) return roundAmount(value);
          const n = Number(value);
          if (!Number.isFinite(n)) return 0;
          return Math.round((n + Math.sign(n) * Number.EPSILON * Math.abs(n)) * factor) / factor;
        };

        if (!subTotal && totalFromSource && vatAmountFromSource) {
          subTotal = totalFromSource - vatAmountFromSource;
        }
        let subTotalFromTotal = false;
        if (!subTotal && totalFromSource && vat > -100) {
          subTotal = totalFromSource / (1 + vat / 100);
          subTotalFromTotal = true;
        }
        if (!subTotal && basePrice) {
          subTotal = basePrice * quantity;
        }
        if (!basePrice && subTotal) {
          basePrice = subTotal / quantity;
        }
        if ((!vat || vat === 0) && vatAmountFromSource && subTotal) {
          vat = Math.round((vatAmountFromSource * 10000) / subTotal) / 100;
        }

        const calculatedVatAmount = (subTotal * vat) / 100;
        const vatAmount = firstNonZeroNumber(
          vatAmountFromSource,
          calculatedVatAmount,
        );
        const totalAmount = firstNonZeroNumber(
          totalFromSource,
          subTotal + vatAmount,
          subTotal,
        );

        // Rounded parts must add up (subtotal + VAT = total): rounding each on
        // its own can leave the total a đồng off its parts. A source's own
        // total is kept; when the subtotal was derived from it, VAT is the rest.
        const roundedSubTotal = roundLine(subTotal);
        const roundedTotal = totalFromSource
          ? roundLine(totalAmount)
          : roundLine(roundedSubTotal + roundLine(vatAmount));
        const roundedVatAmount =
          subTotalFromTotal && !vatAmountFromSource
            ? roundLine(roundedTotal - roundedSubTotal)
            : roundLine(vatAmount);
        return {
          quantity,
          basePrice: basePriceGiven ? basePrice : roundLine(basePrice),
          vat,
          subTotal: roundedSubTotal,
          vatAmount: roundedVatAmount,
          totalAmount: roundedTotal,
        };
      };
      // A line's amounts in its own currency, rounded to that currency's
      // decimals (lines from the API carry no decimalPlaces: a USD line was
      // rounded to whole dollars, 10.80 -> 11). A priced line is resolved from
      // its inputs — its stored totals are VND, or an older price's; a line
      // without a price keeps its natives / stored totals.
      const lineAmountsInCurrency = (line, decimals) => {
        const source = line || {};
        const priced = hasValue(source.basePrice) && Number(source.basePrice) !== 0;
        const inputs = priced
          ? (({ subTotal, vatAmount, totalAmount, subTotalNative, vatAmountNative, totalAmountNative, basePriceVnd, ...rest }) => rest)(source)
          : source;
        return resolveServiceAmounts({ ...inputs, decimalPlaces: decimals });
      };

      const resolvePackageAmounts = (...sources) => {
        const items = sources.filter(Boolean);
        const values = (field) => items.map((item) => item?.[field]);
        const subTotal = firstNonZeroNumber(
          ...values("packageSubTotal"),
          ...values("subTotal"),
          ...values("fixedAmount"),
        );
        const explicitVatAmount = firstNonZeroNumber(
          ...values("packageVatAmount"),
          ...values("vatAmount"),
        );
        const explicitTotalAmount = firstNonZeroNumber(
          ...values("packageTotalAmount"),
          ...values("totalAmount"),
          ...values("grandTotal"),
          ...values("fixedAmount"),
        );
        const vatRate =
          firstNumber(...values("packageVatRate"), ...values("vatRate")) ??
          (subTotal && explicitVatAmount
            ? Math.round((explicitVatAmount * 10000) / subTotal) / 100
            : 0);
        const vatAmount =
          explicitVatAmount || roundAmount((subTotal * (vatRate || 0)) / 100);
        const totalAmount = explicitTotalAmount || roundAmount(subTotal) + roundAmount(vatAmount);
        return {
          subTotal: roundAmount(subTotal),
          vatRate: vatRate || 0,
          vatAmount: roundAmount(vatAmount),
          totalAmount: roundAmount(totalAmount),
        };
      };
      // ---- end amount resolution helpers ----

      const packagePricingPayload = (...sources) => {
        const amounts = resolvePackageAmounts(...sources);
        const currencyId = sources.map(getRecordCurrencyId).find(Boolean) || null;
        return {
          pricingMode: "package",
          billingMode: "packageIncluded",
          financialSourceType: "contract",
          quantity: 1,
          currencyId,
          basePrice: 0,
          vat: 0,
          subTotal: 0,
          vatAmount: 0,
          totalAmount: 0,
          packageSubTotal: amounts.subTotal,
          packageVatRate: amounts.vatRate,
          packageVatAmount: amounts.vatAmount,
          packageTotalAmount: amounts.totalAmount,
        };
      };

      const projectServicePricingPayload = (line) => {
        if (isPackagePricing(line)) {
          return packagePricingPayload(line);
        }
        const amounts = resolveServiceAmounts(line);
        return {
          pricingMode: "line",
          billingMode: "lineBillable",
          financialSourceType: "contract",
          quantity: amounts.quantity,
          currencyId: getRecordCurrencyId(line) || null,
          basePrice: amounts.basePrice,
          vat: amounts.vat,
          subTotal: amounts.subTotal,
          vatAmount: amounts.vatAmount,
          totalAmount: amounts.totalAmount,
          packageSubTotal: 0,
          packageVatRate: 0,
          packageVatAmount: 0,
          packageTotalAmount: 0,
        };
      };

      // ---- cross-document payload helpers (pure; tested by scripts/tests/cross-document-writes.test.js) ----
      // What a form sends to a service line (spec 2026-09-30 §6). The database
      // prices a line (trg_money_line_compute) and copies a service's content to
      // its linked lines (trg_money_thread_after): line totals are never sent, and
      // a follow-up write to a line the save already linked sends no content.
      const LINE_TOTAL_KEYS = ["subTotal", "vatAmount", "totalAmount"];
      const THREAD_CONTENT_KEYS = [
        "serviceId", "ServiceId", "services", "serviceName", "serviceType",
        "description", "comboId", "serviceCombo", "comboName",
      ];
      const withoutKeys = (payload, keys) => {
        const next = { ...(payload || {}) };
        keys.forEach((key) => delete next[key]);
        return next;
      };
      const isLinePricedPayload = (payload) =>
        String(payload?.pricingMode || "line").toLowerCase() === "line";
      // Own lines, a write that creates a link, or an edit made at its origin:
      // content stays (it must win); a priced line drops its totals.
      const lineWritePayload = (payload) =>
        isLinePricedPayload(payload) ? withoutKeys(payload, LINE_TOTAL_KEYS) : { ...(payload || {}) };
      // A line already linked by an earlier write of the same save: links, status
      // and pricing only (pricing is not copied across pricing modes).
      const linkedLineFollowUpPayload = (payload) =>
        withoutKeys(lineWritePayload(payload), THREAD_CONTENT_KEYS);
      // A request the database refused carries its reason in errors[0].message.
      const apiErrorText = (error, fallback) =>
        error?.response?.data?.errors?.[0]?.message || error?.message || fallback;
      // ---- end cross-document payload helpers ----

      const stripContractServicePayload = (payload = {}) => {
        const next = { ...payload };
        delete next.serviceId;
        delete next.services;
        delete next.serviceType;
        delete next.billingMode;
        delete next.financialSourceType;
        return next;
      };

      const stripProjectServiceSyncFields = (payload = {}) => {
        const next = { ...payload };
        delete next.contractId;
        delete next.contracts;
        delete next.contractServiceId;
        delete next.contractServices;
        delete next.quotationId;
        delete next.quotations;
        delete next.quotationServiceId;
        delete next.quotationServices;
        delete next.quantity;
        delete next.subTotal;
        delete next.vatAmount;
        delete next.totalAmount;
        return next;
      };

      const syncQuotationHeaderFromServices = async (quotationId) => {
        const safeQuotationId = extractId(quotationId);
        if (!safeQuotationId) return;

        try {
          const [qRes, linesRes] = await Promise.all([
            ctx.api.request({
              url: "quotations:get",
              params: {
                filterByTk: safeQuotationId,
              },
            }),
            ctx.api.request({
              url: "quotationServices:list",
              params: {
                filter: JSON.stringify({ quotationId: { $eq: safeQuotationId } }),
                pageSize: 1000,
              },
            }),
          ]);

          const quotation = qRes?.data?.data || qRes?.data || {};
          const lines = linesRes?.data?.data || [];
          const isPackage =
            isPackagePricing(quotation) ||
            lines.some(
              (line) => isPackagePricing(line) || parseNum(line.packageSubTotal),
            );
          if (!isPackage) return; // line pricing: trg_money_quotation_header
          const currencies = await fetchAllFromCandidates(
            CURRENCY_RESOURCE_CANDIDATES,
          );
          const targetCurrency = currencyFromRecord(
            quotation,
            currencies,
            findDefaultCurrency(currencies),
          );
          const pricingDate =
            quotation?.issuedDate ||
            quotation?.quotationDate ||
            quotation?.createdAt ||
            new Date().toISOString();
          const summaryRows = isPackage
            ? (() => {
                const packageLine =
                  lines.find(
                    (line) =>
                      isPackagePricing(line) || parseNum(line.packageSubTotal),
                  ) || quotation;
                const packageLines = lines.filter(
                  (line) => isPackagePricing(line) || parseNum(line.packageSubTotal),
                );
                // Every combo group counts (not only the first line's).
                const packageAmounts = packageLines.length
                  ? sumPackageGroups(packageLines, resolvePackageAmounts(quotation).vatRate)
                  : resolvePackageAmounts(packageLine, quotation);
                return [
                  packageHeaderRow(
                    packageLine,
                    packageAmounts,
                    getRecordCurrencyId(packageLine) || getRecordCurrencyId(quotation),
                  ),
                ];
              })()
            : lines;

          const preliminarySummary = buildContractFinancialSummary({
            rows: summaryRows,
            currencies,
            baseCurrency: targetCurrency,
            pricingDate,
          });
          const rateCurrencyIds = getConversionSourceCurrencyIds(
            preliminarySummary.groups,
            targetCurrency,
          );
          const exchangeRates = rateCurrencyIds.length
            ? await fetchExchangeRatesForConversion(
                rateCurrencyIds,
                extractCurrencyId(targetCurrency),
              )
            : [];
          const financialSummary = buildContractFinancialSummary({
            rows: summaryRows,
            currencies,
            baseCurrency: targetCurrency,
            exchangeRates,
            pricingDate,
          });

          if (!financialSummary.converted.canConvert) {
            console.warn(
              "[ContractCreateForm] Could not sync quotation header because exchange rate is missing:",
              formatMissingRatePairs(financialSummary.missing, targetCurrency),
            );
            return;
          }

          const { subTotal, vatAmount, totalAmount } = financialSummary.converted;

          await ctx.api.request({
            url: "quotations:update",
            method: "POST",
            params: { filterByTk: safeQuotationId },
            data: {
              pricingMode: isPackage ? "package" : "line",
              subTotal,
              vatAmount,
              totalAmount,
              currencyId: extractCurrencyId(targetCurrency) || null,
              customerId: extractId(quotation.customerId),
              internalCompanyId: extractId(quotation.internalCompanyId),
            },
          });
        } catch (e) {
          console.error("Error in syncQuotationHeaderFromServices:", e);
        }
      };

      const normalizeServiceLine = ({
        projectService,
        quotationService,
        quotation,
        contractService,
        project,
      }) => {
        const projectServiceId = extractId(projectService?.id);
        const quotationServiceIdForLine = extractId(quotationService?.id);
        // A Quotation with no linked Case has no projectServices row to anchor
        // to — such a line is still valid as long as it has its own
        // quotationService. projectServiceId then stays null throughout (used
        // downstream to skip the "sync back to projectServices" step, since
        // there's nothing to sync).
        if (!projectServiceId && !quotationServiceIdForLine) return null;
        const contractId = firstId(
          projectService?.contractId,
          projectService?.contracts,
          contractService?.contractId,
          contractService?.contracts,
        );
        const status = String(
          projectService?.status || contractService?.lineStatus || "",
        )
          .toLowerCase()
          .trim();
        const locked = !!contractId || CONTRACTED_SERVICE_STATUSES.includes(status);
        const amountSources = locked
          ? [contractService, projectService, quotationService]
          : [quotationService, projectService];
        const amounts = resolveServiceAmounts(...amountSources);
        const pricingSource =
          [
            contractService,
            projectService,
            quotationService,
            quotation,
            project,
          ].find(isPackageSource) ||
          [
            contractService,
            projectService,
            quotationService,
            quotation,
            project,
          ].find((item) => item?.pricingMode) ||
          null;
        const packageAmounts = isPackageSource(pricingSource)
          ? resolvePackageAmounts(
              pricingSource,
              quotation,
              contractService,
              quotationService,
              projectService,
              project,
            )
          : { subTotal: 0, vatRate: 0, vatAmount: 0, totalAmount: 0 };
        const projectServiceBasePrice = numberOrNull(projectService?.basePrice);
        const serviceId = firstId(
          locked ? contractService?.serviceId : null,
          locked ? contractService?.service : null,
          quotationService?.serviceId,
          quotationService?.service,
          projectService?.serviceId,
          projectService?.services,
          contractService?.serviceId,
          contractService?.service,
        );
        const serviceName =
          (locked ? contractService?.serviceName : "") ||
          quotationService?.serviceName ||
          projectService?.serviceName ||
          contractService?.serviceName ||
          projectService?.services?.serviceName ||
          projectService?.name ||
          (serviceId ? tr("Service #{0}", { 0: serviceId }) : tr("Service"));

        return {
          id: String(projectServiceId || `qsvc-${quotationServiceIdForLine}`),
          projectServiceId,
          quotationServiceId:
            extractId(quotationService?.id) ||
            firstId(
              contractService?.quotationServiceId,
              contractService?.quotationServices,
              projectService?.quotationServiceId,
              projectService?.quotationServices,
            ),
          quotationId: firstId(
            quotationService?.quotationId,
            quotationService?.quotations,
            contractService?.quotationId,
            contractService?.quotations,
            projectService?.quotationId,
            projectService?.quotations,
          ),
          quotationCode: quotation ? quotationLabel(quotation) : "",
          projectId: firstId(
            projectService?.projectId,
            projectService?.project,
            projectService?.projects,
            contractService?.projectId,
            contractService?.project,
            contractService?.projects,
          ),
          // Which combo section (if any) this line belonged to on its source
          // record — carried forward so a Contract created from a Case/Quotation
          // keeps the same combo grouping instead of every combo-tagged service
          // landing as an ungrouped individual line.
          comboId: firstId(
            contractService?.comboId,
            contractService?.serviceCombo,
            quotationService?.comboId,
            quotationService?.serviceCombo,
            projectService?.comboId,
            projectService?.serviceCombo,
          ),
          comboName:
            contractService?.comboName ||
            quotationService?.comboName ||
            projectService?.comboName ||
            null,
          serviceId,
          serviceName,
          description:
            (locked ? contractService?.description : "") ||
            quotationService?.description ||
            projectService?.description ||
            contractService?.description ||
            projectService?.services?.description ||
            "",
          quantity: amounts.quantity,
          currencyId:
            getRecordCurrencyId(contractService) ||
            getRecordCurrencyId(quotationService) ||
            getRecordCurrencyId(projectService) ||
            getRecordCurrencyId(quotation) ||
            getRecordCurrencyId(project) ||
            null,
          basePrice: projectServiceBasePrice ?? amounts.basePrice,
          vat: amounts.vat,
          subTotal: amounts.subTotal,
          vatAmount: amounts.vatAmount,
          totalAmount: amounts.totalAmount,
          pricingMode: isPackageSource(pricingSource) ? "package" : "line",
          packageSubTotal: packageAmounts.subTotal,
          packageVatRate: packageAmounts.vatRate,
          packageVatAmount: packageAmounts.vatAmount,
          packageTotalAmount: packageAmounts.totalAmount,
          status,
          contractId,
          contractServiceId: extractId(contractService?.id),
          locked,
        };
      };

      const sumServiceLines = (lines) =>
        lines.reduce(
          (sum, line) => ({
            subTotal: sum.subTotal + safeNumber(line?.subTotal),
            vatAmount: sum.vatAmount + safeNumber(line?.vatAmount),
            totalAmount: sum.totalAmount + safeNumber(line?.totalAmount),
          }),
          { subTotal: 0, vatAmount: 0, totalAmount: 0 },
        );

      // ---- service totals helpers (pure; tested by scripts/tests/service-totals.test.js) ----
      // resolveServiceAmounts() prefers a line's existing subTotal/vatAmount/
      // totalAmount over basePrice × quantity — right for a freshly loaded
      // Case/Quotation line, wrong right after the lawyer edits its price:
      // the old totals would win and the edit would never reach the footer or
      // the contract's Total amount. Strip them so a pricing edit recomputes.
      // (the stored *Native / VND amounts go too: they are the old price's)
      const pricingInputsOnly = (line) => {
        const {
          subTotal, vatAmount, totalAmount,
          subTotalNative, vatAmountNative, totalAmountNative, basePriceVnd,
          ...inputs
        } = line || {};
        return inputs;
      };

      // Line pricing: the contract header totals mirror the services table's
      // CONVERTED total (same figure as its footer, in the contract currency).
      // A raw sum across currencies (e.g. 3,000,000 VND + 10 USD = 3,000,010)
      // is meaningless. null = don't touch the form: package pricing (owns its
      // own totals), a missing exchange rate, or no service rows at all (a
      // hand-typed total, e.g. a Retainer with no itemized services, stays).
      const convertedTotalsPatch = (totals) => {
        if (!totals || totals.packageMode || !totals.canConvert || !totals.rowCount) return null;
        const subTotal = roundAmount(totals.subTotal);
        const vatAmount = roundAmount(totals.vatAmount);
        // Not rounded on its own — the header's parts must add up to it.
        const totalAmount = subTotal + vatAmount;
        return {
          subTotal: subTotal ? String(subTotal) : "",
          vatAmount: vatAmount ? String(vatAmount) : "",
          totalAmount: totalAmount ? String(totalAmount) : "",
          fixedAmount: totalAmount ? String(totalAmount) : "",
        };
      };

      // Two missing ids are not a match: String(null) === String(null) made a
      // no-Case Quotation's first service "the" selected one.
      const sameId = (a, b) =>
        a !== null && a !== undefined && a !== "" &&
        b !== null && b !== undefined && b !== "" &&
        String(a) === String(b);

      // Line pricing: the services table re-reports its converted total only
      // when it changes, so a later writer (mount prefill, quotation apply)
      // keeps the last reported total instead of a single line's / raw sum.
      const lineModeTotalsPatch = (lastConvertedTotals, fallback) =>
        convertedTotalsPatch(lastConvertedTotals) || fallback;
      // ---- end service totals helpers ----

      const serviceCatalogName = (service) =>
        firstPresent(service, ["serviceName", "name", "title", "displayName"]) ||
        (service?.id ? tr("Service #{0}", { 0: service.id }) : tr("Service"));

      const serviceCatalogDescription = (service) =>
        firstPresent(service, ["description", "serviceDescription", "scopeNote"]);

      const serviceCatalogPrice = (service) =>
        firstPresent(service, ["basePrice", "price", "unitPrice", "defaultPrice"]);

      const serviceCatalogCurrency = (service, currencies = [], fallback = null) =>
        currencyFromRecord(service, currencies, fallback);

      const serviceCatalogType = (service) =>
        firstPresent(service, ["serviceType", "type", "category"]);

      const serviceOptionServiceId = (item) =>
        firstId(item?.serviceId, item?.service, item?.services) ||
        extractId(item?.id);

      const serviceOptionCompanyId = (item) =>
        firstId(
          item?.internalCompanyId,
          item?.internalCompany,
          item?.companyId,
          item?.company,
        );

      const enrichCompanyServiceOptions = (
        companyServices = [],
        services = [],
        currencies = [],
      ) => {
        const serviceMap = {};
        services.forEach((service) => {
          const id = extractId(service?.id);
          if (id) serviceMap[String(id)] = service;
        });
        return companyServices.map((item) => {
          const serviceId = serviceOptionServiceId(item);
          const service =
            item.service || item.services || serviceMap[String(serviceId)] || null;
          const next = service && !item.service ? { ...item, service } : item;
          const currency =
            currencyFromRecordOptional(next, currencies, null) ||
            currencyFromRecordOptional(service, currencies, null);
          return {
            ...next,
            currency,
            currencyId:
              extractCurrencyId(currency) ||
              getRecordCurrencyId(next) ||
              getRecordCurrencyId(service),
          };
        });
      };

      // Shared by addRowFromService/onAddServiceToCombo/applyCombo/applyAdhocCombo
      // — matches a candidate service against every row already on the manual
      // services list, by serviceId first, else by case-insensitive trimmed name.
      const normalizeServiceDupKey = (value) => String(value || "").trim().toLowerCase();
      const findDuplicateServiceRow = (rows = [], { serviceId, serviceName } = {}) => {
        const svcId = serviceId ? String(serviceId) : null;
        const nameKey = normalizeServiceDupKey(serviceName);
        return (
          (rows || []).find((row) => {
            if (svcId && row.serviceId && String(row.serviceId) === svcId) return true;
            if (nameKey && normalizeServiceDupKey(row.serviceName) === nameKey) return true;
            return false;
          }) || null
        );
      };

      const newManualServiceRow = () => ({
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        serviceId: "",
        serviceName: "",
        serviceType: "",
        description: "",
        quantity: "1",
        currencyId: "",
        basePrice: "",
        vat: "8",
      });

      const newPaymentScheduleRow = (index = 1) => ({
        id: `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        installment: tr("Installment {0}", { 0: index }),
        content: "",
        percentage: "",
        paymentDate: "",
        amount: "",
        // No longer lawyer-editable (the "Trigger" column was removed —
        // 2026-09-21) — every installment now goes through the task-linking
        // flow (TaskDetailView.js/TaskManagement.js's installment Select),
        // matching the on_task_done semantics this whole session's work
        // assumes: a Payment Request is created 'pending' and only activates
        // once a lawyer links it to a task and marks that task Done. See
        // docs/superpowers/specs/2026-09-15-by-case-payment-request-automation-design.md
        // for what on_task_done vs. on_signed/on_case_done mean.
        triggerType: "on_task_done",
        // Local keys (lineKey(line) for a catalog service, row.id for a manual
        // one — see paymentScheduleServiceOptions) picked from the services
        // already selected above. Resolved to real contractServiceId values at
        // submit time, once those service rows actually exist in the DB (see
        // the contractServiceKeyMap built after the service-creation loops).
        // Empty = applies to no particular service — every task in the case
        // can pick this installment, same as before this field existed.
        serviceKeys: [],
      });

      // ---- payment-trigger helpers (pure; tested by scripts/tests/payment-trigger-helpers.test.js) ----
      // By Service "Payment Triggers" block — see
      // docs/superpowers/specs/2026-09-24-by-service-payment-trigger-config-design.md.
      // Kept dependency-free (own id normalizer) so the Node test can
      // extract and run this block in isolation.
      const triggerId = (value) => {
        const raw = value && typeof value === "object" ? value.id : value;
        return raw === null || raw === undefined || raw === "" ? null : String(raw);
      };

      // source "case": records are tasks, matched to a line by projectServiceId.
      // source "template": records are projectTemplates, matched by serviceId —
      // each line gets its own array even when 2 lines share a serviceId.
      const groupTriggerTasks = (source, lines, records) => {
        const isCase = source === "case";
        const toTask = (record) => ({
          id: triggerId(record.id),
          title: String((isCase ? record.title : record.templateName) || tr("Untitled task")),
          status: isCase ? String(record.status || "") : "",
          isPaymentTrigger: !!record.isPaymentTrigger,
          // Case tasks only: the installment Payment Request it's already
          // linked to (e.g. the main contract's) — By Case locks those.
          linkedPaymentRequestId: isCase
            ? triggerId(record.linkedPaymentRequestId ?? record.paymentRequestId)
            : null,
          _order: Number(isCase ? record.taskIndex : record.sortOrder) || 0,
        });
        const result = {};
        (lines || []).forEach((line) => {
          const matchId = isCase ? line.projectServiceId : line.serviceId;
          result[line.key] = matchId
            ? (records || [])
                .filter((record) =>
                  triggerId(isCase ? record.projectServiceId : record.serviceId) === String(matchId),
                )
                .map(toTask)
                .sort((a, b) => a._order - b._order)
                .map(({ _order, ...task }) => task)
            : [];
        });
        return result;
      };

      // Surviving lines keep the lawyer's ticks (minus ids no longer offered);
      // new lines — and lines in resetKeys (their matched service changed) —
      // start from each task's current isPaymentTrigger. Lines no longer
      // present are dropped. Pass prev = {} to reset everything.
      const mergeTriggerSelection = (prev, tasksByLine, resetKeys = new Set()) => {
        const next = {};
        Object.keys(tasksByLine || {}).forEach((key) => {
          const tasks = tasksByLine[key] || [];
          const offered = new Set(tasks.map((task) => task.id));
          next[key] = Array.isArray(prev?.[key]) && !resetKeys.has(key)
            ? prev[key].filter((id) => offered.has(id))
            : tasks.filter((task) => task.isPaymentTrigger).map((task) => task.id);
        });
        return next;
      };

      // Which record id each line matches on in the given source — used to
      // notice a line whose service changed under the same key (e.g. a
      // manual row re-picked from the catalog keeps its row.id).
      const triggerMatchMap = (source, lines) => {
        const map = {};
        (lines || []).forEach((line) => {
          map[line.key] = (source === "case" ? line.projectServiceId : line.serviceId) || null;
        });
        return map;
      };

      // Keys present in both maps whose matched id differs.
      const changedTriggerLineKeys = (prevMap, nextMap) =>
        new Set(
          Object.keys(nextMap || {}).filter(
            (key) => Object.prototype.hasOwnProperty.call(prevMap || {}, key) && prevMap[key] !== nextMap[key],
          ),
        );

      // Header line of the Payment Triggers block — follows the selected Case
      // directly, so it's right even while tasks load or after a failed load.
      const triggerSourceLabel = (projectId, caseName) =>
        projectId
          ? caseName
            ? tr("Tasks of case {0}", { 0: caseName })
            : tr("Tasks of this case")
          : tr("Sample tasks — applied when a Case is created from this contract");

      // Fetches the records the block groups: a Case's tasks, or the catalog
      // sample tasks of the lines' services. `cache` ({ fetchKey, records })
      // is reused when the fetch key is unchanged, so editing the services
      // list only re-groups instead of refetching (a Case's tasks don't
      // depend on which lines are selected; templates only on the service set).
      const loadTriggerRecords = async ({ source, projectId, lines, request, cache }) => {
        const serviceIds =
          source === "case"
            ? []
            : [...new Set((lines || []).map((line) => line.serviceId).filter(Boolean))]
                .map((id) => parseInt(id, 10))
                .sort((a, b) => a - b);
        const fetchKey = source === "case" ? `case:${projectId}` : `template:${serviceIds.join(",")}`;
        if (cache && cache.fetchKey === fetchKey) return { records: cache.records, cache };
        let records = [];
        if (source === "case") {
          const res = await request({
            url: "tasks:list",
            params: {
              pageSize: 1000,
              page: 1,
              filter: JSON.stringify({ projectId: { $eq: projectId } }),
              fields: [
                "id",
                "title",
                "status",
                "projectServiceId",
                "isPaymentTrigger",
                "taskIndex",
                "linkedPaymentRequestId",
              ],
            },
          });
          records = res?.data?.data || [];
        } else if (serviceIds.length) {
          const res = await request({
            url: "projectTemplates:list",
            params: {
              pageSize: 1000,
              page: 1,
              filter: JSON.stringify({ serviceId: { $in: serviceIds } }),
              fields: ["id", "serviceId", "templateName", "sortOrder", "isPaymentTrigger"],
            },
          });
          records = res?.data?.data || [];
        }
        return { records, cache: { fetchKey, records } };
      };

      // Case source only — tasks whose ticked state differs from their
      // loaded isPaymentTrigger.
      const diffTaskTriggers = (tasksByLine, selection) => {
        const changes = [];
        Object.keys(tasksByLine || {}).forEach((key) => {
          const ticked = new Set(selection?.[key] || []);
          (tasksByLine[key] || []).forEach((task) => {
            const next = ticked.has(task.id);
            if (next !== !!task.isPaymentTrigger) changes.push({ id: task.id, isPaymentTrigger: next });
          });
        });
        return changes;
      };

      // Names of services that offer tasks but have none ticked — those will
      // never auto-create a Payment Request. Lines with no tasks at all are
      // excluded (nothing the lawyer could have ticked).
      const linesWithoutTrigger = (lines, tasksByLine, selection) =>
        (lines || [])
          .filter((line) => (tasksByLine?.[line.key] || []).length && !(selection?.[line.key] || []).length)
          .map((line) => line.name);

      // Template source only — value for contractServices.paymentTriggerTemplateIds.
      // null = line has no template tasks (leave the field unset); [] = explicitly none.
      const triggerTemplateIdsFor = (tasksByLine, selection, key) =>
        (tasksByLine?.[key] || []).length ? [...(selection?.[key] || [])] : null;

      // Which task universe loaded trigger data belongs to: a Case's real
      // tasks, or catalog sample tasks when there's no Case yet.
      const triggerScopeKey = (projectId) =>
        `${projectId ? "case" : "template"}:${projectId || ""}`;

      // Submit may only use trigger data loaded for the CURRENT scope and not
      // mid-reload — otherwise ticks from a previously selected Case would be
      // written onto that other Case's tasks.
      const isTriggerDataCurrent = (loadedScope, currentScope, loading) =>
        !loading && !!loadedScope && loadedScope === currentScope;

      // A cancelled task can never reach Done, and the SQL requires EVERY
      // flagged task to be done — ticking one would block that service's
      // Payment Request forever. Unticking an already-flagged one stays allowed.
      const isTriggerSelectable = (task, ticked) =>
        ticked || String(task?.status || "") !== "cancelled";
      // ---- end payment-trigger helpers ----

      // ---- installment trigger helpers (pure; tested by scripts/tests/installment-triggers.test.js) ----
      // By Case (Multiple payments): which tasks trigger each installment —
      // see docs/superpowers/specs/2026-09-24-by-case-installment-trigger-tasks-design.md.
      // Reuses the By Service task data (tasksByLine, keyed by service line
      // key); an installment's tasks are those of the services it's tagged
      // with (row.serviceKeys, same line keys). A task can belong to one
      // installment only (single FK tasks.paymentRequestId).

      // One accordion item per Payment Schedule row.
      const installmentTriggerItems = (rows) =>
        (rows || []).map((row, index) => {
          const label = String(row?.installment || "").trim() || tr("Installment {0}", { 0: index + 1 });
          const percent = String(row?.percentage ?? "").trim();
          return {
            key: row.id,
            name: percent ? `${label} — ${percent}%` : label,
            serviceKeys: Array.isArray(row?.serviceKeys) ? row.serviceKeys : [],
          };
        });

      // 2026-09-29: By Case "One time" — its single payment is one item that
      // offers the tasks of every service; ticked tasks become its triggers
      // (the payment activates when ALL of them are Done, else when the Case is
      // Done — pgsql/by_case_payment_request_automation.sql).
      const ONE_TIME_TRIGGER_KEY = "one-time-payment";
      const oneTimeTriggerItem = (lines) => ({
        key: ONE_TIME_TRIGGER_KEY,
        name: "One-time payment — 100%",
        serviceKeys: (lines || []).map((line) => line.key),
      });

      // [{ lineKey, lineName, tasks }] for the installment's tagged services
      // that have tasks, in Services-table order.
      const installmentTaskGroups = (installment, lines, tasksByLine) => {
        const tagged = new Set((installment?.serviceKeys || []).map(String));
        return (lines || [])
          .filter((line) => tagged.has(String(line.key)) && (tasksByLine?.[line.key] || []).length)
          .map((line) => ({ lineKey: line.key, lineName: line.name, tasks: tasksByLine[line.key] }));
      };

      const installmentOfferedIds = (installment, lines, tasksByLine) =>
        new Set(
          installmentTaskGroups(installment, lines, tasksByLine).flatMap((group) =>
            group.tasks.map((task) => task.id),
          ),
        );

      // Keeps only current installments, task ids their current services still
      // offer, and each task in the FIRST installment that claimed it.
      const pruneInstallmentSelection = (selection, installments, lines, tasksByLine) => {
        const claimed = new Set();
        const next = {};
        (installments || []).forEach((installment) => {
          const offered = installmentOfferedIds(installment, lines, tasksByLine);
          next[installment.key] = (selection?.[installment.key] || []).filter((id) => {
            if (!offered.has(id) || claimed.has(id)) return false;
            claimed.add(id);
            return true;
          });
        });
        return next;
      };

      const sameInstallmentSelection = (a, b) => {
        const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
        return [...keys].every((key) => {
          const left = a?.[key];
          const right = b?.[key];
          if (!left || !right) return false;
          return left.length === right.length && left.every((id, index) => id === right[index]);
        });
      };

      // Toggle applied to the PRUNED selection, so ticks already dropped (a
      // service untagged, an installment removed) never come back later.
      const toggleInstallmentTick = (selection, installments, lines, tasksByLine, itemKey, taskId, checked) => {
        const base = pruneInstallmentSelection(selection, installments, lines, tasksByLine);
        const current = new Set(base[itemKey] || []);
        if (checked) current.add(taskId);
        else current.delete(taskId);
        return pruneInstallmentSelection({ ...base, [itemKey]: [...current] }, installments, lines, tasksByLine);
      };

      // taskId → installment key that has it ticked (for locking elsewhere).
      const installmentLinkOwner = (selection, installments) => {
        const owner = {};
        (installments || []).forEach((installment) => {
          (selection?.[installment.key] || []).forEach((id) => {
            if (!owner[id]) owner[id] = installment.key;
          });
        });
        return owner;
      };

      // Link not-done tasks before done ones: the installment activates when
      // ALL linked tasks are Done, and each link re-checks — linking a Done
      // task first would see a partial set that is "all done".
      const orderLinksOpenFirst = (taskIds, tasksById) => {
        const isDone = (id) => String(tasksById?.[id]?.status || "") === "done";
        return [...(taskIds || []).filter((id) => !isDone(id)), ...(taskIds || []).filter(isDone)];
      };

      // Names of installments that offer tasks but have none ticked.
      const installmentsWithoutTasks = (installments, lines, tasksByLine, selection) =>
        (installments || [])
          .filter(
            (installment) =>
              installmentOfferedIds(installment, lines, tasksByLine).size &&
              !(selection?.[installment.key] || []).length,
          )
          .map((installment) => installment.name);
      // ---- end installment trigger helpers ----

      // ---- package allocation helpers (pure; tested by scripts/tests/package-allocation.test.js) ----
      // By Service + Combo pricing: every service line is priced 0, so each
      // service's Payment Request amount is locked here (editable) — see
      // docs/superpowers/specs/2026-09-25-by-service-package-allocation-ui-design.md.

      // entries: [{ key, weight }] (weight = price reference, 0/blank = none).
      // Pro-rata by weight in whole units, remainder on the last weighted line
      // so the result sums to the pool; lines without a weight get 0. No
      // weights at all → equal split (remainder on the last line).
      const suggestPackageAllocation = (entries, pool) => {
        const list = entries || [];
        const total = Math.round(Number(pool) || 0);
        const out = {};
        list.forEach((entry) => {
          out[entry.key] = 0;
        });
        if (total <= 0 || !list.length) return out;
        const weightOf = (entry) => Math.max(Number(entry.weight) || 0, 0);
        const weighted = list.filter((entry) => weightOf(entry) > 0);
        const targets = weighted.length ? weighted : list;
        const weightSum = weighted.reduce((sum, entry) => sum + weightOf(entry), 0);
        let allocated = 0;
        targets.forEach((entry, index) => {
          const share =
            index === targets.length - 1
              ? total - allocated
              : weighted.length
                ? Math.round((total * weightOf(entry)) / weightSum)
                : Math.round(total / targets.length);
          out[entry.key] = share;
          allocated += share;
        });
        return out;
      };

      // Sum of the current lines' amounts vs the rounded pool — must match exactly.
      const allocationStatus = (amounts, keys, pool) => {
        const total = Math.round(Number(pool) || 0);
        const sum = (keys || []).reduce((acc, key) => acc + Math.round(Number(amounts?.[key]) || 0), 0);
        return { sum, pool: total, diff: sum - total, ok: (keys || []).length > 0 && sum === total };
      };

      // { key: "notInCase" | "noReference" | "small" }:
      //  - notInCase: the service isn't in the Case (a line added in this
      //    form while a Case exists has no projectService → no tasks), so its
      //    amount can never be billed automatically;
      //  - noReference: no price reference and still no amount entered;
      //  - small: under 0.5% of the pool (e.g. a 200đ catalog price → 202đ).
      const allocationWarnings = (entries, amounts, pool) => {
        const total = Number(pool) || 0;
        const warnings = {};
        (entries || []).forEach((entry) => {
          const amount = Number(amounts?.[entry.key]) || 0;
          if (entry.notInCase) warnings[entry.key] = "notInCase";
          else if (!(Number(entry.weight) > 0) && amount <= 0) warnings[entry.key] = "noReference";
          else if (amount <= 0) warnings[entry.key] = "zero";
          else if (total > 0 && amount < total * 0.005) warnings[entry.key] = "small";
        });
        return warnings;
      };

      // Amounts typed by hand (overrides: { key: string|number }, "" = 0) stay
      // as typed; the items NOT edited share what's left of the pool, pro-rata
      // by weight with the remainder on the last (suggestPackageAllocation).
      // Editing one item re-balances the others so the total still matches,
      // instead of leaving the allocation off by the difference (2026-09-25).
      // Typed amounts over the pool leave the others at 0 — the status shows it.
      const allocateWithOverrides = (entries, pool, overrides = {}) => {
        const list = entries || [];
        const isTyped = (entry) => overrides && overrides[entry.key] !== undefined;
        const out = {};
        let typedSum = 0;
        list.filter(isTyped).forEach((entry) => {
          const amount = Math.round(Number(overrides[entry.key]) || 0);
          out[entry.key] = amount;
          typedSum += amount;
        });
        const rest = list.filter((entry) => !isTyped(entry));
        const remaining = Math.max(Math.round(Number(pool) || 0) - typedSum, 0);
        Object.assign(out, suggestPackageAllocation(rest, remaining));
        return out;
      };
      // ---- end package allocation helpers ----

      // ---- combo billing helpers (pure; tested by scripts/tests/combo-billing.test.js) ----
      // By Service + Combo pricing (2026-09-25, user decision): each combo —
      // and each service outside any combo — is ONE billing item: one
      // Payment Request, created pending on submit (a contractPaymentSchedules
      // row), activated when ALL its ticked trigger tasks are Done.

      // Which billing item a service line belongs to: the applied combo
      // instance (combo added in this form), else its catalog combo id, else
      // its combo name (ad-hoc combos), else the line on its own.
      const comboGroupKeyOf = (line) => {
        // A row added into a combo section that came from the source
        // Case/Quotation carries getPersistedComboGroupKey's value — it
        // belongs to that persisted combo's item, not a new one.
        const instance = String(line?._comboInstanceId || "");
        if (instance.startsWith("persisted-id-")) return `combo:${instance.slice("persisted-id-".length)}`;
        if (instance.startsWith("persisted-name-")) return `comboname:${instance.slice("persisted-name-".length)}`;
        if (instance) return `inst:${instance}`;
        if (line?.comboId) return `combo:${line.comboId}`;
        if (line?.comboName) return `comboname:${line.comboName}`;
        return `svc:${line?.key}`;
      };

      // lines: [{ key, name, comboId?, comboName?, _comboInstanceId?,
      // _comboName?, weight (the line's own price reference), comboWeight
      // (the combo's own price, when known) }] → items [{ key, name,
      // serviceKeys, weight, isCombo }] in first-seen order. A combo's weight
      // is its own price, else the sum of its services' reference prices.
      const comboBillingItems = (lines) => {
        const items = [];
        const byKey = {};
        (lines || []).forEach((line) => {
          const key = comboGroupKeyOf(line);
          const isCombo = !key.startsWith("svc:");
          if (!byKey[key]) {
            byKey[key] = {
              key,
              name: isCombo ? line._comboName || line.comboName || "Combo" : line.name,
              serviceKeys: [],
              isCombo,
              _comboWeight: 0,
              _lineWeights: 0,
            };
            items.push(byKey[key]);
          }
          const item = byKey[key];
          item.serviceKeys.push(line.key);
          item._lineWeights += Math.max(Number(line.weight) || 0, 0);
          if (!item._comboWeight && Number(line.comboWeight) > 0) item._comboWeight = Number(line.comboWeight);
        });
        return items.map(({ _comboWeight, _lineWeights, ...item }) => ({
          ...item,
          weight: item.isCombo && _comboWeight > 0 ? _comboWeight : _lineWeights,
        }));
      };
      // ---- end combo billing helpers ----

      // ---- combo merge helpers (pure; tested by scripts/tests/combo-merge.test.js) ----
      // Line/Combo pricing sync (2026-09-25, user rule): when a combo is added
      // while standalone services exist (picked in Line pricing, or added with
      // "New service" before any combo), they are merged INTO that combo —
      // Combo pricing never shows loose lines next to combos. Each merged row
      // is tagged with the combo, priced by it (its own price kept as
      // _comboItemSnapshot for reference) and flagged _mergedIntoCombo; its
      // value (contributionOf) is added to the combo's own amount.
      const mergeStandaloneIntoCombo = (rows, combo, contributionOf) => {
        const merged = [];
        let contribution = 0;
        const next = (rows || []).map((row) => {
          if (row?._comboInstanceId) return row;
          const value = Math.max(Number(contributionOf(row)) || 0, 0);
          contribution += value;
          const mergedRow = {
            ...row,
            basePrice: "",
            vat: "0",
            _packageBasePrice: 0,
            _comboInstanceId: combo.instanceId,
            _comboCatalogId: combo.catalogId ?? null,
            _comboName: combo.name || "",
            _mergedIntoCombo: true,
            _comboItemSnapshot: row._comboItemSnapshot || { price: value, vat: 0 },
          };
          merged.push(mergedRow);
          return mergedRow;
        });
        return { rows: next, merged, contribution };
      };
      // ---- end combo merge helpers ----


      // Multi-select of which already-selected contract service(s) this
      // installment belongs to (options come from paymentScheduleServiceOptions
      // — catalog lines keyed by lineKey(line), manual rows keyed by row.id).
      // Written as contractPaymentScheduleServices rows (a junction collection,
      // not a JSON field — see §6h) after resolving these local keys to real
      // contractServiceId (contractServiceKeyMap, in the submit handler) and
      // the schedule row's own id. Copied onto the created paymentRequests
      // row's own paymentRequestServices by by_case_schedule_row_creates_
      // payment_request(), so TaskDetailView.js/TaskManagement.js can narrow
      // the installment Select to the task's own service.
      // REQUIRED (2026-09-21, §6m) — the earlier "left empty = visible to
      // every task" fallback was removed: an installment with no service
      // tagged would otherwise never match any task's filter and become
      // permanently unpickable, so every installment must now name at least
      // one service. Enforced in validate() at submit time (see
      // "every payment installment needs at least one service" below).
      const PaymentScheduleServiceSelect = ({ value, onChange, options }) =>
        AntSelect
          ? React.createElement(AntSelect, {
              mode: "multiple",
              value: Array.isArray(value) ? value : [],
              placeholder: tr("Select service(s)"),
              allowClear: true,
              showSearch: true,
              optionFilterProp: "label",
              // No maxTagCount — the column was widened specifically so a
              // multi-tagged installment's services are readable at a glance
              // instead of collapsing to "+N" (helps disambiguate which
              // installment a task should link to, when 2+ installments share
              // a tagged service).
              onChange: (next) => onChange(next || []),
              style: { width: "100%" },
              options: (options || []).map((option) => ({
                value: option.value,
                label: option.label,
              })),
            })
          : React.createElement(
              "select",
              {
                multiple: true,
                value: Array.isArray(value) ? value : [],
                onChange: (e) =>
                  onChange(
                    Array.from(e.target.selectedOptions).map((o) => o.value),
                  ),
                style: inputStyle,
              },
              (options || []).map((option) =>
                React.createElement(
                  "option",
                  { key: option.value, value: option.value },
                  option.label,
                ),
              ),
            );

      const calcInstallmentAmount = (percentage, baseAmount) => {
        const percent = parseNum(percentage);
        const base = parseNum(baseAmount);
        if (percent <= 0 || base <= 0) return 0;
        return roundAmount((base * percent) / 100);
      };

      const paymentScheduleRowAmount = (row, baseAmount) =>
        calcInstallmentAmount(row?.percentage, baseAmount) || parseNum(row?.amount);

      // ---- installment allocation helpers (pure; tested by scripts/tests/money-rounding.test.js) ----
      // Splits a total over weights so the parts add up exactly (largest
      // remainder): floor each part to the unit, then the units left over go
      // to the parts with the largest fractions, ties to the earlier part.
      // Same as money_split() in pgsql/money_flow_foundation.sql — shared
      // cases in scripts/tests/fixtures/money-cases.json.
      const splitLargestRemainder = (total, weights, decimals = 0) => {
        const list = Array.isArray(weights) ? weights : [];
        if (!list.length) return [];
        const scale = 10 ** Math.max(0, decimals);
        let units = Math.round((Number(total) || 0) * scale);
        const sign = units < 0 ? -1 : 1;
        units = Math.abs(units);
        const w = list.map((x) => Math.max(Number(x) || 0, 0));
        const wsum = w.reduce((s, x) => s + x, 0);
        const raw = w.map((x) => (wsum > 0 ? (units * x) / wsum : units / list.length));
        const out = raw.map((x) => Math.floor(x + 1e-9));
        let left = units - out.reduce((s, x) => s + x, 0);
        const order = raw
          .map((x, i) => ({ i, f: x - out[i] }))
          .sort((a, b) => b.f - a.f || a.i - b.i);
        for (let k = 0; k < order.length && left > 0; k += 1, left -= 1) out[order[k].i] += 1;
        return out.map((x) => (sign * x) / scale);
      };
      // Installments from percentages: when they add up to 100% they are the
      // total split by largest remainder — the table shows exactly what the
      // database stores (money_refresh_schedule), and it always adds up.
      const allocateInstallmentAmounts = (rows, baseAmount) => {
        const list = rows || [];
        const amounts = list.map((row) => paymentScheduleRowAmount(row, baseAmount));
        const base = roundAmount(baseAmount);
        const percentSum = list.reduce((sum, row) => sum + parseNum(row?.percentage), 0);
        const pctIndexes = list
          .map((row, index) => (parseNum(row?.percentage) > 0 ? index : -1))
          .filter((index) => index >= 0);
        if (pctIndexes.length > 1 && base > 0 && Math.abs(percentSum - 100) <= 0.01) {
          const split = splitLargestRemainder(base, pctIndexes.map((index) => parseNum(list[index].percentage)), 0);
          pctIndexes.forEach((index, k) => {
            amounts[index] = split[k];
          });
        }
        return amounts;
      };
      // ---- end installment allocation helpers ----

      const cleanPaymentScheduleRows = (rows = [], baseAmount = 0) => {
        const cleaned = rows
          .map((row, index) => {
            const id = String(row?.id || `pay-${index + 1}`).trim();
            const defaultInstallment = tr("Installment {0}", { 0: index + 1 });
            const installment = String(row?.installment || "").trim();
            const content = String(row?.content || "").trim();
            const percentage = String(row?.percentage ?? "").trim();
            const paymentDate = String(row?.paymentDate || row?.timing || "").trim();
            const amount = paymentScheduleRowAmount(row, baseAmount);
            const hasCustomInstallment =
              !!installment && installment !== defaultInstallment;
            return {
              id,
              installmentNo: index + 1,
              installment: installment || defaultInstallment,
              content,
              percentage,
              paymentDate,
              amount,
              // No longer lawyer-editable — every installment goes through the
              // task-linking flow (see newPaymentScheduleRow's own comment).
              triggerType: row?.triggerType || "on_task_done",
              serviceKeys: Array.isArray(row?.serviceKeys) ? row.serviceKeys : [],
              hasData: !!(
                hasCustomInstallment ||
                content ||
                percentage ||
                paymentDate ||
                amount > 0
              ),
            };
          })
          .filter((row) => row.hasData)
          .map(({ hasData, ...row }) => row);

        // Same allocation as the table shows (remainder on the last
        // installment, only when the percentages add up to 100%).
        const allocated = allocateInstallmentAmounts(cleaned, baseAmount);
        return cleaned.map((row, index) => ({ ...row, amount: allocated[index] }));
      };

      const buildPaymentSchedulePayload = ({ form, isRetainer, currency = null }) => {
        const baseAmount = parseNum(form?.totalAmount);
        const cleanRows = cleanPaymentScheduleRows(form?.paymentSchedule, baseAmount);
        const totalAmount =
          baseAmount || cleanRows.reduce((sum, row) => sum + row.amount, 0);
        const enabledRetainerRule = !!isRetainer;
        const firstPaymentDate = enabledRetainerRule
          ? form.paymentDate || null
          : cleanRows[0]?.paymentDate || null;
        const hasScheduleData =
          cleanRows.length ||
          enabledRetainerRule ||
          form.billingCycle === "multiple_payments" ||
          firstPaymentDate;

        if (!hasScheduleData) {
          return null;
        }

        // Retainer schedule state (unit/duration/cycles-billed/next billing
        // date) is no longer built here — it lives on the nested billingPlans
        // record instead (see the contracts:create submit payload), which is
        // the single source of truth the retainer-billing automation reads
        // and writes directly. Building a parallel retainerRule snapshot here
        // was the root cause of this UI showing stale data next to the live
        // automation state.
        return {
          version: 1,
          mode: enabledRetainerRule
            ? "recurring"
            : form.billingCycle === "multiple_payments"
              ? "multiple_payments"
              : form.billingCycle || "one_time",
          currencyId:
            getRecordCurrencyId(form) || extractCurrencyId(currency) || null,
          currency:
            getRecordCurrencyCode(form) ||
            getCurrencyCode(currency || defaultCurrencyObject()),
          baseAmount,
          firstPaymentDate,
          totalAmount: totalAmount || nullableNum(form.totalAmount),
          installments: cleanRows.map((row, index) => {
            const cumulativeTotal = cleanRows
              .slice(0, index + 1)
              .reduce((sum, item) => sum + item.amount, 0);
            return {
              id: row.id,
              installmentNo: row.installmentNo,
              sortOrder: index + 1,
              label: row.installment,
              installmentLabel: row.installment,
              content: row.content,
              triggerType: row.triggerType || "on_task_done",
              serviceKeys: row.serviceKeys || [],
              timingType: row.paymentDate ? "fixed_date" : "",
              dueDate: toIsoDateTime(row.paymentDate),
              paymentDate: row.paymentDate,
              timingNote: "",
              percentage: row.percentage ? parseNum(row.percentage) : null,
              amount: row.amount,
              cumulativeTotal,
              status: "planned",
            };
          }),
        };
      };

      // decimals: the line currency's decimalPlaces (0 = VND); see resolveServiceAmounts
      const manualServiceLineAmounts = (row, packageMode = false, decimals = 0) =>
        packageMode
          ? {
              quantity: 1,
              basePrice: 0,
              vat: 0,
              subTotal: 0,
              vatAmount: 0,
              totalAmount: 0,
            }
          : resolveServiceAmounts({
              quantity: firstNonZeroNumber(row?.quantity, 1) || 1,
              basePrice: row?.basePrice,
              vat: row?.vat,
              decimalPlaces: decimals,
            });

      const manualServiceRowsTotals = (rows = [], decimalsOf = () => 0) =>
        rows.reduce(
          (sum, row) => {
            const amounts = manualServiceLineAmounts(row, false, decimalsOf(row));
            return {
              subTotal: sum.subTotal + amounts.subTotal,
              vatAmount: sum.vatAmount + amounts.vatAmount,
              totalAmount: sum.totalAmount + amounts.totalAmount,
            };
          },
          { subTotal: 0, vatAmount: 0, totalAmount: 0 },
        );

      const fetchQuotationDetail = async (quotationId) => {
        if (!quotationId) return null;
        try {
          const res = await ctx.api.request({
            url: "quotations:get",
            params: { filterByTk: quotationId },
          });
          return unwrapRecord(res);
        } catch (error) {
          console.warn(
            "[ContractCreateForm] Could not fetch quotation detail",
            error,
          );
          return null;
        }
      };

      const unwrapRecord = (res) => {
        const payload = res?.data?.data ?? res?.data ?? res;
        if (Array.isArray(payload)) return payload[0] || null;
        if (Array.isArray(payload?.data)) return payload.data[0] || null;
        if (payload?.data && typeof payload.data === "object") return payload.data;
        return payload || null;
      };

      const fetchRecord = async (url, id, params = {}, options = {}) => {
        if (!id) return null;
        try {
          const res = await ctx.api.request({
            url,
            params: { filterByTk: id, ...params },
          });
          const record = unwrapRecord(res);
          if (record) return record;

          const collection = String(url || "").split(":")[0];
          if (!collection) return null;
          const listRes = await ctx.api.request({
            url: `${collection}:list`,
            params: {
              filter: JSON.stringify({ id: { $eq: id } }),
              pageSize: 1,
              ...params,
            },
          });
          return unwrapRecord(listRes);
        } catch (error) {
          if (!options.quiet) {
            console.warn(`[ContractCreateForm] Could not fetch ${url} #${id}`, error);
          }
          return null;
        }
      };

      const fetchAnyRecord = async (urls, id) => {
        for (const url of urls) {
          const record = await fetchRecord(url, id);
          if (record) return record;
        }
        return null;
      };

      const createdAtTime = (item) => {
        const time = new Date(item?.createdAt || 0).getTime();
        return Number.isNaN(time) ? 0 : time;
      };

      const newestFirst = (items) =>
        [...items].sort((a, b) => createdAtTime(b) - createdAtTime(a));

      const toDateInput = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      };

      // Read-only date PREVIEWS (e.g. "Next payment") show the VN convention
      // DD/MM/YYYY, synchronized with how every other date-like display in
      // this app already formats (2026-09-22) — every `<input type="date">`
      // still stores/reads plain ISO "YYYY-MM-DD" underneath, unaffected; this
      // only reformats a value at the moment it's shown as plain text.
      const formatDateDisplay = (isoDate) => {
        if (!isoDate) return "";
        const [yyyy, mm, dd] = String(isoDate).split("-");
        return yyyy && mm && dd ? `${dd}/${mm}/${yyyy}` : String(isoDate);
      };

      const addMonthsClamped = (dateValue, monthCount) => {
        if (!dateValue || !monthCount) return "";
        const source = new Date(`${dateValue}T00:00:00`);
        if (Number.isNaN(source.getTime())) return "";

        const y = source.getFullYear();
        const m = source.getMonth();
        const d = source.getDate();
        const targetFirst = new Date(y, m + monthCount, 1);
        const lastDay = new Date(
          targetFirst.getFullYear(),
          targetFirst.getMonth() + 1,
          0,
        ).getDate();
        targetFirst.setDate(Math.min(d, lastDay));
        return toDateInput(targetFirst);
      };

      const calcRetainerNextPaymentDate = (
        paymentDate,
        retainerDuration,
        repeatUnit,
      ) => {
        const duration = parseNum(retainerDuration);
        if (!paymentDate || duration <= 0) return "";
        if (repeatUnit === "day") return addDays(paymentDate, duration);
        if (repeatUnit === "week") return addDays(paymentDate, duration * 7);
        if (repeatUnit === "month") return addMonthsClamped(paymentDate, duration);
        if (repeatUnit === "year")
          return addMonthsClamped(paymentDate, duration * 12);
        return "";
      };

      const calcRetainerEndDate = (paymentDate, retainerDuration, repeatUnit) =>
        calcRetainerNextPaymentDate(paymentDate, retainerDuration, repeatUnit);

      const addDays = (dateValue, days) => {
        if (!dateValue && days !== 0) return "";
        const source = new Date(`${dateValue}T00:00:00`);
        if (Number.isNaN(source.getTime())) return "";
        source.setDate(source.getDate() + days);
        return toDateInput(source);
      };

      const calcPaymentTermEndDate = (form) => {
        if (form.contractType === "retainer") {
          return calcRetainerEndDate(
            form.paymentDate,
            form.retainerDuration,
            form.retainerRepeatUnit,
          );
        }

        return "";
      };

      const DATE_DRIVER_FIELDS = [
        "contractType",
        "billingCycle",
        "paymentDate",
        "signedDate",
        "retainerDuration",
        "retainerRepeatInterval",
        "retainerRepeatUnit",
      ];

      const deriveForm = (prev, patch) => {
        const next = { ...prev, ...patch };
        const patchKeys = Object.keys(patch);

        if (patchKeys.some((key) => DATE_DRIVER_FIELDS.includes(key))) {
          const calculatedEndDate = calcPaymentTermEndDate(next);
          if (calculatedEndDate) next.endDate = calculatedEndDate;
        }

        return next;
      };

      const retainerDurationSuffix = (retainerPeriod, durationValue) => {
        const singular = parseNum(durationValue) === 1;
        if (retainerPeriod === "day") return singular ? "day" : "days";
        if (retainerPeriod === "week") return singular ? "week" : "weeks";
        if (retainerPeriod === "month") return singular ? "month" : "months";
        if (retainerPeriod === "quarter") return singular ? "quarter" : "quarters";
        if (retainerPeriod === "year") return singular ? "year" : "years";
        if (retainerPeriod === "monthly") return singular ? "month" : "months";
        if (retainerPeriod === "quarterly") return singular ? "quarter" : "quarters";
        if (retainerPeriod === "yearly") return singular ? "year" : "years";
        return singular ? "cycle" : "cycles";
      };

      const getViewInputArgs = () => ctx.view?.inputArgs || {};

      const getUrlFilterByTk = () => {
        try {
          const match = window.location.pathname.match(/\/filterbytk\/([^/?#]+)/i);
          return match ? decodeURIComponent(match[1]) : null;
        } catch {
          return null;
        }
      };

      const getUrlPathname = () => {
        try {
          return String(window.location.pathname || "");
        } catch {
          return "";
        }
      };

      const recordHasProp = (record, key) =>
        !!record &&
        typeof record === "object" &&
        Object.prototype.hasOwnProperty.call(record, key);

      const recordHasAnyProp = (record, keys) =>
        keys.some((key) => recordHasProp(record, key));

      const isQuotationCollection = (name) => {
        const value = String(name || "").toLowerCase();
        return value.includes("quotation") || value.includes("quote");
      };

      const looksLikeQuotationRecord = (record = {}, collectionName = "") => {
        if (!record || typeof record !== "object") return false;
        const name =
          collectionName ||
          record.collectionName ||
          record.__collectionName ||
          record.collection?.name ||
          "";
        if (isQuotationCollection(name)) return true;
        if (
          recordHasAnyProp(record, [
            "contractCode",
            "contractName",
            "contractType",
            "caseCode",
            "caseName",
            "projectName",
            "projectManagerId",
            "projectStatus",
            "leadType",
            "customerType",
          ]) ||
          Array.isArray(record.assignees)
        ) {
          return false;
        }
        return (
          recordHasAnyProp(record, [
            "quotationNumber",
            "quotationCode",
            "quoteNumber",
            "quoteCode",
            "quotationName",
          ]) ||
          (recordHasProp(record, "pricingMode") &&
            recordHasAnyProp(record, [
              "subTotal",
              "totalAmount",
              "grandTotal",
              "packageSubTotal",
            ]))
        );
      };

      const getRuntimeContextRecords = (
        inputArgs = getViewInputArgs(),
        params = inputArgs.params || {},
      ) =>
        [
          ctx.record,
          ctx.popup?.record,
          ctx.view?.record,
          ctx.modal?.record,
          inputArgs.record,
          inputArgs.sourceRecord,
          inputArgs.parentItem,
          inputArgs.currentRecord,
          params.record,
          params.sourceRecord,
          params.parentItem,
          params.currentRecord,
        ]
          .map((record) => unwrapContextRecord(record))
          .filter((record) => record && typeof record === "object");

      const unwrapContextRecord = (record) => {
        if (!record || typeof record !== "object") return record;
        const data = record.data;
        if (!data || typeof data !== "object" || Array.isArray(data)) return record;

        const keys = Object.keys(record);
        const wrapperLike =
          keys.length <= 4 &&
          keys.every((key) => ["data", "meta", "status", "success"].includes(key));
        return wrapperLike || !extractId(record.id)
          ? unwrapContextRecord(data)
          : record;
      };

      const inferQuotationIdFromRecords = (records = [], collectionName = "") => {
        for (const record of records) {
          if (looksLikeQuotationRecord(record, collectionName)) {
            const id =
              extractId(record.id) ||
              extractId(record.quotationId) ||
              extractFirstId(record.quotations);
            if (id) return id;
          }
        }
        return null;
      };

      const getPopupParams = () => {
        const inputArgs = getViewInputArgs();
        const params = inputArgs.params || {};
        const sourceCollectionName =
          inputArgs.sourceCollectionName ||
          params.sourceCollectionName ||
          ctx.action?.params?.sourceCollectionName ||
          ctx.modal?.params?.sourceCollectionName ||
          ctx.view?.params?.sourceCollectionName ||
          ctx.popup?.params?.sourceCollectionName ||
          ctx.params?.sourceCollectionName;
        const sourceRecordId =
          inputArgs.sourceRecordId ||
          params.sourceRecordId ||
          inputArgs.sourceId ||
          params.sourceId ||
          ctx.action?.params?.sourceRecordId ||
          ctx.modal?.params?.sourceRecordId ||
          ctx.view?.params?.sourceRecordId ||
          ctx.popup?.params?.sourceRecordId ||
          ctx.params?.sourceRecordId;
        const runtimeRecords = getRuntimeContextRecords(inputArgs, params);
        const runtimeCollectionName =
          inputArgs.collectionName ||
          params.collectionName ||
          ctx.collection?.name ||
          "";
        const runtimeQuotationId = inferQuotationIdFromRecords(
          runtimeRecords,
          runtimeCollectionName,
        );
        const sourceQuotationId =
          inputArgs.sourceQuotationId ||
          params.sourceQuotationId ||
          ctx.action?.params?.sourceQuotationId ||
          ctx.modal?.params?.sourceQuotationId ||
          ctx.view?.params?.sourceQuotationId ||
          ctx.popup?.params?.sourceQuotationId ||
          ctx.params?.sourceQuotationId ||
          (isQuotationCollection(sourceCollectionName) ? sourceRecordId : null) ||
          runtimeQuotationId;
        const sourceName = String(sourceCollectionName || "").toLowerCase();
        const sourceCustomerId =
          inputArgs.sourceCustomerId ||
          params.sourceCustomerId ||
          ctx.action?.params?.sourceCustomerId ||
          ctx.modal?.params?.sourceCustomerId ||
          ctx.view?.params?.sourceCustomerId ||
          ctx.popup?.params?.sourceCustomerId ||
          ctx.params?.sourceCustomerId ||
          (sourceName.includes("customer") || sourceName.includes("contact")
            ? sourceRecordId
            : null);
        const sourceProjectId =
          inputArgs.sourceProjectId ||
          params.sourceProjectId ||
          inputArgs.sourceCaseId ||
          params.sourceCaseId ||
          ctx.action?.params?.sourceProjectId ||
          ctx.action?.params?.sourceCaseId ||
          ctx.modal?.params?.sourceProjectId ||
          ctx.modal?.params?.sourceCaseId ||
          ctx.view?.params?.sourceProjectId ||
          ctx.view?.params?.sourceCaseId ||
          ctx.popup?.params?.sourceProjectId ||
          ctx.popup?.params?.sourceCaseId ||
          ctx.params?.sourceProjectId ||
          ctx.params?.sourceCaseId ||
          (sourceName.includes("project") || sourceName.includes("case")
            ? sourceRecordId
            : null);
        return {
          ...(inputArgs || {}),
          ...(params || {}),
          ...(ctx.action?.params || {}),
          ...(ctx.modal?.params || {}),
          ...(ctx.view?.params || {}),
          ...(ctx.popup?.params || {}),
          ...(ctx.params || {}),
          customerId:
            ctx.view?.customerId ||
            inputArgs?.customerId ||
            inputArgs?.params?.customerId ||
            sourceCustomerId ||
            ctx.popup?.params?.customerId ||
            ctx.params?.customerId,
          internalCompanyId:
            ctx.view?.internalCompanyId ||
            inputArgs?.internalCompanyId ||
            inputArgs?.params?.internalCompanyId ||
            ctx.popup?.params?.internalCompanyId ||
            ctx.params?.internalCompanyId,
          lawyerId:
            ctx.view?.lawyerId ||
            inputArgs?.lawyerId ||
            inputArgs?.params?.lawyerId ||
            ctx.popup?.params?.lawyerId ||
            ctx.params?.lawyerId,
          quotationId:
            ctx.view?.quotationId ||
            inputArgs?.quotationId ||
            inputArgs?.params?.quotationId ||
            sourceQuotationId ||
            ctx.popup?.params?.quotationId ||
            ctx.params?.quotationId,
          sourceQuotationId,
          sourceCustomerId,
          sourceProjectId,
          sourceCollectionName,
          sourceRecordId,
          projectId:
            ctx.view?.projectId ||
            inputArgs?.projectId ||
            inputArgs?.params?.projectId ||
            sourceProjectId ||
            ctx.popup?.params?.projectId ||
            ctx.params?.projectId,
          caseId:
            ctx.view?.caseId ||
            inputArgs?.caseId ||
            inputArgs?.params?.caseId ||
            sourceProjectId ||
            ctx.popup?.params?.caseId ||
            ctx.params?.caseId,
        };
      };

      const safeJsonStringify = (obj) => {
        try {
          if (obj === null || typeof obj !== "object") return String(obj);
          const clean = {};
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              const val = obj[key];
              if (
                val === null ||
                typeof val === "string" ||
                typeof val === "number" ||
                typeof val === "boolean"
              ) {
                clean[key] = val;
              } else if (typeof val === "object") {
                if (Array.isArray(val)) {
                  clean[key] = `Array(${val.length})`;
                } else {
                  clean[key] = `Object(${Object.keys(val).join(", ")})`;
                }
              }
            }
          }
          return JSON.stringify(clean);
        } catch (e) {
          return "[Serialization Error: " + e.message + "]";
        }
      };

      const debugContractContext = (step, payload) => {
        console.log(
          `[ContractCreateForm][context:${step}]`,
          safeJsonStringify(payload),
        );
      };

      const firstId = (...values) => {
        for (const value of values) {
          const id = Array.isArray(value) ? extractFirstId(value) : extractId(value);
          if (id) return id;
        }
        return null;
      };

      const getConfiguredProjectRecord = () => PROJECT_RECORD_CONFIG.record || {};

      const hasOwn = (record, key) =>
        !!record &&
        typeof record === "object" &&
        Object.prototype.hasOwnProperty.call(record, key);

      const getContextRecordKind = (record = {}, collectionName = "") => {
        const name = String(collectionName || "").toLowerCase();
        if (name.includes("customer")) return "customer";
        if (name.includes("lead")) return "lead";
        if (isQuotationCollection(name)) return "quotation";
        if (name.includes("project")) return "";
        if (
          record?.caseCode ||
          record?.caseName ||
          record?.projectName ||
          record?.projectManagerId ||
          record?.projectStatus ||
          record?.quotationId ||
          record?.contractId ||
          Array.isArray(record?.assignees)
        ) {
          return "";
        }
        if (hasOwn(record, "customerType")) return "customer";
        if (hasOwn(record, "leadType")) return "lead";
        if (looksLikeQuotationRecord(record, collectionName)) {
          return "quotation";
        }
        if (
          hasOwn(record, "customerName") ||
          hasOwn(record, "companyLegalName") ||
          hasOwn(record, "contactName")
        ) {
          return "customer";
        }
        return "";
      };

      const recordInternalCompanyId = (record) =>
        firstId(
          record?.internalCompanyId,
          record?.internalCompany,
          record?.internalCompanies,
        );

      const recordLawyerId = (record) =>
        firstId(
          record?.lawyerId,
          record?.lawyer,
          record?.lawyers,
          record?.assignedLawyerId,
          record?.assignedLawyer,
        );

      const getConfiguredProjectId = () => {
        const record = getConfiguredProjectRecord();
        return isProjectRecord(record) ? extractId(record?.id) : null;
      };

      const isProjectRecord = (record = {}, collectionName = "") => {
        if (!record || typeof record !== "object") return false;
        if (getContextRecordKind(record, collectionName)) return false;
        if (isProjectCollection(collectionName)) return true;
        return !!(
          record.caseCode ||
          record.caseName ||
          record.projectName ||
          record.projectManagerId ||
          record.projectStatus ||
          record.quotationId ||
          record.contractId ||
          Array.isArray(record.assignees)
        );
      };

      const isProjectServiceCollection = (name) =>
        String(name || "")
          .toLowerCase()
          .includes("projectservices");

      const isProjectCollection = (name) =>
        String(name || "")
          .toLowerCase()
          .includes("projects");

      const contractStatusToProjectServiceStatus = (status) => {
        const st = String(status || "")
          .toLowerCase()
          .trim();
        if (["cancelled", "canceled", "terminated", "rejected"].includes(st))
          return "cancelled";
        if (["completed", "closed", "done"].includes(st)) return "completed";
        if (["execution", "active", "signed"].includes(st)) return "active";
        if (
          ["sent", "pending_signature", "waiting_signature", "signature"].includes(st)
        )
          return "contract_pending_signature";
        return "contracted";
      };

      const safeNumber = (...values) => {
        for (const value of values) {
          const parsed = nullableNum(value);
          if (parsed !== null && parsed !== undefined && parsed !== 0) return parsed;
        }
        return 0;
      };

      const codeDateParts = (dateValue) => {
        const d = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
        const safeDate = Number.isNaN(d.getTime()) ? new Date() : d;
        return {
          mm: String(safeDate.getMonth() + 1).padStart(2, "0"),
          yyyy: safeDate.getFullYear(),
        };
      };

      const generateContractCode = async ({ prefix, issuedDate, parentId }) => {
        const { mm, yyyy } = codeDateParts(issuedDate);
        const suffix = `${mm}${yyyy}`;
        const filter =
          prefix === "PL" && parentId
            ? { parentId: { $eq: parseInt(parentId, 10) } }
            : {};

        const res = await ctx.api.request({
          url: "contracts:list",
          params: {
            page: 1,
            pageSize: 1000,
            sort: ["-createdAt"],
            ...(Object.keys(filter).length ? { filter: JSON.stringify(filter) } : {}),
          },
        });

        const pattern = new RegExp(`^${prefix}(\\d{2})${suffix}$`, "i");
        const items = res?.data?.data || [];
        const maxIndex = items.reduce((max, item) => {
          const code = String(
            item?.contractCode || item?.contractNumber || item?.code || "",
          );
          const match = code.match(pattern);
          return match ? Math.max(max, parseInt(match[1], 10) || 0) : max;
        }, 0);

        return `${prefix}${String(maxIndex + 1).padStart(2, "0")}${suffix}`;
      };

      async function fetchAll(url, params = {}) {
        try {
          const res = await ctx.api.request({
            url,
            params: { pageSize: 500, page: 1, sort: ["-createdAt"], ...params },
          });
          return newestFirst(res?.data?.data || []);
        } catch (error) {
          // Some lookup/reference collections (e.g. currencies) have no createdAt
          // field, so the sorted request above can fail outright. Retry once
          // without the sort before giving up on this url.
          try {
            const res = await ctx.api.request({
              url,
              params: { pageSize: 500, page: 1, ...params },
            });
            return res?.data?.data || [];
          } catch (fallbackError) {
            console.warn(
              `[ContractCreateForm] Could not fetch ${url}`,
              fallbackError,
            );
            return [];
          }
        }
      }
      async function fetchAllFromCandidates(urls = []) {
        for (const url of urls) {
          const rows = await fetchAll(url);
          if (Array.isArray(rows) && rows.length) return rows;
        }
        return [];
      }
      async function fetchExchangeRatesForConversion(
        fromCurrencyIds = [],
        toCurrencyId,
      ) {
        const toId = extractCurrencyId(toCurrencyId);
        const fromIds = Array.from(
          new Set(
            (fromCurrencyIds || [])
              .map((id) => extractCurrencyId(id))
              .filter((id) => id && id !== toId),
          ),
        );
        if (!toId || !fromIds.length) return [];

        // enough history for a back-dated contract's rate (newest first)
        const pageSize = Math.max(1000, fromIds.length * 5);
        const filterProfiles = [
          { fromCurrencyId: { $in: fromIds }, toCurrencyId: { $eq: toId } },
          {
            fromCurrency: { id: { $in: fromIds } },
            toCurrency: { id: { $eq: toId } },
          },
          { fromCurrencyId: { $eq: toId }, toCurrencyId: { $in: fromIds } },
          {
            fromCurrency: { id: { $eq: toId } },
            toCurrency: { id: { $in: fromIds } },
          },
        ];

        for (const url of EXCHANGE_RATE_RESOURCE_CANDIDATES) {
          const collected = [];
          for (const filter of filterProfiles) {
            try {
              const res = await ctx.api.request({
                url,
                params: {
                  pageSize,
                  page: 1,
                  appends: ["fromCurrency", "toCurrency"],
                  sort: ["-effectiveDate", "-createdAt"],
                  filter: JSON.stringify(filter),
                },
              });
              const rows = res?.data?.data || [];
              rows.forEach((row) => {
                if (!collected.some((item) => String(item.id) === String(row.id)))
                  collected.push(row);
              });
            } catch {}
          }
          if (collected.length) return collected;
        }
        return [];
      }

      const hasRecordId = (items, id) =>
        !!id && items.some((item) => String(extractId(item?.id)) === String(id));

      const mergeRecordById = (items, record) => {
        const id = extractId(record?.id);
        if (!id) return items;
        const index = items.findIndex(
          (item) => String(extractId(item?.id)) === String(id),
        );
        if (index === -1) return [record, ...items];
        const next = items.slice();
        next[index] = { ...next[index], ...record };
        return next;
      };

      const fieldStyle = {
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
      };

      const inputStyle = {
        width: "100%",
        boxSizing: "border-box",
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: "9px 11px",
        fontSize: 13,
        lineHeight: "20px",
        color: C.text,
        background: C.bg,
        outline: "none",
        fontFamily: FONT,
      };

      const labelStyle = {
        fontSize: 12,
        fontWeight: 600,
        color: C.label,
      };

      const mutedStyle = {
        fontSize: 12,
        color: C.sub,
      };

      const gridStyle = {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
        columnGap: 16,
        rowGap: 18,
        alignItems: "start",
      };

      const FIELD_HELP = {
        "Internal company": tr("The firm entity that provides the services. The service list is filtered by it."),
        "Payment mode": tr("Non-recurring: billed by case or by service. Recurring: a retainer billed every period."),
        "Contract type": tr("By Case: installments for the whole matter. By Service: each service or combo is billed when its trigger tasks are done."),
        Status: tr("Internal processing status of the contract."),
        "Contract code": tr("Leave blank to generate CT… (main contract) or PL… (appendix) from the signed month."),
        "Contract name": tr("Name used to find the contract in lists and search."),
        "Parent contract": tr("The main contract, when this one is an appendix."),
        "Require approval": tr("Tick when the contract must be approved before execution."),
        Approver: tr("The lawyer who approves the contract."),
        Customer: tr("The client. Quotations are filtered by this customer."),
        Lawyer: tr("The lawyer in charge."),
        Template: tr("The document template used to draft or print the contract."),
        Quotation: tr("The related quotation. Picking one fills customer, company and lawyer; the amounts come from the services below."),
        Case: tr("The case this contract serves."),
        "Signed date": tr("The day the contract is signed. Foreign-currency services are converted to VND at this day's rate."),
        "Billing cycle": tr("One time: a single payment. Multiple payments: enter the installments below."),
        "First payment": tr("The first payment date (one-time By Case, or the first retainer period)."),
        "End date": tr("The end of the contract. A retainer stops billing after this date."),
        "Total amount": tr("The contract value. With priced services it is their sum in VND and cannot be edited."),
        "Amount per period": tr("Retainer: billed every period (not split over the periods)."),
        "Retainer duration": tr("Number of periods. Each period bills the amount per period; the contract is worth amount × periods. Blank: billed every period until End date."),
        "Retainer repeat": tr("The period length: day, week, month or year."),
        "Next payment": tr("Worked out from First payment and Retainer repeat."),
      };

      const focus = (e) => {
        e.currentTarget.style.borderColor = C.borderFocus;
      };

      const blur = (e) => {
        e.currentTarget.style.borderColor = C.border;
      };

      const HelpMark = ({ text }) => {
        if (!text) return null;
        const mark = React.createElement(
          "span",
          {
            title: text,
            style: {
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 15,
              height: 15,
              borderRadius: "50%",
              border: `1px solid ${C.border}`,
              color: C.sub,
              fontSize: 10,
              fontWeight: 700,
              lineHeight: "14px",
              marginLeft: 6,
              cursor: "help",
              flex: "0 0 auto",
            },
          },
          "?",
        );

        return Tooltip ? React.createElement(Tooltip, { title: text }, mark) : mark;
      };

      const AddNewIconButton = ({ onClick, title = tr("Add new") }) =>
        React.createElement(
          "button",
          {
            type: "button",
            title,
            onMouseDown: (e) => {
              e.preventDefault();
              e.stopPropagation(); // chặn Select nhận mousedown, tránh nó tự toggle/remount trước khi click bắn ra
            },
            onClick: (e) => {
              e.preventDefault();
              e.stopPropagation();
              onClick?.();
            },
            style: {
              width: 20,
              height: 20,
              background: "#fff",
              border:'none',
              color: C.primary,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1,
              padding: 0,
              flexShrink: 0,
              pointerEvents: "auto", // <-- quan trọng: ghi đè pointer-events:none mà .ant-select-arrow áp lên
            },
          },
          "+",
        );

      const Field = ({ label, required, children, hint, tooltip }) =>
        AntForm
          ? React.createElement(
              AntForm.Item,
              {
                label,
                required: !!required,
                tooltip: tooltip || (FIELD_HELP[label] || FIELD_HELP[Object.keys(VI).find((k) => VI[k] === label && k in FIELD_HELP)]),
                help: hint || undefined,
                colon: false,
                labelCol: { span: 24 },
                wrapperCol: { span: 24 },
                style: { marginBottom: 0, minWidth: 0 },
              },
              children,
            )
          : React.createElement(
              "label",
              { style: fieldStyle },
              React.createElement(
                "span",
                {
                  style: {
                    ...labelStyle,
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 18,
                  },
                },
                label,
                required &&
                  React.createElement(
                    "span",
                    { style: { color: C.danger, marginLeft: 3 } },
                    "*",
                  ),
                React.createElement(HelpMark, { text: tooltip || (FIELD_HELP[label] || FIELD_HELP[Object.keys(VI).find((k) => VI[k] === label && k in FIELD_HELP)]) }),
              ),
              children,
              hint && React.createElement("span", { style: mutedStyle }, hint),
            );

      const Section = ({ title, children }) =>
        React.createElement(
          "section",
          {
            style: {
              borderTop: `1px solid ${C.border}`,
              paddingTop: 18,
              marginTop: 18,
            },
          },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 14,
                fontWeight: 700,
                color: C.text,
                marginBottom: 12,
              },
            },
            title,
          ),
          children,
        );

      const TextInput = ({ value, onChange, placeholder, type = "text" }) =>
        AntInput
          ? React.createElement(AntInput, {
              type,
              value: value ?? "",
              placeholder,
              onChange: (e) => onChange(e.target.value),
              style: { width: "100%" },
            })
          : React.createElement("input", {
              type,
              value: value ?? "",
              placeholder,
              onChange: (e) => onChange(e.target.value),
              onFocus: focus,
              onBlur: blur,
              style: inputStyle,
            });

      const MoneyInput = ({
        value,
        onChange,
        placeholder = "0",
        currency = null,
        disabled = false,
      }) => {
        const code = getCurrencyCode(currency || defaultCurrencyObject());
        const decimals = currency ? getCurrencyDecimals(currency) : 0;
        return AntInput
          ? React.createElement(AntInput, {
              value: moneyInputShow(value, decimals),
              placeholder,
              inputMode: decimals > 0 ? "decimal" : "numeric",
              addonAfter: code,
              disabled,
              onChange: (e) => onChange(moneyInputRaw(e.target.value, decimals)),
              style: { width: "100%" },
            })
          : React.createElement(
              "div",
              { style: { position: "relative", width: "100%" } },
              React.createElement("input", {
                type: "text",
                inputMode: decimals > 0 ? "decimal" : "numeric",
                value: moneyInputShow(value, decimals),
                placeholder,
                disabled,
                onChange: (e) => onChange(moneyInputRaw(e.target.value, decimals)),
                onFocus: focus,
                onBlur: blur,
                style: {
                  ...inputStyle,
                  textAlign: "center",
                  fontVariantNumeric: "tabular-nums",
                  paddingRight: hasInputValue(value)
                    ? Math.max(40, code.length * 8 + 22)
                    : 11,
                },
              }),
              hasInputValue(value) &&
                React.createElement(
                  "span",
                  {
                    style: {
                      position: "absolute",
                      right: 11,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 11,
                      color: C.sub,
                      pointerEvents: "auto",
                    },
                  },
                  code,
                ),
            );
      };

      const SuffixInput = ({ value, onChange, placeholder = "0", suffix }) => {
        if (AntInput) {
          return React.createElement(AntInput, {
            value: value ?? "",
            placeholder,
            inputMode: "numeric",
            addonAfter: suffix || undefined,
            onChange: (e) => onChange(e.target.value),
            style: { width: "100%" },
          });
        }

        const suffixPad = suffix ? Math.max(58, String(suffix).length * 8 + 22) : 11;

        return React.createElement(
          "div",
          { style: { position: "relative", width: "100%" } },
          React.createElement("input", {
            type: "text",
            inputMode: "numeric",
            value: value ?? "",
            placeholder,
            onChange: (e) => onChange(e.target.value),
            onFocus: focus,
            onBlur: blur,
            style: {
              ...inputStyle,
              textAlign: "center",
              fontVariantNumeric: "tabular-nums",
              paddingRight: suffixPad,
            },
          }),
          suffix &&
            React.createElement(
              "span",
              {
                style: {
                  position: "absolute",
                  right: 11,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 11,
                  color: C.sub,
                  pointerEvents: "auto",
                },
              },
              suffix,
            ),
        );
      };

      const PercentInput = ({ value, onChange, placeholder = "0" }) =>
        AntInput
          ? React.createElement(AntInput, {
              value: value ?? "",
              placeholder,
              inputMode: "numeric",
              addonAfter: "%",
              onChange: (e) => onChange(moneyRaw(e.target.value)),
              style: { width: "100%" },
            })
          : React.createElement(
              "div",
              {
                style: {
                  ...inputStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 11px",
                  minHeight: 40,
                },
              },
              React.createElement("input", {
                type: "text",
                inputMode: "numeric",
                value: value ?? "",
                placeholder,
                onChange: (e) => onChange(moneyRaw(e.target.value)),
                onFocus: (e) => {
                  e.currentTarget.parentElement.style.borderColor = C.borderFocus;
                },
                onBlur: (e) => {
                  e.currentTarget.parentElement.style.borderColor = C.border;
                },
                style: {
                  width: "100%",
                  minWidth: 0,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: C.text,
                  textAlign: "right",
                  fontSize: 14,
                  fontFamily: FONT,
                  fontVariantNumeric: "tabular-nums",
                },
              }),
              React.createElement(
                "span",
                {
                  style: {
                    color: C.sub,
                    fontSize: 12,
                    fontWeight: 700,
                    flex: "0 0 auto",
                  },
                },
                "%",
              ),
            );

      const TextArea = ({ value, onChange, placeholder, rows = 3, style = {} }) =>
        AntInput?.TextArea
          ? React.createElement(AntInput.TextArea, {
              value: value ?? "",
              placeholder,
              rows,
              onChange: (e) => onChange(e.target.value),
              style: { width: "100%", ...style },
            })
          : React.createElement("textarea", {
              value: value ?? "",
              placeholder,
              rows,
              onChange: (e) => onChange(e.target.value),
              onFocus: focus,
              onBlur: blur,
              style: {
                ...inputStyle,
                resize: "vertical",
                minHeight: rows * 24 + 18,
                ...style,
              },
            });

      const SelectInput = ({ value, onChange, options, placeholder }) =>
        AntSelect
          ? React.createElement(AntSelect, {
              value: value || undefined,
              placeholder: placeholder || tr("Select"),
              allowClear: true,
              showSearch: true,
              optionFilterProp: "label",
              onChange: (next) => onChange(next || ""),
              style: { width: "100%" },
              options: options.map((option) => ({
                value: option.value,
                label: option.label,
              })),
            })
          : React.createElement(
              "select",
              {
                value: value ?? "",
                onChange: (e) => onChange(e.target.value),
                onFocus: focus,
                onBlur: blur,
                style: inputStyle,
              },
              React.createElement("option", { value: "" }, placeholder || tr("Select")),
              options.map((option) =>
                React.createElement(
                  "option",
                  { key: option.value, value: option.value },
                  option.label,
                ),
              ),
            );

      const normalizeSearch = (value) =>
        String(value ?? "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();

      const SearchSelect = ({
        value,
        onChange,
        options,
        placeholder,
        emptyText = tr("No matching records"),
        onAddNew,
        addNewLabel = tr("Add new"),
      }) => {
        if (AntSelect) {
          return React.createElement(AntSelect, {
            value: value || undefined,
            placeholder,
            allowClear: true,
            showSearch: true,
            optionFilterProp: "searchText",
            optionLabelProp: "titleText",
            notFoundContent: emptyText,
            onChange: (next) => onChange(next || ""),
            style: { width: "100%" },
            options: options.map((option) => ({
              value: option.value,
              titleText: option.label,
              searchText: compact([option.label, option.subLabel, option.value]).join(
                " ",
              ),
              label: React.createElement(
                "div",
                { style: { display: "flex", flexDirection: "column", minWidth: 0 } },
                React.createElement(
                  "span",
                  {
                    style: {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                  },
                  option.label,
                ),
                option.subLabel &&
                  React.createElement(
                    "span",
                    {
                      style: {
                        color: C.sub,
                        fontSize: 12,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      },
                    },
                    option.subLabel,
                  ),
              ),
            })),
            filterOption: (input, option) =>
              normalizeSearch(option?.searchText).includes(normalizeSearch(input)),
            suffixIcon: onAddNew
              ? React.createElement(
                  "span",
                  { style: { pointerEvents: "auto" } },
                  React.createElement(AddNewIconButton, {
                    onClick: onAddNew,
                    title: addNewLabel,
                  }),
                )
              : undefined,
          });
        }

        const selected = options.find(
          (option) => String(option.value) === String(value),
        );
        const [query, setQuery] = useState(selected?.label || "");
        const [open, setOpen] = useState(false);

        useEffect(() => {
          setQuery(selected?.label || "");
        }, [value, selected?.label]);

        const filteredOptions = useMemo(() => {
          const q = normalizeSearch(query).trim();
          const source = q
            ? options.filter(
                (option) =>
                  normalizeSearch(option.label).includes(q) ||
                  normalizeSearch(option.subLabel).includes(q) ||
                  normalizeSearch(option.value).includes(q),
              )
            : options;

          return source.slice(0, 40);
        }, [options, query]);

        return React.createElement(
          "div",
          { style: { position: "relative", width: "100%" } },
          React.createElement("input", {
            type: "text",
            value: query,
            placeholder,
            onChange: (e) => {
              setQuery(e.target.value);
              setOpen(true);
            },
            onFocus: (e) => {
              focus(e);
              setOpen(true);
            },
            onBlur: (e) => {
              blur(e);
              setTimeout(() => setOpen(false), 120);
            },
            style: {
              ...inputStyle,
              paddingRight: selected ? 60 : 11,
            },
          }),
          selected &&
            React.createElement(
              "button",
              {
                type: "button",
                onMouseDown: (e) => e.preventDefault(),
                onClick: () => {
                  onChange("");
                  setQuery("");
                  setOpen(false);
                },
                style: {
                  position: "absolute",
                  right: 7,
                  top: 6,
                  border: "none",
                  background: "transparent",
                  color: C.sub,
                  fontSize: 12,
                  fontWeight: 600,
                  lineHeight: "24px",
                  padding: "0 4px",
                  cursor: "pointer",
                  fontFamily: FONT,
                },
              },
              tr("Clear"),
            ),
          open &&
            React.createElement(
              "div",
              {
                style: {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "calc(100% + 4px)",
                  zIndex: 20,
                  maxHeight: 220,
                  overflowY: "auto",
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  background: C.bg,
                  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.14)",
                },
              },
              filteredOptions.length
                ? filteredOptions.map((option) =>
                    React.createElement(
                      "div",
                      {
                        key: option.value,
                        onMouseDown: (e) => {
                          e.preventDefault();
                          onChange(option.value);
                          setQuery(option.label);
                          setOpen(false);
                        },
                        style: {
                          padding: "9px 11px",
                          cursor: "pointer",
                          background:
                            String(option.value) === String(value) ? "#eef4fb" : C.bg,
                        },
                      },
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 13,
                            lineHeight: "18px",
                            color: C.text,
                            fontWeight: 600,
                          },
                        },
                        option.label,
                      ),
                      option.subLabel &&
                        React.createElement(
                          "div",
                          {
                            style: {
                              marginTop: 2,
                              fontSize: 12,
                              lineHeight: "17px",
                              color: C.sub,
                            },
                          },
                          option.subLabel,
                        ),
                    ),
                  )
                : React.createElement(
                    "div",
                    {
                      style: {
                        padding: "9px 11px",
                        fontSize: 13,
                        color: C.sub,
                      },
                    },
                    emptyText,
                  ),
              onAddNew &&
                React.createElement(
                  "div",
                  {
                    style: {
                      borderTop: `1px solid ${C.border}`,
                      padding: 8,
                      display: "flex",
                      justifyContent: "flex-end",
                    },
                  },
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      onMouseDown: (event) => {
                        event.preventDefault();
                        onAddNew();
                        setOpen(false);
                      },
                      style: {
                        border: `1px dashed ${C.primary}`,
                        borderRadius: 5,
                        background: "#fff",
                        color: C.primary,
                        cursor: "pointer",
                        fontFamily: FONT,
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: "20px",
                        padding: "2px 9px",
                      },
                    },
                    addNewLabel,
                  ),
                ),
            ),
        );
      };

      const TutorialPanel = ({ contractType }) => {
        const isRetainer = contractType === "retainer";
        const fromHelp = (keys) => keys.map((key) => [tr(key), FIELD_HELP[key]]);
        const groups = [
          {
            title: tr("Contract"),
            rows: fromHelp(["Internal company", "Payment mode", "Contract type", "Status", "Contract code", "Contract name", "Parent contract", "Require approval", "Approver"]),
          },
          { title: tr("Related"), rows: fromHelp(["Customer", "Lawyer", "Template", "Quotation", "Case"]) },
          {
            title: tr("Commercial terms"),
            rows: fromHelp(
              isRetainer
                ? ["Signed date", "First payment", "End date", "Amount per period", "Retainer duration", "Retainer repeat", "Next payment"]
                : ["Signed date", "Billing cycle", "First payment", "End date", "Total amount"],
            ),
          },
          {
            title: tr("Services and payments"),
            rows: [
              [tr("Services"), tr("Pick from the company's catalog or create one. Line pricing: each service has its own price and VAT. Combo pricing: one price for the whole combo.")],
              [tr("Currencies"), tr("Each service keeps its own currency; totals are in VND at the Signed-date rate. View currency breakdown shows the rates used.")],
              [tr("Payment schedule"), tr("Multiple payments only: percentages add up to 100% and each installment names at least one service.")],
              [tr("Payment triggers"), tr("Tick the tasks whose completion activates a payment.")],
            ],
          },
        ];
        return React.createElement(
          "div",
          { style: { border: `1px solid ${C.border}`, borderRadius: 8, background: C.bgSoft, padding: 16 } },
          React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 } }, tr("Contract fields")),
          React.createElement(
            "div",
            { style: { fontSize: 12.5, color: C.sub, lineHeight: "19px", marginBottom: 14 } },
            tr("What each field means. Fields you are unsure about can be left blank and filled in later."),
          ),
          React.createElement(
            "div",
            { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", columnGap: 18, rowGap: 12, alignItems: "start" } },
            groups.map((group) =>
              React.createElement(
                "div",
                { key: group.title, style: { borderTop: `1px solid ${C.border}`, paddingTop: 12 } },
                React.createElement("div", { style: { fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 7 } }, group.title),
                group.rows.map(([name, desc]) =>
                  React.createElement(
                    "div",
                    { key: name, style: { marginTop: 8 } },
                    React.createElement("div", { style: { fontSize: 12.5, fontWeight: 700, color: C.label, marginBottom: 2 } }, name),
                    React.createElement("div", { style: { fontSize: 12.5, color: C.sub, lineHeight: "19px" } }, desc),
                  ),
                ),
              ),
            ),
          ),
        );
      };

      const makeIcon = (paths, props = {}) => {
        return React.createElement(
          "svg",
          {
            viewBox: "0 0 24 24",
            width: props.size || 16,
            height: props.size || 16,
            fill: "none",
            stroke: "currentColor",
            strokeWidth: 2,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            ...props,
          },
          ...paths,
        );
      };

      const EditIcon = makeIcon(
        [
          React.createElement("path", {
            d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",
            key: "1",
          }),
          React.createElement("path", {
            d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
            key: "2",
          }),
        ],
        { size: 14 },
      );

      const CheckIcon = makeIcon(
        [React.createElement("polyline", { points: "20 6 9 17 4 12", key: "1" })],
        { size: 14 },
      );

      const XIcon = makeIcon(
        [
          React.createElement("line", {
            x1: "18",
            y1: "6",
            x2: "6",
            y2: "18",
            key: "1",
          }),
          React.createElement("line", {
            x1: "6",
            y1: "6",
            x2: "18",
            y2: "18",
            key: "2",
          }),
        ],
        { size: 14 },
      );

      const PlusIcon = makeIcon(
        [
          React.createElement("line", {
            x1: "12",
            y1: "5",
            x2: "12",
            y2: "19",
            key: "1",
          }),
          React.createElement("line", {
            x1: "5",
            y1: "12",
            x2: "19",
            y2: "12",
            key: "2",
          }),
        ],
        { size: 14 },
      );

      const TrashIcon = makeIcon(
        [
          React.createElement("polyline", { points: "3 6 5 6 21 6", key: "1" }),
          React.createElement("path", {
            d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6",
            key: "2",
          }),
          React.createElement("path", { d: "M10 11v6", key: "3" }),
          React.createElement("path", { d: "M14 11v6", key: "4" }),
          React.createElement("path", { d: "M9 6V4h6v2", key: "5" }),
        ],
        { size: 14 },
      );

      const SearchIcon = makeIcon(
        [
          React.createElement("circle", { cx: "11", cy: "11", r: "8", key: "1" }),
          React.createElement("path", { d: "m21 21-4.35-4.35", key: "2" }),
        ],
        { size: 14 },
      );

      const TagIcon = makeIcon(
        [
          React.createElement("path", {
            d: "M20.59 13.41 12 22l-10-10V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z",
            key: "1",
          }),
          React.createElement("circle", { cx: "7", cy: "7", r: "1.5", key: "2" }),
        ],
        { size: 14 },
      );

      const ChevronDownIcon = makeIcon(
        [React.createElement("polyline", { points: "6 9 12 15 18 9", key: "1" })],
        { size: 14 },
      );

      // ==================== SERVICES TABLE — CASE-STYLE ICON BUTTONS ====================
      // Ported from CaseCreateForm.js's services table (see
      // docs/superpowers/specs/2026-08-17-services-table-case-createform-parity-design.md) — square,
      // bordered icon buttons for the per-row edit-toggle and delete actions, and a minimal
      // truncate/expand text component for read-only descriptions. Reuses this file's own
      // EditIcon/CheckIcon/TrashIcon (already defined above) rather than adding new icon components.
      const iconButtonStyle = (color, active = false) => ({
        width: 28,
        height: 28,
        borderRadius: 6,
        border: active ? `1px solid ${color}` : `1px solid ${C.border}`,
        background: active ? "#eff6ff" : "#fff",
        color,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
      });

      const ExpandableText = ({ text, limit = 100 }) => {
        const [expanded, setExpanded] = useState(false);
        const value = text || "";
        if (!value) {
          return React.createElement(
            "span",
            { style: { fontSize: 12, color: "#d1d5db", fontStyle: "italic" } },
            tr("No description"),
          );
        }
        if (value.length <= limit) {
          return React.createElement(
            "span",
            { style: { whiteSpace: "pre-wrap", wordBreak: "break-word" } },
            value,
          );
        }
        return React.createElement(
          "span",
          { style: { whiteSpace: "pre-wrap", wordBreak: "break-word" } },
          expanded ? value : `${value.slice(0, limit)}…`,
          React.createElement(
            "span",
            {
              onClick: (e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              },
              style: {
                color: C.primary,
                cursor: "pointer",
                fontSize: 11.5,
                fontWeight: 600,
                marginLeft: 6,
                whiteSpace: "nowrap",
              },
            },
            expanded ? tr("Show less") : tr("Show more"),
          ),
        );
      };

      const ManualContractServicesSection = ({
        rows,
        services,
        pricingMode,
        packageVatRate,
        packageTotals,
        currencies = [],
        currencyOptions = [],
        selectedCurrency = null,
        readOnlyServices = false,
        showAddRow = true,
        allowDelete = true,
        onPricingModeChange,
        onPackageSubTotalChange,
        onPackageVatRateChange,
        onDeleteRow,
        onUpdateRow,
        onSelectService,
        onCreateManualService,
        onCurrencyChange,
        combos = [],
        onApplyCombo,
        onApplyAdhocCombo,
        appliedCombos = [],
        onRemoveCombo,
        onUpdateComboAmount,
        onAddServiceToCombo,
        onAddFromService,
        onConvertedTotalsChange,
        // the contract's Signed date: the database freezes a contract line's
        // rate on it (money_line_rate), so the preview converts on it too
        pricingDate = "",
      }) => {
        const [pickerRowId, setPickerRowId] = useState(null);
        // When set, the picker was opened via the top-level "+ Add service"
        // button (adds a brand-new row) rather than by clicking an existing row's
        // service cell (re-picks that row's service in place). Individual/Combo
        // mode and the combo tabs are only ever available in "new row" mode.
        const NEW_ROW_SENTINEL = "__new__";
        // When set (together with pickerRowId === NEW_ROW_SENTINEL), the picker
        // was opened via a specific combo section's own "+ Add service" action —
        // the picked/created service is tagged into that combo's section instead
        // of landing as an untagged row, and the mode toggle is hidden.
        const [comboAddInstanceId, setComboAddInstanceId] = useState(null);
        // Line/Combo sync (2026-09-25): in Combo pricing with combos present,
        // a service added from the top-level "New service" goes into a combo
        // the lawyer picks (default: the last one) instead of a loose line.
        const [addToComboTarget, setAddToComboTarget] = useState(null);
        const comboTargets = [];
        (rows || []).forEach((row) => {
          const key = row._comboInstanceId || getPersistedComboGroupKey(row);
          if (!key || comboTargets.some((target) => target.key === key)) return;
          comboTargets.push({ key, name: row._comboName || row.comboName || "Combo" });
        });
        const [mode, setMode] = useState("individual");
        const [comboTab, setComboTab] = useState("select");
        const [comboSearch, setComboSearch] = useState("");
        const [comboName, setComboName] = useState("");
        const [comboType, setComboType] = useState("");
        const [comboSaveToCatalog, setComboSaveToCatalog] = useState(false);
        const [comboSubTotal, setComboSubTotal] = useState(0);
        const [comboCurrencyId, setComboCurrencyId] = useState("");
        const [comboVatRate, setComboVatRate] = useState(0);
        const [comboItems, setComboItems] = useState([]);
        const [comboItemPick, setComboItemPick] = useState("");
        const [comboErrors, setComboErrors] = useState({});
        const [comboApplying, setComboApplying] = useState(false);
        const [search, setSearch] = useState("");
        const [showAdd, setShowAdd] = useState(false);
        const [newService, setNewService] = useState({
          serviceName: "",
          serviceType: "",
          currencyId: "",
          basePrice: "",
          description: "",
          saveToCatalog: false,
        });
        const [createError, setCreateError] = useState("");
        const packageMode = pricingMode === "package";
        const actionColumn = allowDelete ? " 52px" : "";
        const columns = `44px minmax(260px, 1.3fr) minmax(200px, 0.9fr) minmax(190px, 0.85fr) 98px minmax(165px, 0.75fr)${actionColumn}`;
        const selectedServiceIds = rows
          .map((row) => String(row.serviceId || ""))
          .filter(Boolean);
        const currentRow = rows.find((row) => row.id === pickerRowId) || null;
        const defaultCurrency = selectedCurrency || findDefaultCurrency(currencies);
        const defaultCurrencyId =
          extractCurrencyId(defaultCurrency) ||
          extractCurrencyId(currencyOptions[0]?.value);

        useEffect(() => {
          if (comboCurrencyId || !defaultCurrencyId) return;
          setComboCurrencyId(String(defaultCurrencyId));
        }, [defaultCurrencyId]);

        const selectedComboCurrency =
          findCurrencyById(currencies, comboCurrencyId) || defaultCurrency;

        const filteredCombos = useMemo(() => {
          if (!comboSearch.trim()) return combos;
          const q = comboSearch.toLowerCase();
          return combos.filter(
            (c) =>
              (c.comboName || "").toLowerCase().includes(q) ||
              (c.serviceComboType || "").toLowerCase().includes(q),
          );
        }, [combos, comboSearch]);

        const comboAvailableCatalogItems = useMemo(
          () =>
            services.filter(
              (s) =>
                !comboItems.some(
                  (it) =>
                    it.source === "catalog" &&
                    String(it.serviceId) === String(serviceOptionServiceId(s)),
                ),
            ),
          [services, comboItems],
        );

        const addComboCatalogItem = (svc) => {
          setComboItems((prev) => [
            ...prev,
            {
              _id: Date.now() + Math.random(),
              source: "catalog",
              serviceId: String(serviceOptionServiceId(svc)),
              serviceName: serviceCatalogName(svc),
              serviceType: serviceCatalogType(svc) || "",
              description: serviceCatalogDescription(svc) || "",
              quantity: 1,
              basePrice: parseNum(serviceCatalogPrice(svc)),
            },
          ]);
          setComboItemPick("");
          setComboErrors((p) => ({ ...p, items: "" }));
        };
        const addComboCustomItem = () => {
          setComboItems((prev) => [
            ...prev,
            {
              _id: Date.now() + Math.random(),
              source: "custom",
              serviceId: null,
              serviceName: "",
              serviceType: "",
              description: "",
              quantity: 1,
              basePrice: 0,
            },
          ]);
          setComboErrors((p) => ({ ...p, items: "" }));
        };
        const updateComboItem = (itemId, field, value) => {
          setComboItems((prev) =>
            prev.map((it) => (it._id === itemId ? { ...it, [field]: value } : it)),
          );
        };
        const removeComboItem = (itemId) => {
          setComboItems((prev) => prev.filter((it) => it._id !== itemId));
        };

        const handleApplyAdhocCombo = async () => {
          const errs = {};
          if (!comboName.trim()) errs.comboName = tr("Please enter a combo name");
          if (currencies.length && !extractCurrencyId(comboCurrencyId))
            errs.comboCurrencyId = tr("Please select a currency");
          if (!comboItems.length) {
            errs.items = tr("Please add at least 1 service to the combo");
          } else {
            const emptyNameItem = comboItems.find(
              (it) => !String(it.serviceName || "").trim(),
            );
            if (emptyNameItem) {
              errs.items = tr("One or more services are missing a name");
            } else {
              const seenNames = new Set();
              const duplicateItem = comboItems.find((it) => {
                const key = String(it.serviceName || "").trim().toLowerCase();
                if (seenNames.has(key)) return true;
                seenNames.add(key);
                return false;
              });
              if (duplicateItem) errs.items = tr("Duplicate service name in combo");
            }
          }
          setComboErrors(errs);
          if (Object.keys(errs).length) return;

          setComboApplying(true);
          try {
            await onApplyAdhocCombo?.({
              comboName: comboName.trim(),
              serviceComboType: comboType.trim() || null,
              packageSubTotal: comboSubTotal,
              packageVatRate: comboVatRate,
              currencyId: extractCurrencyId(comboCurrencyId) || defaultCurrencyId,
              saveComboToCatalog: comboSaveToCatalog,
              items: comboItems.map((it) => ({
                serviceId: it.serviceId,
                serviceName: it.serviceName.trim(),
                serviceType: (it.serviceType || "").trim(),
                description: (it.description || "").trim(),
                quantity: it.quantity,
                // Renamed from the draft's own `basePrice`/`vat`/`currencyId`
                // fields to the shape applyAdhocCombo's _comboItemSnapshot
                // expects (matching CaseCreateForm.js) — without this, each
                // row's standalone-price display had nothing to read and
                // fell back to 0.
                price: parseNum(it.basePrice ?? it.price),
                vat: parseNum(it.vat),
                currencyId: extractCurrencyId(it.currencyId),
                // Driven entirely by the combo-level checkbox - checking "Also
                // save this combo to the shared catalog" saves every custom
                // item in it, no separate per-item opt-in.
                saveToCatalog:
                  comboSaveToCatalog &&
                  !services.some((s) => normalizeSearch(serviceCatalogName(s)) === normalizeSearch(it.serviceName)),
              })),
            });
            closePicker();
          } finally {
            setComboApplying(false);
          }
        };

        const comboTh = (extra = {}) => ({ padding: "8px 10px", fontSize: 11, fontWeight: 600, color: C.sub, background: C.bgSoft, borderBottom: `1px solid ${C.border}`, textAlign: "left", fontFamily: FONT, ...extra });
        const comboTd = (extra = {}) => ({ padding: "6px 10px", fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle", fontFamily: FONT, ...extra });

        const renderComboItemsTable = () =>
          React.createElement(
            "div",
            { style: { overflowX: "auto", marginBottom: 10, border: `1px solid ${C.border}`, borderRadius: 8 } },
            React.createElement(
            "table",
            { style: { width: "100%", minWidth: 720, borderCollapse: "collapse", tableLayout: "fixed" } },
            React.createElement(
              "thead",
              null,
              React.createElement(
                "tr",
                null,
                React.createElement("th", { style: comboTh({ width: 28, textAlign: "center" }) }, "#"),
                React.createElement("th", { style: comboTh({ width: "28%" }) }, tr("Service name")),
                React.createElement("th", { style: comboTh({ width: 110 }) }, tr("Type")),
                React.createElement("th", { style: comboTh({ width: 130, textAlign: "right" }) }, tr("Unit Price")),
                React.createElement("th", { style: comboTh() }, tr("Description")),
                React.createElement("th", { style: comboTh({ width: 32 }) }, ""),
              ),
            ),
            React.createElement(
              "tbody",
              null,
              comboItems.map((item, index) => {
                const isCustom = item.source === "custom";
                const isNameAlreadyInCatalog =
                  isCustom &&
                  !!(item.serviceName || "").trim() &&
                  services.some((s) => normalizeSearch(serviceCatalogName(s)) === normalizeSearch(item.serviceName));
                return React.createElement(
                  "tr",
                  { key: item._id, style: { background: isCustom ? "#fffbe6" : "#fff" } },
                  React.createElement("td", { style: comboTd({ textAlign: "center", color: C.sub, fontFamily: "monospace", fontSize: 11.5 }) }, index + 1),
                  React.createElement(
                    "td",
                    { style: comboTd() },
                    isCustom
                      ? React.createElement(
                          React.Fragment,
                          null,
                          React.createElement("input", {
                            value: item.serviceName || "",
                            onChange: (e) => updateComboItem(item._id, "serviceName", e.target.value),
                            placeholder: tr("New service name..."),
                            style: { ...inputStyle, fontSize: 13, padding: "5px 8px" },
                            onFocus: focus,
                            onBlur: blur,
                          }),
                          isNameAlreadyInCatalog &&
                            React.createElement("div", { style: { fontSize: 11, color: C.sub, marginTop: 3 } }, tr("Already in the standardized catalog")),
                        )
                      : React.createElement("span", { style: { fontWeight: 600, color: C.text } }, item.serviceName),
                  ),
                  React.createElement(
                    "td",
                    { style: comboTd() },
                    isCustom
                      ? React.createElement("input", {
                          value: item.serviceType || "",
                          onChange: (e) => updateComboItem(item._id, "serviceType", e.target.value),
                          placeholder: tr("Type (optional)..."),
                          style: { ...inputStyle, fontSize: 12.5, padding: "5px 8px" },
                          onFocus: focus,
                          onBlur: blur,
                        })
                      : React.createElement("span", { style: { color: C.sub, fontSize: 12.5 } }, item.serviceType || "—"),
                  ),
                  React.createElement(
                    "td",
                    { style: comboTd({ textAlign: "right" }) },
                    isCustom
                      ? React.createElement(MoneyInput, {
                          value: item.basePrice || 0,
                          onChange: (v) => updateComboItem(item._id, "basePrice", v),
                          currency: selectedComboCurrency,
                        })
                      : React.createElement("span", { style: { color: C.text, fontSize: 12.5, fontFamily: "monospace" } }, formatMoneyByCurrency(item.basePrice || 0, selectedComboCurrency)),
                  ),
                  React.createElement(
                    "td",
                    { style: comboTd() },
                    isCustom
                      ? React.createElement("input", {
                          value: item.description || "",
                          onChange: (e) => updateComboItem(item._id, "description", e.target.value),
                          placeholder: tr("Description (optional)..."),
                          style: { ...inputStyle, fontSize: 12.5, padding: "5px 8px" },
                          onFocus: focus,
                          onBlur: blur,
                        })
                      : React.createElement("span", { style: { color: C.sub, fontSize: 12.5 } }, item.description || "—"),
                  ),
                  React.createElement(
                    "td",
                    { style: comboTd({ textAlign: "center" }) },
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        onClick: () => removeComboItem(item._id),
                        title: tr("Remove"),
                        style: { border: "none", background: "transparent", color: C.danger, cursor: "pointer", fontSize: 15, lineHeight: 1 },
                      },
                      "×",
                    ),
                  ),
                );
              }),
            ),
            ),
          );

        const renderComboSelectTab = () =>
          React.createElement(
            React.Fragment,
            null,
            React.createElement(
              "div",
              {
                style: {
                  padding: "16px 26px",
                  borderBottom: `1px solid #f3f4f6`,
                  flexShrink: 0,
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                },
              },
              React.createElement("input", {
                autoFocus: true,
                value: comboSearch,
                onChange: (e) => setComboSearch(e.target.value),
                placeholder: tr("Search combo..."),
                style: { ...inputStyle, flex: 1, minWidth: 0, height: 44 },
                onFocus: focus,
                onBlur: blur,
              }),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => setComboTab("create"),
                  style: {
                    border: `1px dashed ${C.primary}`,
                    background: "#fff",
                    color: C.primary,
                    borderRadius: 7,
                    padding: "0 18px",
                    height: 44,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: FONT,
                    whiteSpace: "nowrap",
                  },
                },
                tr("+ New combo"),
              ),
            ),
            React.createElement(
              "div",
              { style: { overflowY: "auto", overflowX: "auto", flex: 1, minHeight: 220 } },
              React.createElement(
                "table",
                { style: { width: "100%", minWidth: 600, borderCollapse: "collapse", tableLayout: "fixed" } },
                React.createElement(
                  "thead",
                  null,
                  React.createElement(
                    "tr",
                    null,
                    React.createElement("th", { style: modalThStyle({ width: 42, textAlign: "center" }) }, "#"),
                    React.createElement("th", { style: modalThStyle() }, tr("Combo")),
                    React.createElement("th", { style: modalThStyle({ width: 170, textAlign: "right" }) }, tr("Combo Price")),
                    React.createElement("th", { style: modalThStyle({ width: 100, textAlign: "center" }) }, tr("Services")),
                    React.createElement("th", { style: modalThStyle({ width: 90, textAlign: "center" }) }, ""),
                  ),
                ),
                React.createElement(
                  "tbody",
                  null,
                  filteredCombos.length === 0
                    ? React.createElement(
                        "tr",
                        null,
                        React.createElement(
                          "td",
                          { colSpan: 5, style: modalTdStyle({ textAlign: "center", color: C.sub, padding: "42px 12px" }) },
                          React.createElement(
                            "div",
                            { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 } },
                            React.createElement("div", null, tr("No combos yet")),
                            React.createElement(
                              "span",
                              {
                                onClick: () => setComboTab("create"),
                                style: { color: C.primary, cursor: "pointer", fontSize: 12, textDecoration: "underline" },
                              },
                              tr("New combo"),
                            ),
                          ),
                        ),
                      )
                    : filteredCombos.map((c, i) => {
                        const itemCount = (c.serviceComboItems || []).length;
                        const comboCurrency = currencyFromRecord(c, currencies, defaultCurrency);
                        const comboCurrencyIdFallback = extractCurrencyId(comboCurrency);
                        // Illustrative only — sums each service's own standalone
                        // basePrice × quantity so the user can see, at a glance,
                        // how much cheaper the package is vs. buying the lines
                        // separately. Does not touch packageSubTotal/totalAmount.
                        // Each item can be snapshotted in its own currency
                        // (item.currencyId), independent of the combo's own
                        // currency — convert every item (and the combo's own
                        // packageSubTotal) to VND so a combo mixing currencies
                        // still compares correctly.
                        const individualTotal = (c.serviceComboItems || []).reduce((sum, item) => {
                          const svc = item.services || {};
                          // serviceComboItems.price is a snapshot taken when the
                          // line was added to the combo — prefer it over the live
                          // services join so historical combos keep their original
                          // per-line price even if the catalog price changes later.
                          const price = parseNum(item.price ?? svc.basePrice ?? svc.unitPrice ?? svc.price ?? 0);
                          const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
                          const itemCurrencyId = extractCurrencyId(item.currencyId) || comboCurrencyIdFallback;
                          const converted = convertComboAmountToVndSync(price * qty, itemCurrencyId);
                          return sum + converted.value;
                        }, 0);
                        const packagePrice = convertComboAmountToVndSync(
                          parseNum(c.packageSubTotal),
                          comboCurrencyIdFallback,
                        ).value;
                        const comboSavings = individualTotal - packagePrice;
                        const comboSavingsPct = individualTotal > 0 ? Math.round((comboSavings / individualTotal) * 100) : 0;
                        return React.createElement(
                          "tr",
                          {
                            key: c.id,
                            style: { background: i % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" },
                            onClick: () => onApplyCombo?.(c.id),
                          },
                          React.createElement("td", { style: modalTdStyle({ textAlign: "center", color: C.sub, fontSize: 12 }) }, i + 1),
                          React.createElement(
                            "td",
                            { style: modalTdStyle({ fontWeight: 700, color: C.text }) },
                            React.createElement("div", null, c.comboName || tr("Package #{0}", { 0: c.id })),
                            c.serviceComboType &&
                              React.createElement(
                                "span",
                                {
                                  style: {
                                    display: "inline-block",
                                    marginTop: 4,
                                    fontSize: 11,
                                    background: "#eff6ff",
                                    color: "#1d4ed8",
                                    padding: "2px 8px",
                                    borderRadius: 10,
                                  },
                                },
                                c.serviceComboType,
                              ),
                          ),
                          React.createElement(
                            "td",
                            { style: modalTdStyle({ textAlign: "right" }) },
                            comboSavings !== 0 &&
                              React.createElement(
                                "div",
                                { style: { fontSize: 11, color: C.sub, textDecoration: "line-through" } },
                                formatMoneyByCurrency(individualTotal, vndCurrency),
                              ),
                            React.createElement("div", { style: { fontWeight: 700, color: C.text } }, formatMoneyByCurrency(c.packageSubTotal, comboCurrency)),
                            React.createElement("div", { style: { fontSize: 10.5, color: C.sub } }, tr("VAT {0}%", { 0: parseNum(c.packageVatRate) })),
                            comboSavings > 0 &&
                              React.createElement(
                                "div",
                                { style: { fontSize: 10.5, color: "#52c41a", fontWeight: 600 } },
                                tr("Save {0} ({1}%)", { 0: formatMoneyByCurrency(comboSavings, vndCurrency), 1: comboSavingsPct }),
                              ),
                          ),
                          React.createElement("td", { style: modalTdStyle({ textAlign: "center", color: C.sub, fontSize: 12.5 }) }, itemCount),
                          React.createElement(
                            "td",
                            { style: modalTdStyle({ textAlign: "center" }) },
                            React.createElement(
                              "span",
                              {
                                style: {
                                  display: "inline-block",
                                  padding: "3px 14px",
                                  borderRadius: 4,
                                  background: C.primary,
                                  color: "#fff",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  whiteSpace: "nowrap",
                                },
                              },
                              tr("Select"),
                            ),
                          ),
                        );
                      }),
                ),
              ),
            ),
            React.createElement(
              "div",
              { style: { padding: "14px 26px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", flexShrink: 0, background: "#fff" } },
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: requestClosePicker,
                  style: {
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    background: "#fff",
                    color: C.sub,
                    padding: "8px 22px",
                    fontSize: 13,
                    fontFamily: FONT,
                    cursor: "pointer",
                  },
                },
                tr("Close"),
              ),
            ),
          );

        const renderComboCreateTab = () =>
          React.createElement(
            React.Fragment,
            null,
            React.createElement(
              "div",
              { style: { overflowY: "auto", flex: 1, padding: "24px 32px 18px" } },
              React.createElement(
                "div",
                { style: { display: "grid", gap: 16 } },
                React.createElement(
                  "div",
                  { style: { display: "flex", flexWrap: "wrap", gap: 16 } },
                  React.createElement(
                    "div",
                    { style: { flex: "2 1 220px", minWidth: 0 } },
                    React.createElement(
                      Field,
                      { label: tr("Combo Name"), required: true },
                      React.createElement(TextInput, {
                        value: comboName,
                        onChange: (value) => {
                          setComboName(value);
                          setComboErrors((p) => ({ ...p, comboName: "" }));
                        },
                        placeholder: tr("E.g. Business incorporation consulting combo..."),
                      }),
                    ),
                    comboErrors.comboName &&
                      React.createElement("div", { style: { color: C.danger, fontSize: 11.5 } }, comboErrors.comboName),
                  ),
                  React.createElement(
                    "div",
                    { style: { flex: "1 1 160px", minWidth: 0 } },
                    React.createElement(
                      Field,
                      { label: tr("Combo Type"), hint: "optional" },
                      React.createElement(TextInput, {
                        value: comboType,
                        onChange: (value) => setComboType(value),
                        placeholder: tr("E.g. Business, Education..."),
                      }),
                    ),
                  ),
                ),
                React.createElement(
                  "div",
                  { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 } },
                  React.createElement(
                    "div",
                    { style: { gridColumn: "span 2" } },
                    React.createElement(
                      Field,
                      { label: tr("Combo Subtotal"), required: true },
                      React.createElement(
                        "div",
                        { style: { display: "flex", gap: 8 } },
                        React.createElement(
                          "div",
                          { style: { flex: 1, minWidth: 0 } },
                          React.createElement(MoneyInput, {
                            value: comboSubTotal,
                            onChange: setComboSubTotal,
                            currency: selectedComboCurrency,
                          }),
                        ),
                        React.createElement(
                          "div",
                          { style: { width: 130, flexShrink: 0 } },
                          React.createElement(
                            "select",
                            {
                              value: comboCurrencyId || "",
                              onChange: (e) => setComboCurrencyId(e.target.value || ""),
                              style: { ...inputStyle, height: 38 },
                            },
                            React.createElement("option", { value: "" }, tr("Currency")),
                            currencies.map((item) =>
                              React.createElement("option", { key: item.id, value: item.id }, currencySelectLabel(item)),
                            ),
                          ),
                        ),
                      ),
                      comboErrors.comboCurrencyId &&
                        React.createElement("div", { style: { color: C.danger, fontSize: 11.5, marginTop: 4 } }, comboErrors.comboCurrencyId),
                      comboItems.length > 0 &&
                        (() => {
                          const originalTotal = comboItems.reduce(
                            (sum, it) => sum + parseNum(it.basePrice) * Math.max(1, parseInt(it.quantity, 10) || 1),
                            0,
                          );
                          const delta = parseNum(comboSubTotal) - originalTotal;
                          return React.createElement(
                            "div",
                            { style: { marginTop: 6, fontSize: 11.5, color: C.sub, display: "flex", flexWrap: "wrap", gap: 6 } },
                            React.createElement("span", null, tr("Individual price: {0}", { 0: formatMoneyByCurrency(originalTotal, selectedComboCurrency) })),
                            delta < 0 &&
                              React.createElement("span", { style: { color: "#52c41a", fontWeight: 600 } }, tr("Discount {0}", { 0: formatMoneyByCurrency(-delta, selectedComboCurrency) })),
                            delta > 0 &&
                              React.createElement("span", { style: { color: "#faad14", fontWeight: 600 } }, tr("Increase {0}", { 0: formatMoneyByCurrency(delta, selectedComboCurrency) })),
                          );
                        })(),
                    ),
                  ),
                  React.createElement(
                    Field,
                    { label: tr("VAT %") },
                    React.createElement(PercentInput, { value: comboVatRate, onChange: setComboVatRate }),
                  ),
                ),
                React.createElement(
                  "div",
                  { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 } },
                  React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: C.text, fontFamily: FONT } }, tr("Services in package ({0})", { 0: comboItems.length })),
                  React.createElement(
                    "div",
                    { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
                    AntSelect
                      ? React.createElement(AntSelect, {
                          showSearch: true,
                          allowClear: false,
                          value: comboItemPick || undefined,
                          placeholder: tr("+ Add existing service..."),
                          optionFilterProp: "label",
                          style: { width: 240 },
                          onSelect: (value) => {
                            const svc = comboAvailableCatalogItems.find(
                              (s) => String(serviceOptionServiceId(s)) === String(value),
                            );
                            if (svc) addComboCatalogItem(svc);
                          },
                          options: comboAvailableCatalogItems.map((s) => ({
                            value: String(serviceOptionServiceId(s)),
                            label: serviceCatalogName(s),
                          })),
                        })
                      : null,
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        onClick: addComboCustomItem,
                        style: {
                          border: `1px dashed ${C.primary}`,
                          background: "#fff",
                          color: C.primary,
                          borderRadius: 6,
                          padding: "6px 12px",
                          cursor: "pointer",
                          fontSize: 12.5,
                          fontWeight: 600,
                          fontFamily: FONT,
                          whiteSpace: "nowrap",
                        },
                      },
                      tr("+ New service"),
                    ),
                  ),
                ),
                comboErrors.items &&
                  React.createElement("div", { style: { color: C.danger, fontSize: 12 } }, comboErrors.items),
                comboItems.length === 0
                  ? React.createElement(
                      "div",
                      {
                        style: {
                          border: `1px dashed ${C.border}`,
                          background: C.bgSoft,
                          borderRadius: 8,
                          padding: "20px 14px",
                          textAlign: "center",
                          color: C.sub,
                          fontSize: 12.5,
                          fontFamily: FONT,
                        },
                      },
                      tr("No services yet — add one from the list or create a new one."),
                    )
                  : renderComboItemsTable(),
              ),
            ),
            React.createElement(
              "label",
              {
                style: {
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: 6,
                  background: "#e6f4ff",
                  border: "1px solid #91caff",
                  cursor: "pointer",
                  fontSize: 12.5,
                  color: C.text,
                  margin: "0 32px 14px",
                },
              },
              React.createElement("input", {
                type: "checkbox",
                checked: comboSaveToCatalog,
                onChange: (e) => setComboSaveToCatalog(e.target.checked),
                style: { marginTop: 2, cursor: "pointer" },
              }),
              React.createElement(
                "span",
                null,
                tr("Also save this combo to the shared catalog (created only if you finish creating this contract). All custom services in it are saved too — services already in the catalog are simply reused."),
              ),
            ),
            React.createElement(
              "div",
              {
                style: {
                  padding: "16px 32px",
                  borderTop: `1px solid #f3f4f6`,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 12,
                  background: C.bgSoft,
                  flexShrink: 0,
                },
              },
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => setComboTab("select"),
                  style: {
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    background: "#fff",
                    color: C.text,
                    padding: "9px 24px",
                    fontSize: 13,
                    fontFamily: FONT,
                    cursor: "pointer",
                  },
                },
                tr("Back"),
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: handleApplyAdhocCombo,
                  disabled: comboApplying,
                  style: {
                    border: "none",
                    borderRadius: 6,
                    background: comboApplying ? "#9ca3af" : C.primary,
                    color: "#fff",
                    padding: "9px 28px",
                    fontSize: 13,
                    fontWeight: 800,
                    fontFamily: FONT,
                    cursor: comboApplying ? "not-allowed" : "pointer",
                  },
                },
                comboApplying ? tr("Applying...") : tr("Submit"),
              ),
            ),
          );

        const [breakdownOpen, setBreakdownOpen] = useState(false);
        const [exchangeRates, setExchangeRates] = useState([]);
        // Separate from `exchangeRates` above (which is cleared to [] while in
        // package mode — see its own effect's `if (packageMode ...)` guard,
        // since it exists only to convert LINE-mode rows across currencies).
        // Combo pricing comparisons ("Giá lẻ" vs "Giá combo") need rates
        // regardless of pricing mode, and a combo's own serviceComboItems can
        // each be snapshotted in a different currency than the combo itself —
        // this keeps rates for every such currency, always converting to VND
        // (the universal settlement currency for combo pricing in this form).
        const vndCurrency = useMemo(() => findDefaultCurrency(currencies), [currencies]);
        const vndCurrencyId = extractCurrencyId(vndCurrency);
        const [comboRatesVnd, setComboRatesVnd] = useState([]);
        const comboCurrencyIdsNeedingRate = combos
          .flatMap((c) => [
            extractCurrencyId(c.currencyId),
            ...(c.serviceComboItems || []).map((it) => extractCurrencyId(it.currencyId)),
          ])
          .filter((id) => id && id !== vndCurrencyId);
        const comboCurrencyIdsKey = Array.from(new Set(comboCurrencyIdsNeedingRate)).sort((a, b) => a - b).join(",");
        useEffect(() => {
          let alive = true;
          if (!vndCurrencyId || !comboCurrencyIdsKey) {
            setComboRatesVnd([]);
            return () => { alive = false; };
          }
          const ids = comboCurrencyIdsKey.split(",").map((id) => parseInt(id, 10));
          fetchExchangeRatesForConversion(ids, vndCurrencyId)
            .then((rows) => { if (alive) setComboRatesVnd(rows || []); })
            .catch(() => { if (alive) setComboRatesVnd([]); });
          return () => { alive = false; };
        }, [vndCurrencyId, comboCurrencyIdsKey]);
        // Synchronous VND conversion for combo price comparisons, using
        // whatever rates are already cached — no network round-trip per render.
        const convertComboAmountToVndSync = (amount, currencyId) => {
          const amt = parseNum(amount);
          if (!amt) return { value: 0, ok: true };
          const cur = findCurrencyById(currencies, currencyId) || vndCurrency;
          const curId = extractCurrencyId(cur);
          if (!curId || curId === vndCurrencyId) return { value: amt, ok: true };
          const matched = pickConversionRate(comboRatesVnd, cur, vndCurrency);
          return matched?.rate > 0 ? { value: amt * matched.rate, ok: true } : { value: 0, ok: false };
        };
        const preliminarySummary = useMemo(
          () =>
            buildContractFinancialSummary({
              rows,
              currencies,
              baseCurrency: defaultCurrency,
              packageMode,
              packageTotals,
              pricingDate,
            }),
          [rows, currencies, defaultCurrency, packageMode, packageTotals, pricingDate],
        );
        const rateCurrencyIds = useMemo(
          () =>
            getConversionSourceCurrencyIds(
              preliminarySummary.groups,
              defaultCurrency,
            ),
          [preliminarySummary.groups, defaultCurrency],
        );
        const rateCurrencyKey = rateCurrencyIds
          .slice()
          .sort((a, b) => a - b)
          .join(",");
        useEffect(() => {
          let alive = true;
          if (packageMode || !rateCurrencyIds.length) {
            setExchangeRates([]);
            return () => {
              alive = false;
            };
          }
          fetchExchangeRatesForConversion(
            rateCurrencyIds,
            extractCurrencyId(defaultCurrency),
          )
            .then((r) => {
              if (alive) setExchangeRates(r || []);
            })
            .catch(() => {
              if (alive) setExchangeRates([]);
            });
          return () => {
            alive = false;
          };
        }, [packageMode, rateCurrencyKey, defaultCurrencyId]);
        const financialSummary = useMemo(
          () =>
            buildContractFinancialSummary({
              rows,
              currencies,
              baseCurrency: defaultCurrency,
              exchangeRates,
              packageMode,
              packageTotals,
              pricingDate,
            }),
          [
            rows,
            currencies,
            defaultCurrency,
            exchangeRates,
            packageMode,
            packageTotals,
            pricingDate,
          ],
        );
        const hasMixedCurrencies = !packageMode && financialSummary.groups.length > 1;
        const needsConversion =
          !packageMode &&
          financialSummary.groups.some(
            (group) => !isSameCurrency(group.currency, defaultCurrency),
          );
        const canShowTotals = packageMode || financialSummary.converted.canConvert;
        // Report the converted total (what the footer shows) to the form, so
        // the contract's Total amount follows it — see convertedTotalsPatch.
        // Keyed on the rounded figures: fires when the services' total
        // actually changes, not on every render, so a hand-typed Total amount
        // survives edits that don't change the services total.
        const convertedTotalsKey = [
          packageMode ? 1 : 0,
          financialSummary.converted.canConvert ? 1 : 0,
          (rows || []).length,
          roundAmount(financialSummary.converted.subTotal),
          roundAmount(financialSummary.converted.vatAmount),
          roundAmount(financialSummary.converted.totalAmount),
          pricingDate || "",
        ].join("|");
        useEffect(() => {
          if (!onConvertedTotalsChange) return;
          onConvertedTotalsChange({
            packageMode,
            canConvert: financialSummary.converted.canConvert,
            rowCount: (rows || []).length,
            subTotal: financialSummary.converted.subTotal,
            vatAmount: financialSummary.converted.vatAmount,
            totalAmount: financialSummary.converted.totalAmount,
          });
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [convertedTotalsKey]);
        const getRowConversion = (rowCurrency, amounts) => {
          if (isSameCurrency(rowCurrency, defaultCurrency)) {
            return { sameCurrency: true, canConvert: true, ...amounts };
          }
          const matched = pickConversionRate(
            exchangeRates,
            rowCurrency,
            defaultCurrency,
            pricingDate,
          );
          if (!matched?.rate) return { sameCurrency: false, canConvert: false };
          return {
            sameCurrency: false,
            canConvert: true,
            rate: matched.rate,
            ...convertLinesToBase([amounts], matched.rate),
          };
        };
        const filteredServices = useMemo(() => {
          const q = normalizeSearch(search).trim();
          return services
            .filter((service) => {
              if (!q) return true;
              return (
                normalizeSearch(serviceCatalogName(service)).includes(q) ||
                normalizeSearch(serviceCatalogType(service)).includes(q) ||
                normalizeSearch(serviceCatalogDescription(service)).includes(q)
              );
            })
            .slice(0, 80);
        }, [services, search]);
        const headerStyle = {
          padding: "11px 14px",
          background: "#fbfcfd",
          color: C.sub,
          fontSize: 12,
          fontWeight: 600,
          borderBottom: `1px solid ${C.border}`,
        };
        const cellStyle = {
          padding: "12px 14px",
          minWidth: 0,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          minHeight: packageMode ? 76 : 84,
          boxSizing: "border-box",
        };
        // Simple stacked-row totals summary — matches CaseCreateForm.js's
        // renderSingleTotalsSummary (single column, label left / value right,
        // dashed row dividers, bold green final row) instead of the old 3-column
        // boxed grid.
        const summaryRowStyle = (withBorder) => ({
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
          padding: "5px 0",
          borderBottom: withBorder ? `1px dashed ${C.border}` : "none",
        });
        const summaryLabelStyle = (bold) => ({
          fontSize: bold ? 14 : 13,
          color: bold ? C.text : C.sub,
          fontWeight: bold ? 700 : 400,
          fontFamily: FONT,
          whiteSpace: "nowrap",
          flexShrink: 0,
        });
        const summaryValueStyle = (color, bold) => ({
          fontSize: bold ? 18 : 13.5,
          color,
          fontWeight: bold ? 700 : 600,
          fontFamily: FONT,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        });
        const serviceNameKey = (value) =>
          normalizeSearch(value).replace(/\s+/g, " ").trim();
        const normalizedNewServiceName = serviceNameKey(newService.serviceName);
        const duplicateCatalogService =
          normalizedNewServiceName &&
          services.find(
            (service) =>
              serviceNameKey(serviceCatalogName(service)) ===
              normalizedNewServiceName,
          );
        const duplicateManualRow =
          normalizedNewServiceName &&
          rows.find(
            (row) =>
              row.id !== pickerRowId &&
              serviceNameKey(row.serviceName) === normalizedNewServiceName,
          );
        const duplicateNewService = duplicateCatalogService || duplicateManualRow;

        const resetCreateForm = () => {
          setNewService({
            serviceName: "",
            serviceType: "",
            currencyId: defaultCurrencyId ? String(defaultCurrencyId) : "",
            basePrice: "",
            description: "",
            saveToCatalog: false,
          });
          setCreateError("");
          setShowAdd(false);
        };

        // "__new__" = the picker was opened via the top-level "+ Add service"
        // button (or a combo section's own "+ Add service" action) rather than by
        // clicking an existing row's service cell — a brand-new row is appended
        // directly instead of mutating an existing row in place.
        const openTopLevelPicker = () => {
          setAddToComboTarget(
            pricingMode === "package" && comboTargets.length ? comboTargets[comboTargets.length - 1].key : null,
          );
          openPicker(NEW_ROW_SENTINEL);
        };
        const openPicker = (rowId) => {
          setPickerRowId(rowId);
          setSearch("");
          resetCreateForm();
          setMode("individual");
          setComboTab("select");
        };

        const closePicker = () => {
          setPickerRowId(null);
          setComboAddInstanceId(null);
          setAddToComboTarget(null);
          setSearch("");
          resetCreateForm();
          setMode("individual");
          setComboTab("select");
          setComboName("");
          setComboType("");
          setComboSaveToCatalog(false);
          setComboSubTotal(0);
          setComboVatRate(0);
          setComboItems([]);
          setComboErrors({});
        };

        const buildCatalogServicePayload = (service) => {
          const serviceCurrency = currencyFromRecordOptional(
            service,
            currencies,
            selectedCurrency || defaultCurrency,
          );
          const serviceCurrencyId =
            extractCurrencyId(serviceCurrency) ||
            getRecordCurrencyId(service) ||
            defaultCurrencyId;
          return {
            serviceId: String(serviceOptionServiceId(service)),
            serviceName: serviceCatalogName(service),
            serviceType: serviceCatalogType(service) || "",
            description: serviceCatalogDescription(service) || "",
            currencyId: serviceCurrencyId,
            currency: serviceCurrency,
            basePrice: serviceCatalogPrice(service),
          };
        };

        const selectService = (service) => {
          if (!service) return;
          if (pickerRowId === NEW_ROW_SENTINEL) {
            const payload = buildCatalogServicePayload(service);
            if (findDuplicateServiceRow(rows, payload)) {
              message.warning(tr("This service is already added."));
              return;
            }
            if (comboAddInstanceId) {
              onAddServiceToCombo?.(comboAddInstanceId, payload);
            } else if (addToComboTarget && pricingMode === "package") {
              onAddServiceToCombo?.(addToComboTarget, payload);
            } else {
              onAddFromService?.(payload);
            }
            closePicker();
            return;
          }
          if (!currentRow) return;
          const serviceId = String(serviceOptionServiceId(service));
          const isUsed = rows.some(
            (row) => row.id !== currentRow.id && String(row.serviceId) === serviceId,
          );
          if (isUsed) {
            message.warning(tr("This service is already selected in another row."));
            return;
          }
          onSelectService(currentRow.id, serviceId, service);
          closePicker();
        };

        const handleCreateService = async () => {
          if (!newService.serviceName.trim()) {
            setCreateError(tr("Please enter service name."));
            return;
          }
          if (parseNum(newService.basePrice) <= 0) {
            setCreateError(tr("Please enter unit price greater than 0."));
            return;
          }
          if (currencyOptions.length && !extractCurrencyId(newService.currencyId)) {
            setCreateError(tr("Please select currency."));
            return;
          }
          if (duplicateNewService) {
            setCreateError(
              duplicateCatalogService
                ? tr("This service already exists in the catalog. Please select it instead.")
                : tr("This service is already added in another row."),
            );
            return;
          }
          if (pickerRowId === NEW_ROW_SENTINEL) {
            const payload = {
              serviceId: null,
              serviceName: newService.serviceName.trim(),
              serviceType: newService.serviceType.trim(),
              description: newService.description.trim(),
              currencyId: extractCurrencyId(newService.currencyId) || defaultCurrencyId,
              basePrice: newService.basePrice,
              saveToCatalog: !!newService.saveToCatalog && !duplicateNewService,
            };
            if (comboAddInstanceId) {
              onAddServiceToCombo?.(comboAddInstanceId, payload, true);
            } else if (addToComboTarget && pricingMode === "package") {
              onAddServiceToCombo?.(addToComboTarget, payload, true);
            } else {
              onAddFromService?.(payload, true);
            }
            closePicker();
            return;
          }
          if (!currentRow) return;
          const created = onCreateManualService?.(currentRow.id, newService);
          if (created) {
            closePicker();
          }
        };

        const renderSelectedServiceButton = (row) => {
          const typeLabel = row.serviceType || "";
          if (readOnlyServices && !row._isManualAddition) {
            return React.createElement(
              "div",
              {
                style: {
                  width: "100%",
                  height: "100%",
                  minHeight: 54,
                  border: `1px solid ${C.border}`,
                  borderRadius: 7,
                  background: C.bgSoft,
                  padding: "8px 11px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  textAlign: "left",
                  fontFamily: FONT,
                  boxSizing: "border-box",
                },
              },
              React.createElement(
                "span",
                { style: { color: C.primary, flexShrink: 0 } },
                TagIcon,
              ),
              React.createElement(
                "span",
                { style: { flex: 1, minWidth: 0 } },
                React.createElement(
                  "span",
                  {
                    style: {
                      display: "block",
                      color: C.text,
                      fontSize: 14,
                      fontWeight: 700,
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                    },
                  },
                  row.serviceName || tr("Service"),
                ),
                typeLabel &&
                  React.createElement(
                    "span",
                    {
                      style: {
                        display: "block",
                        marginTop: 2,
                        color: C.sub,
                        fontSize: 12,
                        lineHeight: "16px",
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                      },
                    },
                    typeLabel,
                  ),
              ),
            );
          }
          return React.createElement(
            "button",
            {
              type: "button",
              onClick: () => openPicker(row.id),
              style: {
                width: "100%",
                height: "100%",
                minHeight: 54,
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                background: "#fff",
                padding: "8px 11px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                textAlign: "left",
                cursor: "pointer",
                fontFamily: FONT,
                boxSizing: "border-box",
              },
            },
            React.createElement(
              "span",
              {
                style: { color: row.serviceName ? C.primary : C.sub, flexShrink: 0 },
              },
              row.serviceName ? TagIcon : SearchIcon,
            ),
            React.createElement(
              "span",
              { style: { flex: 1, minWidth: 0 } },
              React.createElement(
                "span",
                {
                  style: {
                    display: "block",
                    color: row.serviceName ? C.text : C.sub,
                    fontSize: 14,
                    fontWeight: row.serviceName ? 600 : 500,
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
                  },
                },
                row.serviceName || tr("Select service"),
              ),
              typeLabel &&
                React.createElement(
                  "span",
                  {
                    style: {
                      display: "block",
                      marginTop: 2,
                      color: C.sub,
                      fontSize: 12,
                      lineHeight: "16px",
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                    },
                  },
                  typeLabel,
                ),
            ),
            React.createElement(
              "span",
              { style: { color: C.sub, flexShrink: 0 } },
              ChevronDownIcon,
            ),
          );
        };

        const modalThStyle = (extra = {}) => ({
          padding: "10px 14px",
          fontSize: 12.5,
          fontWeight: 600,
          color: C.sub,
          background: C.bgSoft,
          borderBottom: `1px solid ${C.border}`,
          textAlign: "left",
          fontFamily: FONT,
          ...extra,
        });
        const modalTdStyle = (extra = {}) => ({
          padding: "14px 14px",
          fontSize: 13.5,
          borderBottom: `1px solid #f3f4f6`,
          verticalAlign: "middle",
          fontFamily: FONT,
          ...extra,
        });
        // One full-width grid "row" (gridColumn: 1/-1, since the services table is
        // a CSS grid, not an HTML table) rendered right before the first row of
        // each applied-combo section, so combo-derived rows are visually grouped —
        // with inline "+ Add service" (into this combo) and "Remove combo" actions.
        // Reference-only comparison against the combo's catalog definition — the
        // same figures the "Apply Combo" picker shows before applying,
        // resurfaced here so they stay visible once the package is on the
        // contract. Doesn't affect combo.originalAmount, the actual per-instance
        // amount charged.
        const getComboHeaderPriceComparison = (combo) => {
          const comboIdVal = extractId(combo?.comboId);
          if (!comboIdVal) return null;
          const catalogCombo = combos.find((c) => extractId(c.id) === comboIdVal);
          if (!catalogCombo) return null;
          const comboCurrencyIdFallback = extractCurrencyId(currencyFromRecord(catalogCombo, currencies, vndCurrency));
          // Each item can be snapshotted in its own currency (item.currencyId),
          // independent of the combo's own currency — convert every item to
          // VND before summing, so a combo mixing currencies still totals
          // correctly.
          const individualTotal = (catalogCombo.serviceComboItems || []).reduce((sum, item) => {
            const svc = item.services || {};
            const price = parseNum(item.price ?? svc.basePrice ?? svc.unitPrice ?? svc.price ?? 0);
            const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
            const itemCurrencyId = extractCurrencyId(item.currencyId) || comboCurrencyIdFallback;
            const converted = convertComboAmountToVndSync(price * qty, itemCurrencyId);
            return sum + converted.value;
          }, 0);
          const packagePrice = convertComboAmountToVndSync(
            parseNum(combo.originalAmount),
            comboCurrencyIdFallback,
          ).value;
          const savings = individualTotal - packagePrice;
          const savingsPct = individualTotal > 0 ? Math.round((savings / individualTotal) * 100) : 0;
          return {
            individualTotal,
            packagePrice,
            savings,
            savingsPct,
            currency: vndCurrency,
          };
        };

        // A package row's own basePrice is always 0 — this looks up what that one
        // line would cost standalone, from the combo catalog snapshot (matched via
        // the row's own _comboCatalogId + serviceId), purely for display.
        const getComboLineIndividualPrice = (row) => {
          // Use the applied item's snapshot first (checked before the
          // combo/id lookups below, so this also covers ad-hoc combos, which
          // have no _comboCatalogId at all) — so later catalog edits don't
          // rewrite what the user saw when selecting this combo, and
          // reloaded rows aren't left to a re-match that can silently pair
          // up the wrong item (see below).
          if (row?._comboItemSnapshot) return row._comboItemSnapshot;
          const comboIdVal = extractId(row?._comboCatalogId);
          if (!comboIdVal) return null;
          const catalogCombo = combos.find((c) => extractId(c.id) === comboIdVal);
          if (!catalogCombo) return null;
          const svcIdVal = extractId(row?.serviceId);
          // Match on the direct serviceComboItems.serviceId FK first — the
          // nested "services" relation frequently fails to resolve, and
          // matching on it.services?.id alone let two items with an
          // unresolved relation collide (both compare as undefined), silently
          // pairing this row with the WRONG item's price.
          const item = (catalogCombo.serviceComboItems || []).find(
            (it) => extractId(it.serviceId || it.services) === svcIdVal || extractId(it.services?.id) === svcIdVal,
          );
          if (!item) return null;
          const svc = item.services || {};
          return {
            price: parseNum(item.price ?? svc.basePrice ?? svc.unitPrice ?? svc.price ?? 0),
            currency: currencyFromRecord(
              item,
              currencies,
              currencyFromRecord(catalogCombo, currencies, defaultCurrency),
            ),
          };
        };

        const renderComboSectionHeader = (combo, instanceId) => {
          const priceComparison = getComboHeaderPriceComparison(combo);
          return React.createElement(
            "div",
            {
              key: `combo-header-${instanceId}`,
              style: {
                gridColumn: "1 / -1",
                padding: "10px 14px",
                background: "#f0f5ff",
                borderTop: "2px solid #91caff",
                borderBottom: "1px solid #91caff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              },
            },
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 } },
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: "#1d4ed8",
                    background: "#dbeafe",
                    padding: "2px 8px",
                    borderRadius: 10,
                    flexShrink: 0,
                  },
                },
                tr("COMBO"),
              ),
              React.createElement(
                "span",
                { style: { fontWeight: 700, color: C.text, fontSize: 13.5, overflowWrap: "anywhere" } },
                combo?.comboName || tr("Combo"),
              ),
            ),
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 } },
              combo?.convertedAmount !== undefined &&
                React.createElement(
                  "div",
                  { style: { display: "flex", alignItems: "center", gap: 6 } },
                  combo.wasConverted &&
                    React.createElement(
                      "span",
                      { style: { fontSize: 11, color: C.sub } },
                      `${combo.originalAmount.toLocaleString("vi-VN")} ${combo.currencyCode} →`,
                    ),
                  React.createElement(
                    "div",
                    { style: { width: 150 } },
                    React.createElement(MoneyInput, {
                      value: combo.convertedAmount,
                      currency: defaultCurrency,
                      onChange: (v) => onUpdateComboAmount?.(instanceId, v),
                    }),
                  ),
                ),
              priceComparison &&
                React.createElement(
                  "span",
                  { style: { fontSize: 11.5, color: C.sub } },
                  tr("Individual price: {0}", { 0: formatMoneyByCurrency(priceComparison.individualTotal, priceComparison.currency) }),
                ),
              priceComparison && priceComparison.savings > 0 &&
                React.createElement(
                  "span",
                  { style: { fontSize: 11.5, color: "#52c41a", fontWeight: 600 } },
                  tr("Save {0} ({1}%)", { 0: formatMoneyByCurrency(priceComparison.savings, priceComparison.currency), 1: priceComparison.savingsPct }),
                ),
              onAddServiceToCombo &&
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      setComboAddInstanceId(instanceId);
                      openPicker(NEW_ROW_SENTINEL);
                    },
                    title: tr("Add service to this combo"),
                    style: {
                      border: `1px dashed ${C.primary}`,
                      background: "#fff",
                      color: C.primary,
                      borderRadius: 5,
                      padding: "2px 9px",
                      cursor: "pointer",
                      fontSize: 11.5,
                      fontWeight: 600,
                      fontFamily: FONT,
                    },
                  },
                  tr("+ Add service"),
                ),
              onRemoveCombo &&
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => onRemoveCombo(instanceId),
                    title: tr("Remove this combo"),
                    style: {
                      border: `1px solid ${C.danger}`,
                      background: "#fff",
                      color: C.danger,
                      borderRadius: 5,
                      padding: "2px 9px",
                      cursor: "pointer",
                      fontSize: 11.5,
                      fontWeight: 600,
                      fontFamily: FONT,
                    },
                  },
                  tr("× Remove combo"),
                ),
            ),
          );
        };

        const modalButtonStyle = {
          border: "none",
          borderRadius: 6,
          background: C.primary,
          color: "#fff",
          padding: "7px 15px",
          fontSize: 12.5,
          fontWeight: 700,
          fontFamily: FONT,
          cursor: "pointer",
        };

        const hasUnsavedPickerInput = () => {
          if (
            showAdd &&
            (newService.serviceName.trim() ||
              newService.serviceType.trim() ||
              newService.description.trim())
          )
            return true;
          if (
            mode === "combo" &&
            comboTab === "create" &&
            (comboName.trim() || comboType.trim() || comboItems.length > 0)
          )
            return true;
          return false;
        };
        const requestClosePicker = () => {
          if (hasUnsavedPickerInput()) {
            showDiscardConfirm(() => closePicker());
          } else {
            closePicker();
          }
        };

        const pickerModal =
          pickerRowId &&
          React.createElement(
            "div",
            {
              style: {
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.42)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1200,
                padding: 18,
                boxSizing: "border-box",
              },
              onClick: requestClosePicker,
            },
            React.createElement(
              "div",
              {
                style: {
                  background: "#fff",
                  borderRadius: 12,
                  width: "100%",
                  maxWidth:
                    mode === "combo"
                      ? comboTab === "create"
                        ? 860
                        : 960
                      : showAdd
                        ? 704
                        : 944,
                  maxHeight: "88vh",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 18px 54px rgba(15,23,42,0.22)",
                  overflow: "hidden",
                },
                onClick: (e) => e.stopPropagation(),
              },
              React.createElement(
                "div",
                {
                  style: {
                    padding: "18px 26px",
                    borderBottom: `1px solid ${C.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexShrink: 0,
                  },
                },
                React.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      minWidth: 0,
                    },
                  },
                  mode === "individual" &&
                    showAdd &&
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          setShowAdd(false);
                          setCreateError("");
                        },
                        style: {
                          border: "none",
                          borderRadius: 6,
                          background: C.bgSoft,
                          color: C.primary,
                          padding: "6px 10px",
                          fontSize: 13,
                          fontFamily: FONT,
                          cursor: "pointer",
                        },
                      },
                      "< Back",
                    ),
                  React.createElement(
                    "span",
                    {
                      style: {
                        fontSize: 18,
                        fontWeight: 500,
                        color: C.text,
                        fontFamily: FONT,
                      },
                    },
                    mode === "combo"
                      ? comboTab === "create"
                        ? tr("New Combo")
                        : tr("Select Combo")
                      : showAdd
                        ? tr("Create New Service")
                        : tr("Select Service"),
                  ),
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: requestClosePicker,
                    style: {
                      border: "none",
                      background: "transparent",
                      color: C.sub,
                      fontSize: 18,
                      fontFamily: FONT,
                      cursor: "pointer",
                      padding: 0,
                    },
                  },
                  tr("Close"),
                ),
              ),
              pickerRowId === NEW_ROW_SENTINEL &&
                !comboAddInstanceId &&
                mode === "individual" &&
                addToComboTarget &&
                React.createElement(
                  "div",
                  {
                    style: {
                      padding: "10px 26px",
                      borderBottom: `1px solid ${C.border}`,
                      background: C.bgSoft,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                      flexShrink: 0,
                    },
                  },
                  React.createElement(
                    "span",
                    { style: { fontSize: 13, fontWeight: 600, color: C.text } },
                    tr("Add to combo:"),
                  ),
                  React.createElement(
                    "select",
                    {
                      value: addToComboTarget,
                      onChange: (e) => setAddToComboTarget(e.target.value),
                      style: { ...inputStyle, width: "auto", minWidth: 220, maxWidth: "100%" },
                    },
                    comboTargets.map((target) =>
                      React.createElement("option", { key: target.key, value: target.key }, target.name),
                    ),
                  ),
                  React.createElement(
                    "span",
                    { style: { fontSize: 12, color: C.sub } },
                    tr("Combo pricing keeps every service inside a combo."),
                  ),
                ),
              pickerRowId === NEW_ROW_SENTINEL &&
                !comboAddInstanceId &&
                React.createElement(
                  "div",
                  {
                    style: {
                      padding: "10px 26px",
                      borderBottom: `1px solid ${C.border}`,
                      background: "#fff",
                      flexShrink: 0,
                      display: "flex",
                      gap: 8,
                    },
                  },
                  [
                    ["individual", tr("Line pricing")],
                    ["combo", tr("Combo pricing")],
                  ].map(([m, label]) =>
                    AntButton
                      ? React.createElement(
                          AntButton,
                          {
                            key: m,
                            type: mode === m ? "primary" : "default",
                            onClick: () => setMode(m),
                          },
                          label,
                        )
                      : React.createElement(
                          "button",
                          {
                            key: m,
                            type: "button",
                            onClick: () => setMode(m),
                            style: {
                              border: `1px solid ${mode === m ? C.primary : C.border}`,
                              background: mode === m ? C.primary : "#fff",
                              color: mode === m ? "#fff" : C.text,
                              borderRadius: 6,
                              padding: "8px 13px",
                              fontSize: 13,
                              fontWeight: 600,
                              fontFamily: FONT,
                              cursor: "pointer",
                            },
                          },
                          label,
                        ),
                  ),
                ),
              mode === "individual" &&
              (!showAdd
                ? React.createElement(
                    React.Fragment,
                    null,
                    React.createElement(
                      "div",
                      {
                        style: {
                          padding: "16px 26px",
                          borderBottom: `1px solid #f3f4f6`,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          flexShrink: 0,
                        },
                      },
                      React.createElement("input", {
                        autoFocus: true,
                        value: search,
                        onChange: (e) => setSearch(e.target.value),
                        placeholder: tr("Search service name..."),
                        onFocus: focus,
                        onBlur: blur,
                        style: { ...inputStyle, flex: 1, minWidth: 0, height: 44 },
                      }),
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          onClick: () => {
                            setShowAdd(true);
                            setCreateError("");
                          },
                          style: {
                            border: "none",
                            borderRadius: 7,
                            background: C.primary,
                            color: "#fff",
                            padding: "0 20px",
                            height: 44,
                            fontSize: 13,
                            fontWeight: 500,
                            fontFamily: FONT,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          },
                        },
                        tr("Create new"),
                      ),
                    ),
                    React.createElement(
                      "div",
                      { style: { overflowY: "auto", overflowX: "auto", flex: 1, minHeight: 220 } },
                      React.createElement(
                        "table",
                        {
                          style: {
                            width: "100%",
                            minWidth: 680,
                            borderCollapse: "collapse",
                            tableLayout: "fixed",
                          },
                        },
                        React.createElement(
                          "thead",
                          null,
                          React.createElement(
                            "tr",
                            null,
                            React.createElement(
                              "th",
                              {
                                style: modalThStyle({
                                  width: 42,
                                  textAlign: "center",
                                }),
                              },
                              "#",
                            ),
                            React.createElement(
                              "th",
                              { style: modalThStyle() },
                              tr("Service Name"),
                            ),
                            React.createElement(
                              "th",
                              { style: modalThStyle({ width: 180 }) },
                              tr("Type"),
                            ),
                            React.createElement(
                              "th",
                              {
                                style: modalThStyle({
                                  width: 170,
                                  textAlign: "right",
                                }),
                              },
                              tr("Unit Price"),
                            ),
                            React.createElement(
                              "th",
                              {
                                style: modalThStyle({
                                  width: 104,
                                  textAlign: "center",
                                }),
                              },
                              "",
                            ),
                          ),
                        ),
                        React.createElement(
                          "tbody",
                          null,
                          filteredServices.length
                            ? filteredServices.map((service, index) => {
                                const serviceId = String(
                                  serviceOptionServiceId(service),
                                );
                                const serviceName = serviceCatalogName(service);
                                const serviceType = serviceCatalogType(service);
                                const description =
                                  serviceCatalogDescription(service);
                                const price = serviceCatalogPrice(service);
                                const serviceCurrency = serviceCatalogCurrency(
                                  service,
                                  currencies,
                                  defaultCurrency,
                                );
                                const isUsed =
                                  selectedServiceIds.includes(serviceId) &&
                                  String(currentRow?.serviceId || "") !== serviceId;
                                const isCurrent =
                                  String(currentRow?.serviceId || "") === serviceId;
                                return React.createElement(
                                  "tr",
                                  {
                                    key: serviceId || index,
                                    onClick: () => !isUsed && selectService(service),
                                    style: {
                                      background: isCurrent
                                        ? "#eef4fb"
                                        : index % 2 === 0
                                          ? "#fff"
                                          : "#fafafa",
                                      cursor: isUsed ? "not-allowed" : "pointer",
                                      opacity: isUsed ? 0.5 : 1,
                                    },
                                  },
                                  React.createElement(
                                    "td",
                                    {
                                      style: modalTdStyle({
                                        textAlign: "center",
                                        color: C.sub,
                                        fontSize: 12,
                                      }),
                                    },
                                    index + 1,
                                  ),
                                  React.createElement(
                                    "td",
                                    {
                                      style: modalTdStyle({
                                        fontWeight: 700,
                                        color: C.text,
                                      }),
                                    },
                                    React.createElement(
                                      "div",
                                      { style: { lineHeight: "19px" } },
                                      serviceName,
                                    ),
                                    description &&
                                      React.createElement(
                                        "div",
                                        {
                                          style: {
                                            marginTop: 4,
                                            color: C.sub,
                                            fontSize: 12,
                                            fontWeight: 500,
                                            lineHeight: "18px",
                                          },
                                        },
                                        description,
                                      ),
                                  ),
                                  React.createElement(
                                    "td",
                                    { style: modalTdStyle() },
                                    serviceType
                                      ? React.createElement(
                                          "span",
                                          {
                                            style: {
                                              display: "inline-block",
                                              maxWidth: "100%",
                                              borderRadius: 10,
                                              background: C.bgSoft,
                                              color: C.text,
                                              padding: "3px 8px",
                                              fontSize: 11.5,
                                              lineHeight: "16px",
                                              overflowWrap: "anywhere",
                                            },
                                          },
                                          serviceType,
                                        )
                                      : React.createElement(
                                          "span",
                                          { style: { color: "#cbd5e1" } },
                                          "-",
                                        ),
                                  ),
                                  React.createElement(
                                    "td",
                                    {
                                      style: modalTdStyle({
                                        textAlign: "right",
                                        fontVariantNumeric: "tabular-nums",
                                        color: C.text,
                                      }),
                                    },
                                    React.createElement("div", null, formatMoneyByCurrency(price, serviceCurrency), catalogVndText(service, serviceCurrency) && React.createElement("div", { style: { fontSize: 11, color: "rgba(0, 0, 0, 0.45)", fontWeight: 400 } }, catalogVndText(service, serviceCurrency))),
                                  ),
                                  React.createElement(
                                    "td",
                                    { style: modalTdStyle({ textAlign: "center" }) },
                                    isCurrent
                                      ? React.createElement(
                                          "span",
                                          {
                                            title: tr("Selected"),
                                            style: {
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              width: 28,
                                              height: 28,
                                              borderRadius: "50%",
                                              background: C.bgSoft,
                                              border: "1px solid #bbf7d0",
                                              color: "#15803d",
                                            },
                                          },
                                          CheckIcon,
                                        )
                                      : isUsed
                                        ? React.createElement(
                                            "span",
                                            {
                                              style: {
                                                color: C.sub,
                                                fontSize: 12,
                                                fontWeight: 700,
                                              },
                                            },
                                            tr("Used"),
                                          )
                                        : React.createElement(
                                            "button",
                                            {
                                              type: "button",
                                              onClick: (e) => {
                                                e.stopPropagation();
                                                selectService(service);
                                              },
                                              style: modalButtonStyle,
                                            },
                                            tr("Select"),
                                          ),
                                  ),
                                );
                              })
                            : React.createElement(
                                "tr",
                                null,
                                React.createElement(
                                  "td",
                                  {
                                    colSpan: 5,
                                    style: modalTdStyle({
                                      textAlign: "center",
                                      color: C.sub,
                                      padding: "42px 12px",
                                    }),
                                  },
                                  React.createElement(
                                    "div",
                                    {
                                      style: {
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: 8,
                                      },
                                    },
                                    React.createElement(
                                      "div",
                                      null,
                                      tr("No services found"),
                                    ),
                                    React.createElement(
                                      "button",
                                      {
                                        type: "button",
                                        onClick: () => setShowAdd(true),
                                        style: {
                                          border: "none",
                                          background: "transparent",
                                          color: C.primary,
                                          cursor: "pointer",
                                          fontSize: 12,
                                          textDecoration: "underline",
                                          fontFamily: FONT,
                                        },
                                      },
                                      tr("Create now"),
                                    ),
                                  ),
                                ),
                              ),
                        ),
                      ),
                    ),
                    React.createElement(
                      "div",
                      {
                        style: {
                          padding: "14px 26px",
                          borderTop: `1px solid ${C.border}`,
                          display: "flex",
                          justifyContent: "flex-end",
                          flexShrink: 0,
                          background: "#fff",
                        },
                      },
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          onClick: requestClosePicker,
                          style: {
                            border: `1px solid ${C.border}`,
                            borderRadius: 6,
                            background: "#fff",
                            color: C.sub,
                            padding: "8px 22px",
                            fontSize: 13,
                            fontFamily: FONT,
                            cursor: "pointer",
                          },
                        },
                        tr("Close"),
                      ),
                    ),
                  )
                : React.createElement(
                    React.Fragment,
                    null,
                    React.createElement(
                      "div",
                      {
                        style: {
                          overflowY: "auto",
                          flex: 1,
                          padding: "24px 32px 18px",
                        },
                      },
                      React.createElement(
                        "div",
                        { style: { display: "grid", gap: 16 } },
                        React.createElement(
                          "div",
                          { style: { display: "flex", flexWrap: "wrap", gap: 16 } },
                          React.createElement(
                            "div",
                            { style: { flex: "2 1 200px", minWidth: 0 } },
                            React.createElement(
                              Field,
                              { label: tr("Service Name"), required: true },
                              React.createElement(TextInput, {
                                value: newService.serviceName,
                                onChange: (value) => {
                                  setNewService((prev) => ({
                                    ...prev,
                                    serviceName: value,
                                  }));
                                  setCreateError("");
                                },
                                placeholder: tr("e.g., Labor contract consulting..."),
                              }),
                            ),
                          ),
                          React.createElement(
                            "div",
                            { style: { flex: "1 1 160px", minWidth: 0 } },
                            React.createElement(
                              Field,
                              { label: tr("Service Type"), hint: "optional" },
                              React.createElement(TextInput, {
                                value: newService.serviceType,
                                onChange: (value) =>
                                  setNewService((prev) => ({
                                    ...prev,
                                    serviceType: value,
                                  })),
                                placeholder: tr("e.g., Consulting, Legal..."),
                              }),
                            ),
                          ),
                        ),
                        React.createElement(
                          Field,
                          { label: tr("Unit Price"), required: true },
                          React.createElement(
                            "div",
                            { style: { display: "flex", gap: 8 } },
                            React.createElement(
                              "div",
                              { style: { flex: 1, minWidth: 0 } },
                              React.createElement(MoneyInput, {
                                value: newService.basePrice,
                                onChange: (value) => {
                                  setNewService((prev) => ({
                                    ...prev,
                                    basePrice: value,
                                  }));
                                  setCreateError("");
                                },
                                currency:
                                  resolveCurrency(newService.currencyId, currencies) ||
                                  defaultCurrency,
                              }),
                            ),
                            React.createElement(
                              "div",
                              { style: { width: 130, flexShrink: 0 } },
                              React.createElement(
                                "select",
                                {
                                  value:
                                    newService.currencyId ||
                                    (defaultCurrencyId ? String(defaultCurrencyId) : ""),
                                  onChange: (e) => {
                                    setNewService((prev) => ({
                                      ...prev,
                                      currencyId: e.target.value,
                                    }));
                                    setCreateError("");
                                  },
                                  style: { ...inputStyle, height: 38 },
                                },
                                currencyOptions.length
                                  ? currencyOptions.map((option) =>
                                      React.createElement(
                                        "option",
                                        { key: option.value, value: option.value },
                                        option.label,
                                      ),
                                    )
                                  : React.createElement(
                                      "option",
                                      { value: "" },
                                      getCurrencyCode(defaultCurrency),
                                    ),
                              ),
                            ),
                          ),
                        ),
                        React.createElement(
                          Field,
                          { label: tr("Description"), hint: "optional" },
                          React.createElement(TextArea, {
                            value: newService.description,
                            onChange: (value) =>
                              setNewService((prev) => ({
                                ...prev,
                                description: value,
                              })),
                            placeholder: tr("Scope of work, notes..."),
                            rows: 4,
                          }),
                        ),
                        React.createElement(
                          "label",
                          {
                            style: {
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 8,
                              padding: "10px 12px",
                              borderRadius: 6,
                              background: "#e6f4ff",
                              border: "1px solid #91caff",
                              cursor: "pointer",
                              fontSize: 12.5,
                              color: C.text,
                            },
                          },
                          React.createElement("input", {
                            type: "checkbox",
                            checked: newService.saveToCatalog,
                            onChange: (e) =>
                              setNewService((prev) => ({
                                ...prev,
                                saveToCatalog: e.target.checked,
                              })),
                            style: { marginTop: 2, cursor: "pointer" },
                          }),
                          React.createElement(
                            "span",
                            null,
                            tr("Also save to the shared catalog (created only if you finish creating this contract)."),
                          ),
                        ),
                        duplicateNewService &&
                          React.createElement(
                            "div",
                            {
                              style: {
                                color: "#92400e",
                                background: "#fffbeb",
                                border: "1px solid #fde68a",
                                borderRadius: 6,
                                padding: "9px 11px",
                                fontSize: 12,
                              },
                            },
                            duplicateCatalogService
                              ? tr("This service already exists in the catalog. Select it from the list to avoid duplicates.")
                              : tr("This service is already added in another row."),
                          ),
                        createError &&
                          React.createElement(
                            "div",
                            {
                              style: {
                                color: C.danger,
                                fontSize: 12,
                                fontWeight: 700,
                              },
                            },
                            createError,
                          ),
                      ),
                    ),
                    React.createElement(
                      "div",
                      {
                        style: {
                          padding: "16px 32px",
                          borderTop: `1px solid #f3f4f6`,
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 12,
                          background: C.bgSoft,
                          flexShrink: 0,
                        },
                      },
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          onClick: () => {
                            setShowAdd(false);
                            setCreateError("");
                          },
                          style: {
                            border: `1px solid ${C.border}`,
                            borderRadius: 6,
                            background: "#fff",
                            color: C.text,
                            padding: "9px 24px",
                            fontSize: 13,
                            fontFamily: FONT,
                            cursor: "pointer",
                          },
                        },
                        tr("Cancel"),
                      ),
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          onClick: handleCreateService,
                          disabled: !!duplicateNewService,
                          style: {
                            border: "none",
                            borderRadius: 6,
                            background: duplicateNewService ? "#9ca3af" : C.primary,
                            color: "#fff",
                            padding: "9px 28px",
                            fontSize: 13,
                            fontWeight: 800,
                            fontFamily: FONT,
                            cursor: duplicateNewService ? "not-allowed" : "pointer",
                          },
                        },
                        tr("Save & Select"),
                      ),
                    ),
                  )
              ),
              mode === "combo" &&
                (comboTab === "select"
                  ? renderComboSelectTab()
                  : renderComboCreateTab()),
            ),
          );

        return React.createElement(
          Section,
          { title: tr("Services") },
          pickerModal,
          React.createElement(
            "div",
            {
              style: {
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                overflow: "hidden",
                background: "#fff",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
              },
            },
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  padding: "10px 12px",
                  background: "linear-gradient(180deg, #fbfdff 0%, #f5f8fc 100%)",
                  borderBottom: `1px solid ${C.border}`,
                },
              },
              React.createElement(
                "div",
                {
                  style: {
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  },
                },
                [
                  ["line", tr("Line pricing")],
                  ["package", tr("Combo pricing")],
                ].map(([mode, label]) =>
                  AntButton
                    ? React.createElement(
                        AntButton,
                        {
                          key: mode,
                          type: pricingMode === mode ? "primary" : "default",
                          onClick: () => onPricingModeChange(mode),
                        },
                        label,
                      )
                    : React.createElement(
                        "button",
                        {
                          key: mode,
                          type: "button",
                          onClick: () => onPricingModeChange(mode),
                          style: {
                            border: `1px solid ${pricingMode === mode ? C.primary : C.border}`,
                            background: pricingMode === mode ? C.primary : "#fff",
                            color: pricingMode === mode ? "#fff" : C.text,
                            borderRadius: 6,
                            padding: "8px 13px",
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: FONT,
                            cursor: "pointer",
                          },
                        },
                        label,
                      ),
                ),
              ),
              React.createElement(
                "div",
                {
                  style: {
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                  },
                },
                showAddRow &&
                  (AntButton
                    ? React.createElement(
                        AntButton,
                        { type: "dashed", onClick: openTopLevelPicker },
                        PlusIcon,
                        tr(" New service"),
                      )
                    : React.createElement(
                        "button",
                        {
                          type: "button",
                          onClick: openTopLevelPicker,
                          style: {
                            border: `1px dashed ${C.primary}`,
                            background: "#fff",
                            color: C.primary,
                            borderRadius: 6,
                            padding: "8px 12px",
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: FONT,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          },
                        },
                        PlusIcon,
                        tr("New service"),
                      )),
              ),
            ),
            React.createElement(
              "div",
              { style: { overflowX: "auto" } },
              React.createElement(
                "div",
                { style: { minWidth: 1060 } },
                React.createElement(
                  "div",
                  { style: { display: "grid", gridTemplateColumns: columns } },
                  React.createElement("div", { style: { ...headerStyle, textAlign: "center" } }, "#"),
                  React.createElement("div", { style: headerStyle }, tr("Service Name & Type")),
                  React.createElement("div", { style: headerStyle }, tr("Description")),
                  React.createElement(
                    "div",
                    { style: { ...headerStyle, textAlign: "center" } },
                    tr("Unit Price"),
                  ),
                  React.createElement(
                    "div",
                    { style: { ...headerStyle, textAlign: "center" } },
                    tr("VAT (%)"),
                  ),
                  React.createElement(
                    "div",
                    {
                      style: {
                        ...headerStyle,
                        textAlign: "right",
                        color: "#1d4ed8",
                        background: "#eef4ff",
                      },
                    },
                    tr("Total"),
                  ),
                  allowDelete &&
                    React.createElement("div", { style: headerStyle }, ""),
                ),
                rows.length
                  ? rows.map((row, rowIndex) => {
                      const rowCurrency = currencyFromRecord(
                        row,
                        currencies,
                        selectedCurrency || defaultCurrency,
                      );
                      const amounts = manualServiceLineAmounts(row, packageMode, getCurrencyDecimals(rowCurrency));
                      const rowConversion = !packageMode
                        ? getRowConversion(rowCurrency, amounts)
                        : null;
                      // Rows applied fresh in this session carry an ephemeral
                      // _comboInstanceId (see applyCombo/applyAdhocCombo). Rows
                      // loaded from an existing Case/Quotation instead carry the
                      // persisted comboId/comboName — group by whichever is
                      // present so the section header shows for both.
                      const rowComboGroupKey =
                        row._comboInstanceId || getPersistedComboGroupKey(row);
                      const prevRow = rows[rowIndex - 1];
                      const prevComboGroupKey = prevRow
                        ? prevRow._comboInstanceId ||
                          getPersistedComboGroupKey(prevRow)
                        : null;
                      const isComboSectionStart =
                        !!rowComboGroupKey && rowComboGroupKey !== prevComboGroupKey;
                      const comboSectionHeader = isComboSectionStart
                        ? renderComboSectionHeader(
                            row._comboInstanceId
                              ? appliedCombos.find(
                                  (c) => c.instanceId === row._comboInstanceId,
                                )
                              : { comboName: row.comboName },
                            rowComboGroupKey,
                          )
                        : null;
                      // Section grouping is adjacency-based (no closing marker),
                      // so a plain row landing right after a combo's last row
                      // would otherwise render with no visual boundary, reading
                      // as if it were still part of that combo above.
                      const isLeavingComboSection = !rowComboGroupKey && !!prevComboGroupKey;
                      // "#" numbers rows per section (a combo, or a run of
                      // standalone rows), as the Case form does
                      let sectionRowIndex = 1;
                      for (let j = rowIndex - 1; j >= 0; j--) {
                        const prevKey = rows[j]._comboInstanceId || getPersistedComboGroupKey(rows[j]) || null;
                        if (prevKey !== (rowComboGroupKey || null)) break;
                        sectionRowIndex++;
                      }
                      const rowElement = React.createElement(
                        "div",
                        {
                          key: row.id,
                          style: {
                            display: "grid",
                            gridTemplateColumns: columns,
                            alignItems: "stretch",
                            background: rowIndex % 2 === 0 ? "#fff" : "#fafafa",
                            transition: "background 0.12s",
                            ...(isLeavingComboSection ? { borderTop: "2px solid #91caff" } : {}),
                          },
                          onMouseEnter: (e) => {
                            e.currentTarget.style.background = "#e6f4ff";
                          },
                          onMouseLeave: (e) => {
                            e.currentTarget.style.background =
                              rowIndex % 2 === 0 ? "#fff" : "#fafafa";
                          },
                        },
                        React.createElement(
                          "div",
                          { style: { ...cellStyle, justifyContent: "center", color: C.sub, fontSize: 11.5, fontFamily: "monospace" } },
                          sectionRowIndex,
                        ),
                        React.createElement(
                          "div",
                          { style: { ...cellStyle, alignItems: "stretch" } },
                          renderSelectedServiceButton(row),
                        ),
                        React.createElement(
                          "div",
                          { style: { ...cellStyle, alignItems: "stretch" } },
                          React.createElement(TextArea, {
                            value: row.description || "",
                            style: { height: "100%" },
                            onChange: (value) =>
                              onUpdateRow(row.id, "description", value),
                            placeholder: tr("Service scope or note"),
                            rows: 2,
                          }),
                        ),
                        React.createElement(
                          "div",
                          { style: cellStyle },
                          packageMode
                            ? (() => {
                                // Same standalone-price lookup used by the Service
                                // Combo config screen's own Base Price column —
                                // shown here instead of the "Included in combo"
                                // label so the per-line discount is visible.
                                const individual = getComboLineIndividualPrice(row);
                                return React.createElement(
                                  "div",
                                  { style: { display: "flex", flexDirection: "column", gap: 2 } },
                                  individual
                                    ? React.createElement(
                                        "span",
                                        { style: { color: C.text, fontWeight: 700, fontSize: 13 } },
                                        formatMoneyByCurrency(individual.price, individual.currency),
                                      )
                                    : React.createElement(
                                        "span",
                                        { style: { color: C.primary, fontWeight: 700, fontSize: 13 } },
                                        tr("Included in combo"),
                                      ),
                                  individual &&
                                    React.createElement(
                                      "span",
                                      { style: { fontSize: 10.5, color: C.primary, fontWeight: 600 } },
                                      tr("Included in combo"),
                                    ),
                                );
                              })()
                            : React.createElement(
                                "div",
                                { style: { display: "grid", gap: 8, width: "100%" } },
                                React.createElement(MoneyInput, {
                                  value: row.basePrice,
                                  onChange: (value) =>
                                    onUpdateRow(row.id, "basePrice", value),
                                  currency: rowCurrency,
                                }),
                                currencyOptions.length > 0 &&
                                  React.createElement(
                                    "select",
                                    {
                                      value:
                                        (extractCurrencyId(row.currencyId) &&
                                          String(
                                            extractCurrencyId(row.currencyId),
                                          )) ||
                                        (extractCurrencyId(rowCurrency)
                                          ? String(extractCurrencyId(rowCurrency))
                                          : ""),
                                      onChange: (event) =>
                                        onUpdateRow(
                                          row.id,
                                          "currencyId",
                                          event.target.value,
                                        ),
                                      style: {
                                        ...inputStyle,
                                        height: 34,
                                        padding: "0 8px",
                                        fontWeight: 700,
                                        width: "100%",
                                      },
                                      title: tr("Line currency"),
                                    },
                                    currencyOptions.map((option) =>
                                      React.createElement(
                                        "option",
                                        { key: option.value, value: option.value },
                                        getCurrencyCode(
                                          resolveCurrency(option.value, currencies) ||
                                            option.label,
                                        ),
                                      ),
                                    ),
                                  ),
                              ),
                        ),
                        React.createElement(
                          "div",
                          { style: cellStyle },
                          packageMode
                            ? React.createElement(
                                "span",
                                { style: { color: C.sub, fontSize: 13 } },
                                "0%",
                              )
                            : React.createElement(PercentInput, {
                                value: row.vat,
                                onChange: (value) =>
                                  onUpdateRow(row.id, "vat", value),
                              }),
                        ),
                        React.createElement(
                          "div",
                          {
                            style: {
                              ...cellStyle,
                              flexDirection: "column",
                              alignItems: "flex-end",
                              justifyContent: "center",
                              textAlign: "right",
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#1d4ed8",
                              background: "#f5f9ff",
                              gap: 2,
                            },
                          },
                          packageMode
                            ? React.createElement(
                                "span",
                                {
                                  style: {
                                    color: C.sub,
                                    fontWeight: 500,
                                    fontSize: 13,
                                  },
                                },
                                "—",
                              )
                            : rowConversion?.canConvert
                              ? React.createElement(
                                  React.Fragment,
                                  null,
                                  React.createElement(
                                    "span",
                                    null,
                                    formatMoneyByCurrency(
                                      rowConversion.sameCurrency
                                        ? amounts.totalAmount
                                        : rowConversion.totalAmount,
                                      defaultCurrency,
                                    ),
                                  ),
                                  !rowConversion.sameCurrency &&
                                    React.createElement(
                                      "span",
                                      {
                                        style: {
                                          color: C.sub,
                                          fontSize: 10.5,
                                          fontWeight: 600,
                                        },
                                      },
                                      tr("Original: {0}", { 0: formatMoneyByCurrency(amounts.totalAmount, rowCurrency) }),
                                    ),
                                )
                              : React.createElement(
                                  React.Fragment,
                                  null,
                                  React.createElement(
                                    "span",
                                    null,
                                    formatMoneyByCurrency(
                                      amounts.totalAmount,
                                      rowCurrency,
                                    ),
                                  ),
                                  React.createElement(
                                    "span",
                                    {
                                      style: {
                                        color: "#d48806",
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                      },
                                    },
                                    tr("Missing rate to {0}", { 0: getCurrencyCode(defaultCurrency) }),
                                  ),
                                ),
                        ),
                        allowDelete &&
                          React.createElement(
                            "div",
                            { style: { ...cellStyle, textAlign: "center" } },
                            React.createElement(
                              "button",
                              {
                                type: "button",
                                onClick: () => onDeleteRow(row.id),
                                style: {
                                  border: `1px solid ${C.border}`,
                                  background: "#fff",
                                  color: C.danger,
                                  borderRadius: 6,
                                  width: 30,
                                  height: 30,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  fontWeight: 800,
                                },
                              },
                              TrashIcon,
                            ),
                          ),
                      );
                      return [comboSectionHeader, rowElement].filter(Boolean);
                    })
                  : React.createElement(
                      "div",
                      {
                        style: {
                          padding: "30px 12px",
                          textAlign: "center",
                          color: C.sub,
                          fontSize: 13,
                          borderTop: `1px solid ${C.border}`,
                        },
                      },
                      tr("No services added. Click \"New service\" to add contract services."),
                    ),
                React.createElement(
                  "div",
                  {
                    style: {
                      borderTop: `2px solid ${C.border}`,
                      padding: "14px 18px",
                      background: C.bgSoft,
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "flex-start",
                      gap: 12,
                      flexWrap: "wrap",
                    },
                  },
                  React.createElement(
                    "div",
                    {
                      style: {
                        marginRight: "auto",
                        minWidth: 180,
                        paddingTop: 3,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      },
                    },
                    !packageMode &&
                      (hasMixedCurrencies || needsConversion) &&
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          onClick: () => setBreakdownOpen(true),
                          style: {
                            border: `1px solid ${C.borderFocus}`,
                            background: "#eef4ff",
                            color: C.primary,
                            borderRadius: 6,
                            padding: "6px 12px",
                            fontSize: 12.5,
                            fontWeight: 700,
                            fontFamily: FONT,
                            cursor: "pointer",
                            alignSelf: "flex-start",
                          },
                        },
                        tr("View currency breakdown ({0} currencies)", { 0: financialSummary.groups.length }),
                      ),
                    !packageMode &&
                      !canShowTotals &&
                      React.createElement(
                        "div",
                        {
                          style: {
                            color: "#d48806",
                            background: "#fffbe6",
                            border: "1px solid #ffe58f",
                            borderRadius: 6,
                            padding: "8px 11px",
                            fontSize: 12,
                            fontFamily: FONT,
                            maxWidth: 320,
                          },
                        },
                        tr("Missing exchange rate ({0}) — the total is not final.", { 0: formatMissingRatePairs(financialSummary.missing, defaultCurrency) }),
                      ),
                  ),
                  React.createElement(
                    "div",
                    { style: { minWidth: 380 } },
                    packageMode
                      ? [
                          React.createElement(
                            "div",
                            { key: "subTotal", style: { padding: "5px 0", borderBottom: `1px dashed ${C.border}` } },
                            React.createElement(
                              "div",
                              { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24 } },
                              React.createElement("span", { style: summaryLabelStyle(false) }, tr("Combo subtotal:")),
                              React.createElement(MoneyInput, {
                                value: packageTotals.subTotal,
                                onChange: onPackageSubTotalChange,
                                currency: defaultCurrency,
                              }),
                            ),
                          ),
                          React.createElement(
                            "div",
                            { key: "vatRate", style: summaryRowStyle(true) },
                            React.createElement("span", { style: summaryLabelStyle(false) }, tr("VAT (%):")),
                            React.createElement(SuffixInput, {
                              value: packageVatRate,
                              onChange: onPackageVatRateChange,
                              suffix: "%",
                            }),
                          ),
                          React.createElement(
                            "div",
                            { key: "vatAmount", style: summaryRowStyle(true) },
                            React.createElement("span", { style: summaryLabelStyle(false) }, tr("VAT amount:")),
                            React.createElement(
                              "span",
                              { style: summaryValueStyle("#d48806", false) },
                              canShowTotals
                                ? formatMoneyByCurrency(financialSummary.converted.vatAmount, defaultCurrency)
                                : "—",
                            ),
                          ),
                          React.createElement(
                            "div",
                            { key: "total", style: summaryRowStyle(false) },
                            React.createElement("span", { style: summaryLabelStyle(true) }, tr("Combo total:")),
                            React.createElement(
                              "span",
                              { style: summaryValueStyle("#389e0d", true) },
                              canShowTotals
                                ? formatMoneyByCurrency(financialSummary.converted.totalAmount, defaultCurrency)
                                : "—",
                            ),
                          ),
                        ]
                      : [
                          [
                            tr("Subtotal (excl. VAT)"),
                            canShowTotals
                              ? formatMoneyByCurrency(financialSummary.converted.subTotal, defaultCurrency)
                              : "—",
                            C.text,
                            false,
                          ],
                          [
                            tr("VAT amount"),
                            canShowTotals
                              ? formatMoneyByCurrency(financialSummary.converted.vatAmount, defaultCurrency)
                              : "—",
                            "#d48806",
                            false,
                          ],
                          [
                            tr("Total"),
                            canShowTotals
                              ? formatMoneyByCurrency(financialSummary.converted.totalAmount, defaultCurrency)
                              : "—",
                            "#389e0d",
                            true,
                          ],
                        ].map(([label, val, color, bold], i) =>
                          React.createElement(
                            "div",
                            { key: label, style: summaryRowStyle(i < 2) },
                            React.createElement("span", { style: summaryLabelStyle(bold) }, label + ":"),
                            React.createElement("span", { style: summaryValueStyle(color, bold) }, val),
                          ),
                        ),
                  ),
                ),
              ),
            ),
          ),
          React.createElement(
            Modal,
            {
              title: tr("Currency breakdown"),
              open: breakdownOpen,
              onCancel: () => setBreakdownOpen(false),
              footer: React.createElement(AntButton, { type: "primary", onClick: () => setBreakdownOpen(false) }, tr("Close")),
              width: 900,
            },
            breakdownOpen &&
              (() => {
                const breakdown = currencyBreakdownRows(financialSummary.groups, {
                  isBase: (group) => isSameCurrency(group.currency, defaultCurrency),
                  matchOf: (group) => pickConversionRate(exchangeRates, group.currency, defaultCurrency, pricingDate),
                  codeOf: getCurrencyCode,
                  convert: convertLinesToBase,
                });
                const baseCode = getCurrencyCode(defaultCurrency);
                const right = (extra = {}) => modalTdStyle({ textAlign: "right", fontVariantNumeric: "tabular-nums", ...extra });
                return React.createElement(
                  "div",
                  null,
                  React.createElement("div", { style: { marginBottom: 12, color: C.sub, fontSize: 12.5 } }, tr("Base currency: {0}. Rates on the Signed date.", { 0: baseCode })),
                  React.createElement(
                    "div",
                    { style: { overflowX: "auto" } },
                    React.createElement(
                      "table",
                      { style: { width: "100%", minWidth: 760, borderCollapse: "collapse" } },
                      React.createElement(
                        "thead",
                        null,
                        React.createElement(
                          "tr",
                          null,
                          [tr("Currency"), tr("Original total"), tr("Rate to ") + baseCode, tr("Converted total"), tr("Effective date"), tr("Source")].map((label, i) =>
                            React.createElement("th", { key: label, style: modalThStyle({ textAlign: i === 1 || i === 2 || i === 3 ? "right" : "left" }) }, label),
                          ),
                        ),
                      ),
                      React.createElement(
                        "tbody",
                        null,
                        breakdown.map((item) =>
                          React.createElement(
                            "tr",
                            { key: item.key },
                            React.createElement("td", { style: modalTdStyle({ fontWeight: 700 }) }, `${item.currencyCode} (${item.lineCount})`),
                            React.createElement("td", { style: right({ fontWeight: 700 }) }, formatMoneyByCurrency(item.originalTotal, item.currency)),
                            React.createElement(
                              "td",
                              { style: right({ color: item.status === "missing" ? "#d48806" : C.text }) },
                              item.rate ? item.rate.toLocaleString("en-US", { maximumFractionDigits: 6 }) : tr("Missing"),
                            ),
                            React.createElement(
                              "td",
                              { style: right({ fontWeight: 800, color: item.convertedTotal === null ? C.sub : "#389e0d" }) },
                              item.convertedTotal === null ? "—" : formatMoneyByCurrency(item.convertedTotal, defaultCurrency),
                            ),
                            React.createElement("td", { style: modalTdStyle({ color: C.sub, fontSize: 12.5 }) }, item.effectiveDate ? formatDateDisplay(String(item.effectiveDate).slice(0, 10)) : "—"),
                            React.createElement("td", { style: modalTdStyle({ color: C.sub, fontSize: 12.5 }) }, item.source),
                          ),
                        ),
                      ),
                    ),
                  ),
                  financialSummary.converted.canConvert &&
                    React.createElement(
                      "div",
                      { style: { marginTop: 12, padding: "10px 12px", borderRadius: 7, background: "#f6ffed", border: "1px solid #b7eb8f", display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" } },
                      React.createElement("span", { style: { fontWeight: 700, color: C.text } }, tr("Converted total in ") + baseCode),
                      React.createElement("span", { style: { fontWeight: 800, color: "#389e0d" } }, formatMoneyByCurrency(financialSummary.converted.totalAmount, defaultCurrency)),
                    ),
                );
              })(),
          ),
        );
      };

      const PaymentScheduleSection = ({
        rows,
        baseAmount,
        currency = null,
        serviceOptions = [],
        onAddRow,
        onDeleteRow,
        onUpdateRow,
      }) => {
        // Service column widened (2026-09-21) — a multi-tagged installment
        // (e.g. 2+ services) needs more room to show its selected tags without
        // truncating, since disambiguating which installment a task should
        // link to often depends on reading which services it's tagged with.
        const columns =
          "minmax(130px, 0.7fr) minmax(200px, 0.9fr) minmax(100px, 0.5fr) minmax(260px, 1.6fr) minmax(180px, 0.85fr) minmax(160px, 0.7fr) 52px";
        const headerStyle = {
          padding: "11px 14px",
          background: "#fbfcfd",
          color: C.sub,
          fontSize: 12,
          fontWeight: 700,
          borderBottom: `1px solid ${C.border}`,
        };
        const cellStyle = {
          padding: "12px 14px",
          minWidth: 0,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          minHeight: 76,
          boxSizing: "border-box",
        };
        const iconButtonStyle = (disabled = false) => ({
          border: `1px solid ${C.border}`,
          background: "#fff",
          color: disabled ? "#cbd5e1" : C.danger,
          borderRadius: 6,
          width: 30,
          height: 30,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled ? "default" : "pointer",
          fontWeight: 800,
        });
        // Live feedback while editing — the hard block (percentages must sum
        // to exactly 100% for >1 row) still only fires at submit time in
        // validate(); this just surfaces the same rule immediately as the
        // lawyer types, instead of only after clicking submit.
        const percentageSum = rows.reduce((sum, row) => sum + parseNum(row.percentage), 0);
        const percentageOverLimit = percentageSum > 100.01;
        // What is shown per row = what is saved (cleanPaymentScheduleRows).
        const allocatedAmounts = allocateInstallmentAmounts(rows, baseAmount);
        // Not its own top-level Section (border-top + title) — rendered right
        // after "Commercial Terms" (2026-09-24), so it reads as the continuation
        // of Total amount / First payment. The Services section sits directly
        // above that, so the services each installment is tagged with are
        // still on screen. A lighter sub-heading (vs. Section's bold title)
        // still marks where the installments table starts.
        return React.createElement(
          "div",
          { style: { marginTop: 24 } },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 13,
                fontWeight: 700,
                color: C.sub,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                marginBottom: 10,
              },
            },
            tr("Payment Schedule"),
          ),
          React.createElement(
            "div",
            {
              style: {
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                overflow: "hidden",
                background: "#fff",
              },
            },
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  padding: "10px 12px",
                  background: C.bgSoft,
                  borderBottom: `1px solid ${C.border}`,
                },
              },
              React.createElement(
                "div",
                {
                  style: {
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                  },
                },
                React.createElement(
                  "span",
                  { style: { fontSize: 13, color: C.sub } },
                  tr("{0} installment{1}", { 0: rows.length, 1: rows.length === 1 ? "" : "s" }),
                ),
                rows.length > 1 &&
                  React.createElement(
                    "span",
                    {
                      style: {
                        fontSize: 13,
                        fontWeight: 700,
                        color: percentageOverLimit ? C.danger : C.sub,
                      },
                    },
                    tr("Total: {0}%{1}", { 0: percentageSum, 1: percentageOverLimit ? tr(" — exceeds 100%, please adjust") : "" }),
                  ),
              ),
              AntButton
                ? React.createElement(
                    AntButton,
                    { type: "dashed", onClick: onAddRow },
                    PlusIcon,
                    tr(" Add row"),
                  )
                : React.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: onAddRow,
                      style: {
                        border: `1px dashed ${C.primary}`,
                        background: "#fff",
                        color: C.primary,
                        borderRadius: 6,
                        padding: "8px 12px",
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: FONT,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      },
                    },
                    PlusIcon,
                    tr("Add row"),
                  ),
            ),
            React.createElement(
              "div",
              { style: { overflowX: "auto" } },
              React.createElement(
                "div",
                { style: { minWidth: 1080 } },
                React.createElement(
                  "div",
                  { style: { display: "grid", gridTemplateColumns: columns } },
                  React.createElement(
                    "div",
                    { style: headerStyle },
                    tr("Installment"),
                  ),
                  React.createElement("div", { style: headerStyle }, tr("Content")),
                  React.createElement(
                    "div",
                    { style: { ...headerStyle, textAlign: "center" } },
                    tr("% Payment"),
                  ),
                  React.createElement(
                    "div",
                    { style: headerStyle },
                    tr("Service"),
                    React.createElement(
                      "span",
                      { style: { color: C.danger, marginLeft: 3 } },
                      "*",
                    ),
                  ),
                  React.createElement(
                    "div",
                    { style: headerStyle },
                    tr("Due Date"),
                  ),
                  React.createElement(
                    "div",
                    { style: { ...headerStyle, textAlign: "center" } },
                    tr("Amount"),
                  ),
                  React.createElement("div", { style: headerStyle }, ""),
                ),
                rows.map((row, index) => {
                  const disableDelete = rows.length <= 1;
                  const amount = allocatedAmounts[index];
                  return React.createElement(
                    "div",
                    {
                      key: row.id,
                      style: {
                        display: "grid",
                        gridTemplateColumns: columns,
                        alignItems: "stretch",
                      },
                    },
                    React.createElement(
                      "div",
                      { style: cellStyle },
                      React.createElement(TextInput, {
                        value: row.installment,
                        onChange: (value) =>
                          onUpdateRow(row.id, "installment", value),
                        placeholder: tr("Installment {0}", { 0: index + 1 }),
                      }),
                    ),
                    React.createElement(
                      "div",
                      { style: cellStyle },
                      React.createElement(TextArea, {
                        value: row.content,
                        onChange: (value) => onUpdateRow(row.id, "content", value),
                        placeholder: tr("e.g. 50% upon signing"),
                        rows: 2,
                      }),
                    ),
                    React.createElement(
                      "div",
                      { style: cellStyle },
                      React.createElement(PercentInput, {
                        value: row.percentage,
                        onChange: (value) => onUpdateRow(row.id, "percentage", value),
                      }),
                    ),
                    React.createElement(
                      "div",
                      { style: cellStyle },
                      React.createElement(PaymentScheduleServiceSelect, {
                        value: row.serviceKeys,
                        onChange: (value) =>
                          onUpdateRow(row.id, "serviceKeys", value),
                        options: serviceOptions,
                      }),
                    ),
                    React.createElement(
                      "div",
                      { style: cellStyle },
                      React.createElement(TextInput, {
                        type: "datetime-local",
                        value: row.paymentDate || "",
                        onChange: (value) =>
                          onUpdateRow(row.id, "paymentDate", value),
                      }),
                    ),
                    React.createElement(
                      "div",
                      {
                        style: {
                          ...cellStyle,
                          justifyContent: "center",
                          padding: "12px 10px",
                        },
                        title: formatMoneyByCurrency(amount, currency || defaultCurrencyObject()),
                      },
                      // One line: amount + currency code never wrap (was 14px/800
                      // breaking "VND" onto its own line); an unusually long
                      // amount ends in "…" with the full value on hover.
                      React.createElement(
                        "span",
                        {
                          style: {
                            fontSize: 13,
                            fontWeight: 700,
                            color: C.text,
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            minWidth: 0,
                            maxWidth: "100%",
                          },
                        },
                        formatMoneyByCurrency(amount, currency || defaultCurrencyObject()),
                      ),
                    ),
                    React.createElement(
                      "div",
                      { style: { ...cellStyle, justifyContent: "center" } },
                      React.createElement(
                        "button",
                        {
                          type: "button",
                          disabled: disableDelete,
                          onClick: () => !disableDelete && onDeleteRow(row.id),
                          style: iconButtonStyle(disableDelete),
                        },
                        TrashIcon,
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
        );
      };

      // ---- payment-triggers section (tested by scripts/tests/payment-triggers-section.test.js) ----
      // By Service only — rendered in the slot PaymentScheduleSection uses for
      // By Case (right after "Commercial Terms"), same light sub-heading
      // convention instead of its own Section. See
      // docs/superpowers/specs/2026-09-24-by-service-payment-trigger-config-design.md §3.
      const TASK_STATUS_BADGES = {
        toDo: { label: tr("To do"), color: "#595959", bg: "#f5f5f5" },
        inProgress: { label: tr("In progress"), color: "#0958d9", bg: "#e6f4ff" },
        blocked: { label: tr("Blocked"), color: "#cf1322", bg: "#fff1f0" },
        pending: { label: tr("Pending"), color: "#d46b08", bg: "#fff7e6" },
        approval: { label: tr("Approval"), color: "#531dab", bg: "#f9f0ff" },
        done: { label: tr("Done"), color: "#389e0d", bg: "#f6ffed" },
        cancelled: { label: tr("Cancelled"), color: "#8c8c8c", bg: "#fafafa" },
      };

      // Accordion state sentinel: every service collapsed (vs. null = "not
      // chosen yet", which falls back to the default expanded service).
      const TRIGGER_NONE_EXPANDED = "__none__";

      // Inline: a one-line summary + "Configure" button. The per-service task
      // checkboxes live in a popup, as a one-column accordion (one service
      // open at a time) — keeps the contract form short even with many
      // services. Ticks apply to the form state immediately; nothing is
      // written until the contract is submitted, so the popup only has "Done".
      // Two modes (noun):
      //  - "service" (By Service): pass lines + tasksByLine; one item per
      //    service line.
      //  - "installment" (By Case, 2026-09-24): pass items =
      //    [{ key, name, groups: [{ label, tasks }] }] — one item per
      //    installment, tasks grouped by the services tagged on it — plus
      //    lockedBy(itemKey, taskId) → label of the other installment a task
      //    is already linked to (checkbox disabled), or null.
      const PaymentTriggersSection = ({
        sourceLabel,
        loading,
        error,
        lines,
        tasksByLine,
        items,
        selection,
        onToggle,
        lockedBy,
        noun = "service",
        helpText,
        // By Service + Combo pricing (2026-09-25): locked Payment Request
        // amount per service. amounts = { itemKey: number }; amountEditable
        // false = read-only (Line pricing); allocation = { sum, pool, diff,
        // ok }; amountWarnings = { itemKey: "noReference" | "small" }.
        amounts = null,
        amountEditable = false,
        onAmountChange,
        allocation = null,
        onAutoDistribute,
        amountWarnings = {},
        formatAmount,
        // rawAmounts: what the lawyer typed per key ("" allowed, so the input
        // can be cleared); amountTexts: preformatted read-only texts (Line
        // pricing — each line in its own currency).
        rawAmounts = null,
        amountTexts = null,
      }) => {
        const [open, setOpen] = useState(false);
        const [expandedKey, setExpandedKey] = useState(null);
        // Grouped modes: "installment" (By Case) and "item" (By Service +
        // Combo pricing: a combo or a standalone service).
        const isInstallment = noun === "installment" || noun === "item";
        const itemWord = tr(noun === "item" ? "item" : "installment");
        const fmtAmount = (value) =>
          formatAmount ? formatAmount(Number(value) || 0) : String(Number(value) || 0);
        const amountDisplay = (key) =>
          amountTexts && amountTexts[key] !== undefined ? amountTexts[key] : fmtAmount(amounts?.[key]);
        const allocationLine = allocation
          ? React.createElement(
              "span",
              {
                style: {
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: allocation.ok ? "#389e0d" : "#cf1322",
                  whiteSpace: "nowrap",
                },
              },
              tr("Allocated {0} / {1}", { 0: fmtAmount(allocation.sum), 1: fmtAmount(allocation.pool) }),
              allocation.ok ? " ✓" : tr(" — off by {0}", { 0: fmtAmount(allocation.diff) }),
            )
          : null;
        const allItems =
          items ||
          (lines || []).map((line) => ({
            key: line.key,
            name: line.name,
            groups: [{ label: null, tasks: tasksByLine?.[line.key] || [] }],
          }));
        const groupsOf = (key) => allItems.find((item) => item.key === key)?.groups || [];
        const tasksOf = (key) => groupsOf(key).flatMap((group) => group.tasks || []);
        const tickedOf = (key) => new Set(selection?.[key] || []);
        const withTasks = allItems.filter((item) => tasksOf(item.key).length);
        const configured = withTasks.filter((item) => tickedOf(item.key).size).length;
        const missing = withTasks.length - configured;
        const noTasks = allItems.length - withTasks.length;
        // Opens on the first item still missing a trigger — the one that
        // most likely needs attention — else the first item with tasks.
        const defaultKey = (
          withTasks.find((item) => !tickedOf(item.key).size) ||
          withTasks[0] ||
          allItems[0] ||
          {}
        ).key;
        const activeKey =
          expandedKey === TRIGGER_NONE_EXPANDED
            ? null
            : allItems.some((item) => item.key === expandedKey)
              ? expandedKey
              : defaultKey;

        const noteStyle = (tone) => ({
          marginTop: 8,
          padding: "6px 10px",
          borderRadius: 6,
          fontSize: 12.5,
          ...(tone === "warn"
            ? { color: "#ad6800", background: "#fffbe6", border: "1px solid #ffe58f" }
            : { color: C.sub, background: C.bgSoft, border: `1px dashed ${C.border}` }),
        });
        const chipStyle = (tone) => ({
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 4,
          padding: "1px 7px",
          whiteSpace: "nowrap",
          ...(tone === "warn"
            ? { color: "#ad6800", background: "#fffbe6", border: "1px solid #ffe58f" }
            : { color: C.sub, background: C.bgSoft, border: `1px solid ${C.border}` }),
        });
        const actionButton = (label, onClick, primary = false) =>
          AntButton
            ? React.createElement(AntButton, { type: primary ? "primary" : "default", onClick }, label)
            : React.createElement(
                "button",
                {
                  type: "button",
                  onClick,
                  style: {
                    border: `1px solid ${primary ? C.primary : C.border}`,
                    borderRadius: 6,
                    background: primary ? C.primary : "#fff",
                    color: primary ? "#fff" : C.text,
                    padding: "6px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: FONT,
                    cursor: "pointer",
                    flex: "0 0 auto",
                  },
                },
                label,
              );

        const renderTaskRow = (line, task, ticked) => {
          const badge = TASK_STATUS_BADGES[task.status];
          const lockedLabel =
            !ticked.has(task.id) && lockedBy ? lockedBy(line.key, task.id) : null;
          const selectable = !lockedLabel && isTriggerSelectable(task, ticked.has(task.id));
          return React.createElement(
            "label",
            {
              key: task.id,
              title: selectable
                ? undefined
                : lockedLabel
                  ? tr("Already linked to {0} — a task can trigger one {1} only.", { 0: lockedLabel, 1: noun === "service" ? tr("installment") : itemWord })
                  : tr("A cancelled task can never be Done, so it can't trigger a payment."),
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "5px 0",
                cursor: selectable ? "pointer" : "not-allowed",
                opacity: selectable ? 1 : 0.55,
                minWidth: 0,
              },
            },
            React.createElement("input", {
              type: "checkbox",
              checked: ticked.has(task.id),
              disabled: !selectable,
              onChange: (e) => onToggle(line.key, task.id, e.target.checked),
              style: { marginTop: 3, flex: "0 0 auto" },
            }),
            React.createElement(
              "span",
              { style: { flex: "1 1 auto", minWidth: 0, fontSize: 13, color: C.text, overflowWrap: "anywhere" } },
              task.title,
              lockedLabel &&
                React.createElement(
                  "span",
                  { style: { display: "block", fontSize: 11.5, color: C.sub } },
                  tr("Linked to {0}", { 0: lockedLabel }),
                ),
            ),
            badge &&
              React.createElement(
                "span",
                {
                  style: {
                    flex: "0 0 auto",
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: badge.color,
                    background: badge.bg,
                    borderRadius: 4,
                    padding: "1px 6px",
                  },
                },
                badge.label,
              ),
          );
        };

        const renderServiceItem = (line) => {
          const tasks = tasksOf(line.key);
          const ticked = tickedOf(line.key);
          const expanded = activeKey === line.key;
          const unconfigured = tasks.length > 0 && !ticked.size;
          return React.createElement(
            "div",
            {
              key: line.key,
              style: {
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                marginBottom: 8,
                overflow: "hidden",
                background: "#fff",
              },
            },
            React.createElement(
              "button",
              {
                type: "button",
                "data-trigger-line": line.key,
                "aria-expanded": expanded,
                onClick: () => setExpandedKey(expanded ? TRIGGER_NONE_EXPANDED : line.key),
                style: {
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  background: expanded ? C.bgSoft : "#fff",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: FONT,
                  minWidth: 0,
                },
              },
              React.createElement(
                "span",
                { style: { flex: "0 0 auto", color: C.sub, fontSize: 12, width: 12 } },
                expanded ? "▾" : "▸",
              ),
              React.createElement(
                "span",
                {
                  style: {
                    flex: "1 1 auto",
                    minWidth: 0,
                    fontSize: 14,
                    fontWeight: 700,
                    color: C.text,
                    overflowWrap: "anywhere",
                  },
                },
                line.name,
              ),
              React.createElement(
                "span",
                {
                  style: {
                    flex: "0 0 auto",
                    fontSize: 12.5,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    color: unconfigured ? "#ad6800" : C.sub,
                  },
                },
                tasks.length
                  ? [unconfigured ? "⚠ " : "", `${ticked.size}/${tasks.length}`]
                  : tr("No tasks"),
              ),
              amounts &&
                React.createElement(
                  "span",
                  {
                    style: {
                      flex: "0 0 auto",
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: amountWarnings[line.key] ? "#ad6800" : C.text,
                      whiteSpace: "nowrap",
                    },
                  },
                  amountDisplay(line.key),
                ),
            ),
            expanded &&
              React.createElement(
                "div",
                { style: { padding: "4px 12px 10px 32px", borderTop: `1px solid ${C.border}` } },
                amounts &&
                  React.createElement(
                    "div",
                    {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        padding: "6px 0 8px",
                        borderBottom: `1px dashed ${C.border}`,
                        marginBottom: 4,
                      },
                    },
                    React.createElement(
                      "span",
                      { style: { fontSize: 12.5, color: C.sub, fontWeight: 600 } },
                      tr("Payment Request amount"),
                    ),
                    amountEditable
                      ? React.createElement("input", {
                          type: "text",
                          inputMode: "numeric",
                          "data-amount-for": line.key,
                          value:
                            rawAmounts && rawAmounts[line.key] !== undefined
                              ? String(rawAmounts[line.key])
                              : String(amounts[line.key] ?? ""),
                          onChange: (e) =>
                            onAmountChange &&
                            onAmountChange(line.key, String(e.target.value || "").replace(/\D/g, "")),
                          style: {
                            width: 160,
                            maxWidth: "100%",
                            padding: "4px 8px",
                            border: `1px solid ${C.border}`,
                            borderRadius: 6,
                            fontSize: 13,
                            fontFamily: FONT,
                            textAlign: "right",
                          },
                        })
                      : React.createElement(
                          "span",
                          { style: { fontSize: 13, fontWeight: 700, color: C.text } },
                          amountDisplay(line.key),
                        ),
                    amountEditable &&
                      React.createElement(
                        "span",
                        { style: { fontSize: 12, color: C.sub } },
                        amountDisplay(line.key),
                        // Not typed by hand: shares the rest of the Total
                        // amount automatically (allocateWithOverrides).
                        rawAmounts && rawAmounts[line.key] === undefined ? tr(" · auto") : "",
                      ),
                    amountWarnings[line.key] &&
                      React.createElement(
                        "div",
                        { style: { ...noteStyle("warn"), marginTop: 4, width: "100%" } },
                        {
                          noReference: tr("No price reference — enter this {0}'s amount by hand.", { 0: noun === "service" ? tr("service") : itemWord }),
                          notInCase: tr("Not in the Case — its services have no tasks, so its Payment Request would stay pending."),
                          zero: tr("Amount 0 — no Payment Request will be created for this {0}.", { 0: noun === "service" ? tr("service") : itemWord }),
                          small: tr("Unusually small amount — check it before submitting."),
                        }[amountWarnings[line.key]] || tr("Check this amount before submitting."),
                      ),
                  ),
                groupsOf(line.key).map((group, groupIndex) =>
                  React.createElement(
                    "div",
                    { key: `${group.label || "group"}-${groupIndex}` },
                    group.label &&
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 12,
                            fontWeight: 700,
                            color: C.sub,
                            marginTop: groupIndex ? 8 : 4,
                            overflowWrap: "anywhere",
                          },
                        },
                        group.label,
                      ),
                    (group.tasks || []).map((task) => renderTaskRow(line, task, ticked)),
                  ),
                ),
                !tasks.length &&
                  React.createElement(
                    "div",
                    { style: noteStyle("muted") },
                    isInstallment
                      ? tr("No tasks for the services {0} this {1}.", { 0: noun === "item" ? "in" : tr("tagged on"), 1: itemWord })
                      : tr("No tasks yet — configure the trigger later in the Case / Task."),
                  ),
                unconfigured &&
                  React.createElement(
                    "div",
                    { style: noteStyle("warn") },
                    isInstallment
                      ? tr("This {0} will not be activated automatically.", { 0: itemWord })
                      : tr("This service will not create a Payment Request automatically."),
                  ),
              ),
          );
        };

        const popupBody = React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            { style: { fontSize: 12.5, color: C.sub, marginBottom: 12, lineHeight: 1.5 } },
            sourceLabel,
            ". ",
            helpText || tr("A service's Payment Request is created once ALL its ticked tasks are Done."),
          ),
          (allocationLine || onAutoDistribute) &&
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 12,
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: C.bgSoft,
                },
              },
              allocationLine,
              onAutoDistribute && actionButton(tr("Auto-distribute"), onAutoDistribute),
            ),
          allItems.map(renderServiceItem),
        );

        return React.createElement(
          "div",
          { style: { marginTop: 24 } },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 13,
                fontWeight: 700,
                color: C.sub,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                marginBottom: 8,
              },
            },
            tr("Payment Triggers"),
          ),
          loading &&
            React.createElement(
              "div",
              { style: { padding: 12, fontSize: 13, color: C.sub } },
              Spin ? React.createElement(Spin, { size: "small" }) : null,
              tr(" Loading tasks..."),
            ),
          !loading && error && React.createElement("div", { style: noteStyle("warn") }, error),
          !loading &&
            !error &&
            !allItems.length &&
            React.createElement(
              "div",
              { style: noteStyle("muted") },
              isInstallment
                ? noun === "item"
                  ? tr("Add services above to configure payment triggers.")
                  : tr("Add installments above to choose their trigger tasks.")
                : tr("Add services above to configure payment triggers."),
            ),
          // Amounts don't depend on tasks: keep the summary (allocation +
          // Configure) reachable even when tasks failed to load.
          !loading &&
            (!error || amounts) &&
            allItems.length > 0 &&
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  background: "#fff",
                  padding: "10px 14px",
                },
              },
              React.createElement(
                "div",
                { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 } },
                React.createElement(
                  "span",
                  { style: { fontSize: 13.5, fontWeight: 600, color: C.text } },
                  withTasks.length
                    ? isInstallment
                      ? tr("{0}/{1} {2}s have trigger tasks", { 0: configured, 1: withTasks.length, 2: itemWord })
                      : tr("{0}/{1} services have a payment trigger", { 0: configured, 1: withTasks.length })
                    : tr("No tasks available yet"),
                ),
                missing > 0 &&
                  React.createElement("span", { style: chipStyle("warn") }, tr("⚠ {0} without trigger", { 0: missing })),
                noTasks > 0 &&
                  React.createElement("span", { style: chipStyle("muted") }, tr("{0} with no tasks yet", { 0: noTasks })),
                allocationLine,
              ),
              actionButton(tr("Configure"), () => setOpen(true)),
            ),
          Modal
            ? React.createElement(
                Modal,
                {
                  title: tr("Payment Triggers"),
                  open,
                  onCancel: () => setOpen(false),
                  width: "min(640px, calc(100vw - 32px))",
                  destroyOnClose: false,
                  footer: actionButton(tr("Done"), () => setOpen(false), true),
                },
                popupBody,
              )
            : open && popupBody,
        );
      };
      // ---- end payment-triggers section ----

      const ContractCreateForm = () => {
        const [loading, setLoading] = useState(true);
        const [saving, setSaving] = useState(false);
        const [guideOpen, setGuideOpen] = useState(false);
        const [customers, setCustomers] = useState([]);
        const [companies, setCompanies] = useState([]);
        const [lawyers, setLawyers] = useState([]);
        const [templates, setTemplates] = useState([]);
        const [quotations, setQuotations] = useState([]);
        const [projects, setProjects] = useState([]);
        const [parentContracts, setParentContracts] = useState([]);
        const [companyServiceOptions, setCompanyServiceOptions] = useState([]);
        const [currencies, setCurrencies] = useState([]);
        const [serviceLines, setServiceLines] = useState([]);
        const [selectedServiceIds, setSelectedServiceIds] = useState([]);
        const [manualServiceRows, setManualServiceRows] = useState([]);
        // By Service "Payment Triggers" — see the helper block near
        // newPaymentScheduleRow. triggerScopeRef remembers which task universe
        // (case id / template) the current selection belongs to, so switching
        // Case resets it instead of carrying stale task ids across.
        const [triggerSource, setTriggerSource] = useState(null);
        const [triggerTasksByLine, setTriggerTasksByLine] = useState({});
        const [triggerSelection, setTriggerSelection] = useState({});
        const [triggerLoading, setTriggerLoading] = useState(false);
        const [triggerError, setTriggerError] = useState("");
        const triggerScopeRef = useRef("");
        // By Case: { [installmentRowId]: taskId[] } — raw ticks; always read
        // through installmentSelection (pruned) below.
        const [installmentTriggerSelection, setInstallmentTriggerSelection] = useState({});
        // Last fetched records ({ fetchKey, records }) and each line's matched
        // service id — see loadTriggerRecords / changedTriggerLineKeys.
        const triggerRecordsCacheRef = useRef(null);
        const triggerMatchRef = useRef({});
        const [combos, setCombos] = useState([]);
        const [appliedCombos, setAppliedCombos] = useState([]);
        // Ad-hoc combos whose "Also save this combo to the shared catalog"
        // checkbox was checked - the actual serviceCombos/serviceComboItems
        // writes are deferred to handleSubmit's tail, same reasoning as the
        // per-row _saveToCatalog flag.
        const [pendingComboCatalogSaves, setPendingComboCatalogSaves] = useState([]);
        // Parked manualServiceRows/appliedCombos/totals for the pricing mode NOT
        // currently active, keyed by "line"/"package" - see
        // handleManualPricingModeChange.
        const modeStateParkRef = useRef({ line: null, package: null });
        // Last converted total the services table reported (applyConvertedServiceTotals).
        const lastConvertedTotalsRef = useRef(null);

        useEffect(() => {
          ctx.api
            .request({
              url: "serviceCombos:list",
              params: {
                filter: JSON.stringify({ isActive: { $eq: true } }),
                appends: ["serviceComboItems.services", "serviceComboItems.currency"],
                // Explicit allowlist — omitting `fields` was silently
                // dropping serviceComboItems.price/vat/currencyId from the
                // response (the per-line snapshot fields), even though
                // appends resolved the services/currency relations fine.
                // Matches CaseCreateForm.js's own serviceCombos:list call,
                // which needed the same fix.
                fields: [
                  "id", "comboName", "comboCode", "serviceComboType",
                  "packageSubTotal", "packageVatRate", "currencyId",
                  "serviceComboItems.id", "serviceComboItems.serviceId",
                  "serviceComboItems.serviceName", "serviceComboItems.serviceType",
                  "serviceComboItems.quantity", "serviceComboItems.price",
                  "serviceComboItems.vat", "serviceComboItems.currencyId",
                  "serviceComboItems.services", "serviceComboItems.currency",
                ],
                pageSize: 100,
              },
            })
            .then((res) => {
              const list = res?.data?.data || [];
              setCombos(list.filter((c) => (c.serviceComboItems || []).length > 0));
            })
            .catch((error) => {
              console.warn("[ContractCreateForm] Could not fetch service combos:", error);
            });
        }, []);

        const [form, setForm] = useState({
          contractType: "byCase",
          status: "draft",
          billingCycle: "one_time",
          signedDate: todayInput(),
          endDate: "",
          // Defaults to today (2026-09-22), same as signedDate — a lawyer
          // filling this form is very rarely backdating a first payment, so
          // starting blank just added an unnecessary click for the common case.
          paymentDate: todayInput(),
          paymentSchedule: [newPaymentScheduleRow(1)],
          retainerRepeatAnchorType: "month",
          retainerRepeatAnchorValue: "1",
          retainerRepeatInterval: "1",
          retainerRepeatUnit: "month",
          contractCode: "",
          contractName: "",
          customerId: "",
          internalCompanyId: "",
          lawyerId: "",
          templateId: "",
          quotationId: "",
          currencyId: "",
          pricingMode: "line",
          projectId: "",
          parentId: "",
          projectServiceId: "",
          quotationServiceId: "",
          contractKind: "main",
          monthlyFee: "",
          fixedAmount: "",
          retainerPeriod: "",
          retainerDuration: "",
          includedHours: "",
          overageHourlyRate: "",
          subTotal: "",
          vatAmount: "",
          totalAmount: "",
          scopeNote: "",
          description: "",
          isRequiredApproval: false,
          approvedById: "",
          packageVatRate: "8",
        });
        const isDirtyRef = useRef(false);
        const savingRef = useRef(false);
        const setSavingState = useCallback((value) => {
          savingRef.current = value;
          setSaving(value);
        }, []);
        const markDirty = useCallback(() => {
          isDirtyRef.current = true;
        }, []);
        const forceClose = useCallback((nativeClose) => {
          isDirtyRef.current = false;
          if (typeof nativeClose === "function") {
            nativeClose();
            return;
          }
          closeCurrentPopup();
        }, []);
        const requestClose = useCallback(
          (nativeClose) => {
            if (savingRef.current) return;
            if (!isDirtyRef.current) {
              forceClose(nativeClose);
              return;
            }
            showDiscardConfirm(() => {
              forceClose(nativeClose);
            });
          },
          [forceClose],
        );

        useEffect(() => {
          return configureGuardedModalClose(requestClose);
        }, [requestClose]);

        const loadCaseServiceLines = async ({
          projectId,
          preselectedProjectServiceId,
          preselectedProjectServiceIds,
          knownProjectService,
          knownQuotationService,
          knownQuotation,
          knownProject,
          quotationId,
          knownQuotations = [],
        }) => {
          // A Quotation created without a Case (e.g. from Leads) has no
          // projectServices at all — quotationId alone must still be enough to
          // load its own services below, not just projectId/preselectedProjectServiceId.
          if (!projectId && !preselectedProjectServiceId && !quotationId) {
            setServiceLines([]);
            setSelectedServiceIds([]);
            return { lines: [], selectedIds: [] };
          }

          let projectServices = [];
          if (projectId) {
            try {
              const psRes = await ctx.api.request({
                url: "projectServices:list",
                params: {
                  filter: JSON.stringify({
                    projectId: { $eq: parseInt(projectId, 10) },
                  }),
                  pageSize: 500,
                  sort: ["createdAt"],
                  appends: ["services"],
                },
              });
              projectServices = psRes?.data?.data || [];
            } catch (error) {
              console.warn(
                "[ContractCreateForm] Could not load case services",
                error,
              );
            }
          }

          if (
            knownProjectService &&
            !projectServices.some(
              (item) => String(item.id) === String(knownProjectService.id),
            )
          ) {
            projectServices = [knownProjectService, ...projectServices];
          }
          if (!projectServices.length && preselectedProjectServiceId) {
            const fallbackProjectService = await fetchRecord(
              "projectServices:get",
              preselectedProjectServiceId,
              {
                appends: ["services"],
              },
            );
            if (fallbackProjectService) projectServices = [fallbackProjectService];
          }

          const quoteIds = Array.from(
            new Set(
              [
                quotationId,
                extractId(knownQuotation?.id),
                ...projectServices.map((item) =>
                  firstId(item.quotationId, item.quotations),
                ),
                firstId(
                  knownQuotationService?.quotationId,
                  knownQuotationService?.quotations,
                ),
              ].filter(Boolean),
            ),
          );

          const quoteMap = {};
          if (knownQuotation?.id)
            quoteMap[String(knownQuotation.id)] = knownQuotation;
          knownQuotations.forEach((item) => {
            if (quoteIds.includes(extractId(item.id)))
              quoteMap[String(item.id)] = item;
          });
          await Promise.all(
            quoteIds.map(async (id) => {
              if (quoteMap[String(id)]) return;
              const detail = await fetchQuotationDetail(id);
              if (detail) quoteMap[String(id)] = detail;
            }),
          );

          let quotationServices = [];
          if (quoteIds.length) {
            try {
              const qsRes = await ctx.api.request({
                url: "quotationServices:list",
                params: {
                  filter: JSON.stringify(
                    quoteIds.length === 1
                      ? { quotationId: { $eq: quoteIds[0] } }
                      : { quotationId: { $in: quoteIds } },
                  ),
                  pageSize: 1000,
                },
              });
              quotationServices = qsRes?.data?.data || [];
            } catch (error) {
              console.warn(
                "[ContractCreateForm] Could not load quotation service lines",
                error,
              );
            }
          }
          if (
            knownQuotationService &&
            !quotationServices.some(
              (item) => String(item.id) === String(knownQuotationService.id),
            )
          ) {
            quotationServices = [knownQuotationService, ...quotationServices];
          }

          let contractServices = [];
          if (projectId) {
            try {
              const csRes = await ctx.api.request({
                url: "contractServices:list",
                params: {
                  filter: JSON.stringify({
                    projectId: { $eq: parseInt(projectId, 10) },
                  }),
                  pageSize: 1000,
                  appends: ["contracts"],
                },
              });
              contractServices = csRes?.data?.data || [];
            } catch (error) {
              console.warn(
                "[ContractCreateForm] Could not load existing contract services",
                error,
              );
            }
          }

          const qSvcById = {};
          const qSvcByQuoteService = {};
          const qSvcByQuoteName = {};
          quotationServices.forEach((line) => {
            const lineId = extractId(line.id);
            const qId = firstId(line.quotationId, line.quotations);
            const serviceId = firstId(line.serviceId, line.service);
            const serviceName = String(line.serviceName || "")
              .toLowerCase()
              .trim();
            if (lineId) qSvcById[String(lineId)] = line;
            if (qId && serviceId) qSvcByQuoteService[`${qId}:${serviceId}`] = line;
            if (qId && serviceName) qSvcByQuoteName[`${qId}:${serviceName}`] = line;
          });

          const contractByProjectService = {};
          contractServices.forEach((line) => {
            const psId = firstId(line.projectServiceId, line.projectServices);
            if (psId && !contractByProjectService[String(psId)])
              contractByProjectService[String(psId)] = line;
          });
          let projectRecord =
            knownProject ||
            projects.find(
              (item) => String(extractId(item?.id)) === String(projectId),
            ) ||
            null;
          if (projectId && !projectRecord) {
            projectRecord = await fetchRecord("projects:get", projectId);
          }

          // A Quotation with no linked Case has zero projectServices — fall back
          // to building lines straight from its own quotationServices so the
          // picker isn't left empty. When a Case IS linked, projectServices is
          // always the source of truth (unchanged from before).
          const lines = projectServices.length
            ? projectServices
                .map((projectService) => {
                  const qSvcId = firstId(
                    projectService.quotationServiceId,
                    projectService.quotationServices,
                  );
                  const qId = firstId(
                    projectService.quotationId,
                    projectService.quotations,
                    quotationId,
                    knownQuotationService?.quotationId,
                    knownQuotationService?.quotations,
                    knownQuotation?.id,
                  );
                  const serviceId = firstId(
                    projectService.serviceId,
                    projectService.services,
                  );
                  const serviceName = String(
                    projectService.serviceName ||
                      projectService.services?.serviceName ||
                      projectService.name ||
                      "",
                  )
                    .toLowerCase()
                    .trim();
                  const quotationService =
                    (qSvcId && qSvcById[String(qSvcId)]) ||
                    (qId && serviceId && qSvcByQuoteService[`${qId}:${serviceId}`]) ||
                    (qId && serviceName && qSvcByQuoteName[`${qId}:${serviceName}`]) ||
                    null;
                  return normalizeServiceLine({
                    projectService,
                    quotationService,
                    quotation:
                      quoteMap[
                        String(
                          firstId(
                            quotationService?.quotationId,
                            quotationService?.quotations,
                            qId,
                          ),
                        )
                      ],
                    contractService:
                      contractByProjectService[String(projectService.id)],
                    project: projectRecord,
                  });
                })
                .filter(Boolean)
            : quotationServices
                .map((quotationService) =>
                  normalizeServiceLine({
                    projectService: null,
                    quotationService,
                    quotation:
                      quoteMap[
                        String(
                          firstId(
                            quotationService?.quotationId,
                            quotationService?.quotations,
                            quotationId,
                          ),
                        )
                      ] || knownQuotation,
                    contractService: null,
                    project: null,
                  }),
                )
                .filter(Boolean);

          const selectable = lines.filter((line) => !line.locked);
          const rawPreselected =
            preselectedProjectServiceIds || preselectedProjectServiceId;
          const preselectedIds = [];
          if (rawPreselected) {
            if (Array.isArray(rawPreselected)) {
              preselectedIds.push(...rawPreselected.map(String));
            } else {
              const idStr = String(rawPreselected);
              if (idStr.includes(",")) {
                preselectedIds.push(
                  ...idStr
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                );
              } else {
                preselectedIds.push(idStr);
              }
            }
          }
          const sourcePackageMode =
            isPackageSource(knownQuotation) || selectable.some(isPackageSource);
          const selectedIds =
            sourcePackageMode && selectable.length
              ? selectable.map((line) => lineKey(line))
              : preselectedIds.length &&
                  preselectedIds.some((id) =>
                    selectable.some((line) => lineKey(line) === id),
                  )
                ? preselectedIds.filter((id) =>
                    selectable.some((line) => lineKey(line) === id),
                  )
                : selectable.map((line) => lineKey(line));

          setServiceLines(lines);
          setSelectedServiceIds(selectedIds);
          return { lines, selectedIds };
        };

        useEffect(() => {
          Promise.all([
            fetchAll("customers:list"),
            fetchAll("internalCompany:list"),
            fetchAll("lawyers:list"),
            fetchAll("template:list"),
            fetchAll("quotations:list"),
            fetchAll("projects:list", { appends: ["customers"] }),
            fetchAll("contracts:list", { appends: ["customers"] }),
            fetchAll("companyServices:list", {
              appends: ["service", "services"],
            }),
            fetchAll("services:list"),
            fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES),
          ]).then(
            async ([
              custs,
              comps,
              laws,
              tmps,
              quots,
              projs,
              conts,
              coSvcs,
              svcCatalog,
              currs,
            ]) => {
              const selectableLawyers = filterSelectableLawyers(laws);
              const normalizedCurrencies = Array.isArray(currs) ? currs : [];
              const defaultCurrencyId = extractCurrencyId(
                findDefaultCurrency(normalizedCurrencies)?.id,
              );
              setCustomers(custs);
              setCompanies(comps);
              setLawyers(selectableLawyers);
              setTemplates(tmps);
              setQuotations(quots);
              setProjects(projs);
              setParentContracts(conts);
              setCompanyServiceOptions(
                enrichCompanyServiceOptions(coSvcs, svcCatalog, normalizedCurrencies),
              );
              setCurrencies(normalizedCurrencies);
              if (defaultCurrencyId) {
                setForm((prev) => ({
                  ...prev,
                  currencyId: prev.currencyId || String(defaultCurrencyId),
                }));
              }

              const popupParams = getPopupParams();
              const popupRecord = unwrapContextRecord(
                popupParams.record ||
                  popupParams.sourceRecord ||
                  popupParams.parentItem ||
                  popupParams.currentRecord ||
                  null,
              );
              console.log(
                "[ContractCreateForm] popupParams:",
                safeJsonStringify(popupParams),
              );
              console.log("[ContractCreateForm] ctx exists:", !!ctx);
              const inputArgs = getViewInputArgs();
              const collectionName = String(
                inputArgs.collectionName ||
                  popupParams.collectionName ||
                  popupParams.sourceCollectionName ||
                  ctx.collection?.name ||
                  "",
              );
              const urlPathname = getUrlPathname();
              const urlFilterByTk = firstId(getUrlFilterByTk());
              let urlQuotationRecord = null;
              let urlProjectRecord = null;
              const directRecord = unwrapContextRecord(
                ctx.record || ctx.popup?.record || popupRecord || null,
              );
              const directRecordKind = getContextRecordKind(
                directRecord || {},
                collectionName,
              );
              const directRecordIsProject = isProjectRecord(
                directRecord || {},
                collectionName,
              );
              let routeLooksLikeQuotation =
                isQuotationCollection(collectionName) ||
                isQuotationCollection(popupParams.sourceCollectionName) ||
                isQuotationCollection(urlPathname) ||
                !!popupParams.sourceQuotationId ||
                !!popupParams.quotationId ||
                directRecordKind === "quotation";
              const shouldUseUrlContext =
                !directRecord && !popupRecord && urlFilterByTk;
              if (urlFilterByTk && routeLooksLikeQuotation) {
                urlQuotationRecord = await fetchRecord(
                  "quotations:get",
                  urlFilterByTk,
                  {},
                  { quiet: true },
                );
              }
              if (
                urlFilterByTk &&
                !urlQuotationRecord &&
                !directRecordIsProject &&
                !isProjectCollection(collectionName) &&
                !isProjectServiceCollection(collectionName) &&
                !popupParams.sourceProjectId &&
                !popupParams.projectId &&
                !popupParams.caseId &&
                !popupParams.sourceCustomerId &&
                !popupParams.customerId &&
                directRecordKind !== "customer"
              ) {
                const probedQuotation = await fetchRecord(
                  "quotations:get",
                  urlFilterByTk,
                  {},
                  { quiet: true },
                );
                if (
                  extractId(probedQuotation?.id) &&
                  looksLikeQuotationRecord(probedQuotation, "quotations")
                ) {
                  urlQuotationRecord = probedQuotation;
                  routeLooksLikeQuotation = true;
                }
              }
              if (
                shouldUseUrlContext &&
                !urlQuotationRecord &&
                !popupParams.sourceProjectId &&
                !popupParams.projectId &&
                !popupParams.caseId
              ) {
                urlProjectRecord = await fetchRecord(
                  "projects:get",
                  urlFilterByTk,
                  {},
                  { quiet: true },
                );
              }
              if (
                shouldUseUrlContext &&
                !urlQuotationRecord &&
                !urlProjectRecord &&
                !popupParams.sourceQuotationId &&
                !popupParams.sourceCustomerId &&
                !popupParams.quotationId
              ) {
                urlQuotationRecord = await fetchRecord(
                  "quotations:get",
                  urlFilterByTk,
                );
              }
              const directRecordId = extractId(directRecord?.id);
              const directRecordIsSameQuotation =
                urlQuotationRecord &&
                directRecordId &&
                String(directRecordId) === String(urlFilterByTk) &&
                looksLikeQuotationRecord(directRecord, collectionName);
              const mergedUrlQuotationRecord =
                urlQuotationRecord &&
                routeLooksLikeQuotation &&
                (!directRecordId || String(directRecordId) === String(urlFilterByTk))
                  ? directRecordIsSameQuotation
                    ? { ...urlQuotationRecord, ...directRecord }
                    : urlQuotationRecord
                  : null;
              const record =
                mergedUrlQuotationRecord ||
                directRecord ||
                urlProjectRecord ||
                urlQuotationRecord ||
                {};
              const contextRecordId = extractId(record?.id);
              const inputFilterId = firstId(
                inputArgs.filterByTk,
                popupParams.filterByTk,
              );
              const urlFilterIsQuotation =
                !!extractId(urlQuotationRecord?.id) &&
                (String(extractId(urlQuotationRecord?.id)) ===
                  String(urlFilterByTk || "") ||
                  String(extractId(urlQuotationRecord?.id)) ===
                    String(inputFilterId || ""));
              const customerLookupFilterId = firstId(
                urlFilterIsQuotation ? null : inputFilterId,
                popupParams.sourceCustomerId,
                popupParams.customerId,
                inputArgs.customerId,
                inputArgs.params?.customerId,
                urlFilterIsQuotation ? null : urlFilterByTk,
              );
              const inputSourceId = firstId(inputArgs.sourceId, popupParams.sourceId);
              const rawContextRecordKind = getContextRecordKind(
                record,
                collectionName,
              );
              const recordIsProject = isProjectRecord(record, collectionName);
              const recordProjectId = recordIsProject ? firstId(record.id) : null;
              let recordCustomerMatch =
                contextRecordId && !recordIsProject
                  ? custs.find(
                      (customer) =>
                        String(extractId(customer?.id)) === String(contextRecordId),
                    )
                  : null;
              let filterCustomerMatch =
                customerLookupFilterId &&
                !recordIsProject &&
                !isProjectCollection(collectionName) &&
                !isProjectServiceCollection(collectionName)
                  ? custs.find(
                      (customer) =>
                        String(extractId(customer?.id)) ===
                        String(customerLookupFilterId),
                    )
                  : null;
              if (
                !rawContextRecordKind &&
                !recordIsProject &&
                contextRecordId &&
                !recordCustomerMatch
              ) {
                recordCustomerMatch = await fetchAnyRecord(
                  ["customers:get", "contacts:get", "contact:get"],
                  contextRecordId,
                );
              }
              if (
                !rawContextRecordKind &&
                !recordIsProject &&
                customerLookupFilterId &&
                String(customerLookupFilterId) !== String(contextRecordId || "") &&
                !filterCustomerMatch &&
                !isProjectCollection(collectionName) &&
                !isProjectServiceCollection(collectionName)
              ) {
                filterCustomerMatch = await fetchAnyRecord(
                  ["customers:get", "contacts:get", "contact:get"],
                  customerLookupFilterId,
                );
              }
              const matchedCustomerId =
                !rawContextRecordKind && !recordIsProject
                  ? firstId(recordCustomerMatch?.id, filterCustomerMatch?.id)
                  : null;
              const matchedCustomerDetail = matchedCustomerId
                ? await fetchAnyRecord(
                    ["customers:get", "contacts:get", "contact:get"],
                    matchedCustomerId,
                  )
                : null;
              const fetchedContextCustomer =
                rawContextRecordKind === "customer" && contextRecordId
                  ? await fetchAnyRecord(
                      ["customers:get", "contacts:get", "contact:get"],
                      contextRecordId,
                    )
                  : null;
              const matchedContextCustomer =
                recordCustomerMatch || filterCustomerMatch || matchedCustomerDetail
                  ? {
                      ...(recordCustomerMatch || filterCustomerMatch || {}),
                      ...(matchedCustomerDetail || {}),
                    }
                  : null;
              const contextCustomerRecord =
                rawContextRecordKind === "customer"
                  ? { ...record, ...(fetchedContextCustomer || {}) }
                  : matchedContextCustomer;
              const contextRecordKind =
                rawContextRecordKind || (contextCustomerRecord ? "customer" : "");
              const contextQuotationId =
                contextRecordKind === "quotation"
                  ? firstId(contextRecordId, inputFilterId)
                  : null;
              const contextCustomerId =
                contextRecordKind === "customer"
                  ? firstId(
                      contextCustomerRecord?.id,
                      contextRecordId,
                      customerLookupFilterId,
                    )
                  : null;
              const contextCompanyId =
                contextRecordKind === "customer"
                  ? recordInternalCompanyId(contextCustomerRecord || record)
                  : null;
              const contextLawyerId =
                contextRecordKind === "customer"
                  ? recordLawyerId(contextCustomerRecord || record)
                  : null;
              debugContractContext("raw", {
                collectionName,
                recordId: contextRecordId,
                recordKeys: Object.keys(record || {})
                  .slice(0, 30)
                  .join(","),
                rawContextRecordKind,
                inferredContextRecordKind: contextRecordKind,
                contextQuotationId,
                inputFilterId,
                customerLookupFilterId,
                inputSourceId,
                urlPathname,
                urlFilterByTk,
                urlFilterIsQuotation,
                routeLooksLikeQuotation,
                mergedUrlQuotationRecordId: extractId(mergedUrlQuotationRecord?.id),
                urlProjectRecordId: extractId(urlProjectRecord?.id),
                urlQuotationRecordId: extractId(urlQuotationRecord?.id),
                sourceProjectId: extractId(popupParams.sourceProjectId),
                sourceCustomerId: extractId(popupParams.sourceCustomerId),
                matchedCustomerByRecordId: extractId(recordCustomerMatch?.id),
                matchedCustomerByFilterByTk: extractId(filterCustomerMatch?.id),
                matchedCustomerDetailId: extractId(matchedCustomerDetail?.id),
                fetchedContextCustomerId: extractId(fetchedContextCustomer?.id),
              });
              const filterAsProjectId =
                isProjectCollection(collectionName) ||
                recordIsProject ||
                (!contextRecordKind && !isProjectServiceCollection(collectionName))
                  ? firstId(
                      inputFilterId,
                      urlProjectRecord?.id,
                      popupParams.sourceProjectId,
                    )
                  : null;
              const filterAsProjectServiceId = isProjectServiceCollection(
                collectionName,
              )
                ? inputFilterId
                : null;
              const contextSeed = {
                quotationId: firstId(
                  contextQuotationId,
                  popupParams.sourceQuotationId,
                  popupParams.quotationId,
                  urlQuotationRecord?.id,
                  record.quotationId,
                  record.quotations,
                  popupParams.quotations,
                  inputArgs.quotationId,
                  inputArgs.params?.quotationId,
                ),
                projectId: firstId(
                  record.projectId,
                  record.project,
                  record.cases,
                  recordProjectId,
                  popupParams.projectId,
                  popupParams.caseId,
                  inputArgs.projectId,
                  inputArgs.caseId,
                  inputArgs.params?.projectId,
                  inputArgs.params?.caseId,
                  filterAsProjectId,
                ),
                parentId: firstId(
                  contextRecordKind === "quotation" ? null : record.parentId,
                  contextRecordKind === "quotation" ? null : record.parent,
                  popupParams.parentId,
                  popupParams.parentContractId,
                  inputArgs.parentId,
                  inputArgs.parentContractId,
                  inputArgs.params?.parentId,
                ),
                projectServiceId: firstId(
                  record.projectServiceId,
                  record.projectServices,
                  popupParams.projectServiceId,
                  inputArgs.projectServiceId,
                  inputArgs.params?.projectServiceId,
                  inputSourceId,
                  filterAsProjectServiceId,
                ),
                quotationServiceId: firstId(
                  record.quotationServiceId,
                  record.quotationServices,
                  popupParams.quotationServiceId,
                  inputArgs.quotationServiceId,
                  inputArgs.params?.quotationServiceId,
                ),
                serviceId: firstId(
                  record.serviceId,
                  record.services,
                  popupParams.serviceId,
                  inputArgs.serviceId,
                  inputArgs.params?.serviceId,
                ),
                customerId: firstId(
                  contextCustomerId,
                  record.customerId,
                  record.customers,
                  popupParams.customerId,
                  inputArgs.customerId,
                  inputArgs.params?.customerId,
                ),
                internalCompanyId: firstId(
                  contextCompanyId,
                  record.internalCompanyId,
                  record.internalCompany,
                  popupParams.internalCompanyId,
                  inputArgs.internalCompanyId,
                  inputArgs.params?.internalCompanyId,
                ),
                lawyerId: firstId(
                  contextLawyerId,
                  record.lawyerId,
                  popupParams.lawyerId,
                  inputArgs.lawyerId,
                  inputArgs.params?.lawyerId,
                ),
              };
              debugContractContext("seed", contextSeed);
              let currentQuotationId = contextSeed.quotationId;
              let popupQuotation = currentQuotationId
                ? await fetchQuotationDetail(currentQuotationId)
                : null;
              let initialProjectId = contextSeed.projectId;
              const currentParentId = contextSeed.parentId;
              const currentProjectServiceId = contextSeed.projectServiceId;
              let currentQuotationServiceId = contextSeed.quotationServiceId;
              const popupContractMode = String(
                popupParams.contractKind ||
                  popupParams.contractMode ||
                  popupParams.mode ||
                  "",
              ).toLowerCase();
              const currentContractKind =
                popupContractMode === "appendix" ||
                popupContractMode === "sub" ||
                popupContractMode === "sub-contract" ||
                popupParams.isMainContract === false ||
                popupParams.isMainContract === "false" ||
                currentParentId
                  ? "appendix"
                  : "main";
              let popupProjectService = null;
              if (currentProjectServiceId) {
                popupProjectService = await fetchRecord(
                  "projectServices:get",
                  currentProjectServiceId,
                  {
                    appends: ["services"],
                  },
                );
              }
              let popupQuotationService = null;
              currentQuotationServiceId =
                currentQuotationServiceId ||
                firstId(
                  popupProjectService?.quotationServiceId,
                  popupProjectService?.quotationServices,
                );
              if (currentQuotationServiceId) {
                popupQuotationService = await fetchRecord(
                  "quotationServices:get",
                  currentQuotationServiceId,
                  {
                  },
                );
              }
              currentQuotationId =
                currentQuotationId ||
                firstId(
                  popupProjectService?.quotationId,
                  popupProjectService?.quotations,
                  popupQuotationService?.quotationId,
                  popupQuotationService?.quotations,
                );
              if (!popupQuotation && currentQuotationId) {
                popupQuotation = await fetchQuotationDetail(currentQuotationId);
              }
              initialProjectId =
                initialProjectId ||
                firstId(
                  popupProjectService?.projectId,
                  popupProjectService?.project,
                  popupProjectService?.projects,
                  popupQuotation?.projectId,
                  popupQuotation?.project,
                  popupQuotation?.cases,
                );
              if (!popupQuotationService && currentQuotationId) {
                try {
                  const qsRes = await ctx.api.request({
                    url: "quotationServices:list",
                    params: {
                      filter: JSON.stringify({
                        quotationId: { $eq: parseInt(currentQuotationId, 10) },
                      }),
                      pageSize: 500,
                    },
                  });
                  const qLines = qsRes?.data?.data || [];
                  const serviceIdForMatch =
                    extractId(popupProjectService?.serviceId) ||
                    extractId(popupProjectService?.services) ||
                    contextSeed.serviceId;
                  popupQuotationService =
                    qLines.find(
                      (line) => String(line.id) === String(currentQuotationServiceId),
                    ) ||
                    qLines.find((line) =>
                      sameId(
                        firstId(line.projectServiceId, line.projectServices),
                        currentProjectServiceId,
                      ),
                    ) ||
                    qLines.find((line) => {
                      const lineServiceId =
                        extractId(line.serviceId) || extractId(line.service);
                      return (
                        lineServiceId &&
                        String(lineServiceId) === String(serviceIdForMatch)
                      );
                    }) ||
                    (qLines.length === 1 ? qLines[0] : null);
                } catch (error) {
                  console.warn(
                    "[ContractCreateForm] Could not preload quotation service",
                    error,
                  );
                }
              }

              const resolvedQuotationServiceId =
                extractId(popupQuotationService?.id) || currentQuotationServiceId;
              const resolvedProjectId =
                initialProjectId ||
                firstId(
                  popupProjectService?.projectId,
                  popupProjectService?.project,
                  popupProjectService?.projects,
                  popupQuotationService?.projectId,
                  popupQuotationService?.project,
                  popupQuotationService?.cases,
                );
              const popupProject =
                recordIsProject &&
                String(recordProjectId) === String(resolvedProjectId)
                  ? record
                  : resolvedProjectId
                    ? await fetchRecord("projects:get", resolvedProjectId)
                    : null;
              const quotationParentId = firstId(
                popupQuotation?.parentId,
                popupQuotation?.parent,
                popupQuotation?.parentQuotation,
              );
              const resolvedParentId =
                currentParentId ||
                firstId(
                  popupProject?.contractId,
                  popupProject?.contract,
                  popupProject?.contracts,
                );
              const resolvedContractKind =
                currentContractKind === "appendix" ||
                resolvedParentId ||
                quotationParentId
                  ? "appendix"
                  : "main";

              const resolvedCustomerId =
                contextSeed.customerId ||
                firstId(
                  popupProject?.customerId,
                  popupProject?.customer,
                  popupProject?.customers,
                ) ||
                quotationCustomerId(popupQuotation);
              const resolvedCompanyId =
                contextSeed.internalCompanyId ||
                firstId(
                  popupProject?.internalCompanyId,
                  popupProject?.internalCompany,
                ) ||
                quotationInternalCompanyId(popupQuotation);
              const resolvedLawyerId =
                contextSeed.lawyerId ||
                firstId(popupProject?.lawyerId, popupProject?.lawyer) ||
                firstId(popupProject?.assignees) ||
                quotationLawyerId(popupQuotation);

              console.log(
                "[ContractCreateForm] resolved preloaded fields:",
                JSON.stringify({
                  resolvedCustomerId,
                  resolvedCompanyId,
                  resolvedLawyerId,
                }),
              );
              const projectCustomerRecord =
                relationRecord(popupProject?.customer, resolvedCustomerId) ||
                relationRecord(popupProject?.customers, resolvedCustomerId);
              const projectCompanyRecord =
                relationRecord(popupProject?.internalCompany, resolvedCompanyId) ||
                relationRecord(popupProject?.internalCompanies, resolvedCompanyId);
              const projectLawyerRecord =
                relationRecord(popupProject?.lawyer, resolvedLawyerId) ||
                relationRecord(popupProject?.lawyers, resolvedLawyerId) ||
                relationRecord(popupProject?.assignees, resolvedLawyerId) ||
                relationRecord(popupProject?.projectManager, resolvedLawyerId);
              const resolvedContextCustomerRecord =
                contextRecordKind === "customer" && resolvedCustomerId
                  ? contextCustomerRecord || record
                  : null;
              const contextCompanyRecord =
                relationRecord(record?.internalCompany, resolvedCompanyId) ||
                relationRecord(record?.internalCompanies, resolvedCompanyId);
              const contextLawyerRecord =
                relationRecord(record?.lawyer, resolvedLawyerId) ||
                relationRecord(record?.lawyers, resolvedLawyerId) ||
                relationRecord(record?.assignedLawyer, resolvedLawyerId);
              const serviceName =
                popupQuotationService?.serviceName ||
                popupProjectService?.serviceName ||
                popupProjectService?.services?.serviceName ||
                popupProjectService?.name ||
                popupParams.serviceName ||
                "";
              const serviceDescription =
                popupQuotationService?.description ||
                popupProjectService?.description ||
                popupProjectService?.services?.description ||
                popupParams.description ||
                "";
              const serviceAmounts = resolveServiceAmounts(
                popupQuotationService,
                popupProjectService,
                popupParams,
              );
              const serviceSubTotal = serviceAmounts.subTotal;
              const serviceVatAmount = serviceAmounts.vatAmount;
              const serviceTotalAmount = serviceAmounts.totalAmount;
              const serviceLineResult = await loadCaseServiceLines({
                projectId: resolvedProjectId,
                preselectedProjectServiceId: currentProjectServiceId,
                preselectedProjectServiceIds:
                  popupParams.projectServiceIds || popupParams.projectServiceId,
                knownProjectService: popupProjectService,
                knownQuotationService: popupQuotationService,
                knownQuotation: popupQuotation,
                knownProject: popupProject,
                quotationId: currentQuotationId,
                knownQuotations: quots,
              });
              const selectedServiceLines = serviceLineResult.lines.filter((line) =>
                serviceLineResult.selectedIds.includes(lineKey(line)),
              );
              const selectedTotals = sumServiceLines(selectedServiceLines);
              const quotationAmounts = resolveServiceAmounts({
                subTotal: popupQuotation?.subTotal,
                vatAmount: popupQuotation?.vatAmount,
                totalAmount:
                  popupQuotation?.totalAmount || popupQuotation?.grandTotal,
              });
              const hasDirectServiceAmount = !!(
                serviceSubTotal ||
                serviceVatAmount ||
                serviceTotalAmount
              );
              const selectedPackageSource =
                selectedServiceLines.find(isPackageSource) ||
                popupQuotationService ||
                popupProjectService ||
                popupQuotation;
              const quotationPackageMode =
                isPackageSource(popupQuotation) ||
                selectedServiceLines.some(isPackageSource) ||
                isPackageSource(popupQuotationService) ||
                isPackageSource(popupProjectService);
              const selectedPackageLines = selectedServiceLines.filter(isPackageSource);
              const popupPackageFallback = quotationPackageMode
                ? resolvePackageAmounts(
                    selectedPackageSource,
                    popupQuotation,
                    popupQuotationService,
                    popupProjectService,
                  )
                : null;
              // Every combo group of the selected services counts — each
              // combo's rows carry only that combo's own amount.
              const quotationPackageAmounts = quotationPackageMode
                ? selectedPackageLines.length
                  ? sumPackageGroups(selectedPackageLines, popupPackageFallback.vatRate)
                  : popupPackageFallback
                : null;
              const effectiveSubTotal = quotationPackageMode
                ? quotationPackageAmounts.subTotal
                : selectedServiceLines.length
                  ? selectedTotals.subTotal
                  : hasDirectServiceAmount
                    ? serviceSubTotal
                    : quotationAmounts.subTotal;
              const effectiveVatAmount = quotationPackageMode
                ? quotationPackageAmounts.vatAmount
                : selectedServiceLines.length
                  ? selectedTotals.vatAmount
                  : hasDirectServiceAmount
                    ? serviceVatAmount
                    : quotationAmounts.vatAmount;
              const effectiveTotalAmount = quotationPackageMode
                ? quotationPackageAmounts.totalAmount
                : selectedServiceLines.length
                  ? selectedTotals.totalAmount
                  : hasDirectServiceAmount
                    ? serviceTotalAmount
                    : quotationAmounts.totalAmount;
              const [
                resolvedCustomerRecord,
                resolvedCompanyRecord,
                resolvedLawyerRecord,
              ] = await Promise.all([
                resolvedCustomerId &&
                !resolvedContextCustomerRecord &&
                !projectCustomerRecord &&
                !hasRecordId(custs, resolvedCustomerId)
                  ? fetchAnyRecord(
                      ["customers:get", "contacts:get", "contact:get"],
                      resolvedCustomerId,
                    )
                  : Promise.resolve(null),
                resolvedCompanyId &&
                !contextCompanyRecord &&
                !projectCompanyRecord &&
                !hasRecordId(comps, resolvedCompanyId)
                  ? fetchAnyRecord(
                      ["internalCompany:get", "internalCompanies:get"],
                      resolvedCompanyId,
                    )
                  : Promise.resolve(null),
                resolvedLawyerId &&
                !contextLawyerRecord &&
                !projectLawyerRecord &&
                !hasRecordId(selectableLawyers, resolvedLawyerId)
                  ? fetchAnyRecord(
                      ["lawyers:get", "employees:get", "users:get"],
                      resolvedLawyerId,
                    )
                  : Promise.resolve(null),
              ]);
              const fallbackQuotationOption =
                popupQuotation ||
                (currentQuotationId
                  ? {
                      id: currentQuotationId,
                      quotationCode: `Quotation #${currentQuotationId}`,
                    }
                  : null);
              const fallbackProjectOption =
                popupProject ||
                (resolvedProjectId
                  ? { id: resolvedProjectId, caseCode: tr("Case #{0}", { 0: resolvedProjectId }) }
                  : null);
              const fallbackCustomerOption =
                resolvedContextCustomerRecord ||
                projectCustomerRecord ||
                resolvedCustomerRecord ||
                (resolvedCustomerId ? { id: resolvedCustomerId } : null);
              const fallbackCompanyOption =
                contextCompanyRecord ||
                projectCompanyRecord ||
                resolvedCompanyRecord ||
                (resolvedCompanyId ? { id: resolvedCompanyId } : null);
              const fallbackLawyerOption =
                contextLawyerRecord ||
                projectLawyerRecord ||
                resolvedLawyerRecord ||
                (resolvedLawyerId ? { id: resolvedLawyerId } : null);
              const safeFallbackLawyerOption =
                filterSelectableLawyers([fallbackLawyerOption]).filter(Boolean)[0] ||
                null;
              const contractTitlePrefix =
                resolvedContractKind === "appendix" ? "Appendix" : "Contract";
              const defaultContractName = serviceName
                ? `${contractTitlePrefix} - ${serviceName}`
                : popupQuotation
                  ? `${contractTitlePrefix} - ${quotationLabel(popupQuotation)}`
                  : "";

              debugContractContext("resolved", {
                resolvedCustomerId,
                resolvedCompanyId,
                resolvedLawyerId,
                resolvedProjectId,
                currentQuotationId,
                currentProjectServiceId,
                resolvedQuotationServiceId,
                resolvedParentId,
                resolvedContractKind,
                fallbackCustomerOptionId: extractId(fallbackCustomerOption?.id),
                fallbackCompanyOptionId: extractId(fallbackCompanyOption?.id),
                fallbackLawyerOptionId: extractId(safeFallbackLawyerOption?.id),
              });

              setQuotations((prev) => mergeRecordById(prev, fallbackQuotationOption));
              setProjects((prev) => mergeRecordById(prev, fallbackProjectOption));
              setCustomers((prev) => mergeRecordById(prev, fallbackCustomerOption));
              setCompanies((prev) => mergeRecordById(prev, fallbackCompanyOption));
              setLawyers((prev) => mergeRecordById(prev, safeFallbackLawyerOption));

              debugContractContext("setForm", {
                customerId: resolvedCustomerId ? String(resolvedCustomerId) : "",
                internalCompanyId: resolvedCompanyId ? String(resolvedCompanyId) : "",
                lawyerId: resolvedLawyerId ? String(resolvedLawyerId) : "",
                projectId: resolvedProjectId ? String(resolvedProjectId) : "",
                quotationId: currentQuotationId ? String(currentQuotationId) : "",
                parentId: resolvedParentId ? String(resolvedParentId) : "",
              });

              setForm((prev) => {
                const prefillTotals = {
                  fixedAmount: effectiveTotalAmount
                    ? String(effectiveTotalAmount)
                    : prev.fixedAmount,
                  subTotal: effectiveSubTotal
                    ? String(effectiveSubTotal)
                    : prev.subTotal,
                  vatAmount:
                    effectiveSubTotal || effectiveTotalAmount
                      ? String(effectiveVatAmount)
                      : prev.vatAmount,
                  totalAmount: effectiveTotalAmount
                    ? String(effectiveTotalAmount)
                    : prev.totalAmount,
                };
                return {
                ...prev,
                customerId: resolvedCustomerId
                  ? String(resolvedCustomerId)
                  : prev.customerId,
                internalCompanyId: resolvedCompanyId
                  ? String(resolvedCompanyId)
                  : prev.internalCompanyId,
                lawyerId: resolvedLawyerId ? String(resolvedLawyerId) : prev.lawyerId,
                quotationId: currentQuotationId
                  ? String(currentQuotationId)
                  : prev.quotationId,
                pricingMode: quotationPackageMode ? "package" : "line",
                packageVatRate: quotationPackageMode
                  ? String(
                      quotationPackageAmounts?.vatRate !== undefined &&
                        quotationPackageAmounts?.vatRate !== null &&
                        quotationPackageAmounts?.vatRate !== ""
                        ? quotationPackageAmounts.vatRate
                        : prev.packageVatRate !== undefined &&
                            prev.packageVatRate !== null &&
                            prev.packageVatRate !== ""
                          ? prev.packageVatRate
                          : "8",
                    )
                  : prev.packageVatRate,
                projectId: resolvedProjectId
                  ? String(resolvedProjectId)
                  : prev.projectId,
                parentId: resolvedParentId ? String(resolvedParentId) : prev.parentId,
                projectServiceId: currentProjectServiceId
                  ? String(currentProjectServiceId)
                  : prev.projectServiceId,
                quotationServiceId: resolvedQuotationServiceId
                  ? String(resolvedQuotationServiceId)
                  : prev.quotationServiceId,
                contractKind: resolvedContractKind,
                contractName: defaultContractName || prev.contractName,
                ...(quotationPackageMode
                  ? prefillTotals
                  : lineModeTotalsPatch(lastConvertedTotalsRef.current, prefillTotals)),
                scopeNote: serviceDescription || prev.scopeNote,
                };
              });

              setLoading(false);
            },
          );
        }, []);

        const setF = (key, value) => {
          markDirty();
          setForm((prev) => deriveForm(prev, { [key]: value }));
        };

        const refreshCustomers = useCallback(async () => {
          const list = await fetchAll("customers:list");
          setCustomers(list);
          return list;
        }, []);

        const refreshQuotations = useCallback(async () => {
          const list = await fetchAll("quotations:list");
          setQuotations(list);
          return list;
        }, []);

        const refreshTemplates = useCallback(async () => {
          const list = await fetchAll("template:list");
          setTemplates(list);
          return list;
        }, []);

        const openCreatePopup = useCallback(
          async (viewKey, refreshFn, params = {}, options = {}) => {
            const { beforeIds, onCreated } = options;
            const beforeIdSet = beforeIds ? new Set(beforeIds.map(String)) : null;
            const expectedCollection = QUICK_CREATE_COLLECTION_BY_VIEW[viewKey];
            const targetRefreshBlockUid =
              QUICK_CREATE_REFRESH_BLOCK_UID_BY_VIEW[viewKey];
            const quickCreateRequestId =
              params.quickCreateRequestId ||
              `${viewKey}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
            const sourceInput = getRuntimeInput();
            const popupParams = {
              ...params,
              quickCreateRequestId,
              quickCreateViewKey: viewKey,
              quickCreateSource: "ContractCreateForm",
              quickCreateTargetCollection: expectedCollection,
              sourceBlockUid:
                params.sourceBlockUid ||
                sourceInput.blockUid ||
                sourceInput.dataBlockUid,
              targetBlockUid: params.targetBlockUid || targetRefreshBlockUid,
              dataBlockUid: params.dataBlockUid || targetRefreshBlockUid,
              refreshBlockUids: compact([
                params.refreshBlockUid,
                ...(Array.isArray(params.refreshBlockUids)
                  ? params.refreshBlockUids
                  : []),
                targetRefreshBlockUid,
                CONTRACT_REFRESH_BLOCK_UID,
              ]),
            };
            let selectedCreatedId = null;
            const cleanupFns = [];
            const cleanupQuickCreateListener = () => {
              cleanupFns.splice(0).forEach((cleanup) => {
                try {
                  cleanup();
                } catch {}
              });
            };
            const selectCreated = (id, record, updated = []) => {
              if (!id || selectedCreatedId || !onCreated) return;
              selectedCreatedId = String(id);
              cleanupQuickCreateListener();
              onCreated(String(id), record, updated);
            };
            const isExpectedCreatedDetail = (detail = {}) => {
              if (detail.quickCreateRequestId) {
                return detail.quickCreateRequestId === quickCreateRequestId;
              }
              return detail.collection === expectedCollection;
            };
            const runRefreshAndSelect = async (
              forcedId = null,
              forcedRecord = null,
            ) => {
              try {
                const updated = refreshFn ? await refreshFn() : [];
                if (selectedCreatedId) return;
                if (forcedId) {
                  const created =
                    (Array.isArray(updated)
                      ? updated.find((item) => String(item.id) === String(forcedId))
                      : null) ||
                    forcedRecord ||
                    null;
                  selectCreated(forcedId, created, updated);
                  return;
                }
                if (beforeIdSet && onCreated && Array.isArray(updated)) {
                  const createdCandidates = updated.filter(
                    (item) => !beforeIdSet.has(String(item.id)),
                  );
                  // If more than one record is new (e.g. another user created something
                  // concurrently), prefer the most recently created one.
                  const created =
                    createdCandidates.length > 1
                      ? createdCandidates.reduce((latest, item) =>
                          new Date(item.createdAt || 0) >
                          new Date(latest.createdAt || 0)
                            ? item
                            : latest,
                        )
                      : createdCandidates[0];
                  if (created) selectCreated(created.id, created, updated);
                }
              } catch (error) {
                console.warn(
                  "[ContractCreateForm] quick-create refresh failed",
                  error,
                );
                if (forcedId) selectCreated(forcedId, forcedRecord, []);
              }
            };

            if (
              onCreated &&
              expectedCollection &&
              typeof window !== "undefined" &&
              typeof window.addEventListener === "function"
            ) {
              // window.removeEventListener is blocked in the RunJS sandbox (JS item;
              // addEventListener is allowed), so cleanup also turns the handler off.
              let quickCreateListening = true;
              const handleQuickCreateCreated = (event) => {
                if (!quickCreateListening) return;
                const detail = event?.detail || {};
                if (!isExpectedCreatedDetail(detail)) return;
                const createdId = extractId(detail.id || detail.record?.id);
                if (!createdId) return;
                runRefreshAndSelect(String(createdId), detail.record || null);
              };
              window.addEventListener(
                QUICK_CREATE_CREATED_EVENT,
                handleQuickCreateCreated,
              );
              cleanupFns.push(() => {
                quickCreateListening = false;
                try {
                  window.removeEventListener(QUICK_CREATE_CREATED_EVENT, handleQuickCreateCreated);
                } catch {}
              });
            }

            const quickCreateBridge = getQuickCreateBridge();
            if (onCreated && expectedCollection && quickCreateBridge?.subscribe) {
              cleanupFns.push(
                quickCreateBridge.subscribe((detail = {}) => {
                  if (!isExpectedCreatedDetail(detail)) return;
                  const createdId = extractId(detail.id || detail.record?.id);
                  if (!createdId) return;
                  runRefreshAndSelect(String(createdId), detail.record || null);
                }),
              );
            }

            const opened = await openPopupViewByUid(viewKey, popupParams);
            if (opened && refreshFn) {
              [1200, 3500, 7000, 15000, 30000, 60000].forEach((delay) => {
                setTimeout(runRefreshAndSelect, delay);
              });
              setTimeout(cleanupQuickCreateListener, 65000);
            } else {
              cleanupQuickCreateListener();
            }
          },
          [],
        );

        useEffect(() => {
          debugContractContext("form-state", {
            customerId: form.customerId,
            internalCompanyId: form.internalCompanyId,
            lawyerId: form.lawyerId,
            projectId: form.projectId,
            quotationId: form.quotationId,
            parentId: form.parentId,
          });
        }, [
          form.customerId,
          form.internalCompanyId,
          form.lawyerId,
          form.projectId,
          form.quotationId,
          form.parentId,
        ]);

        const toggleApproval = () => {
          setForm((p) => ({
            ...p,
            isRequiredApproval: !p.isRequiredApproval,
            approvedById: !p.isRequiredApproval ? p.approvedById : "",
          }));
        };

        const selectedQuotation = useMemo(
          () => quotations.find((q) => String(q.id) === String(form.quotationId)),
          [quotations, form.quotationId],
        );
        // The header is VND (INV-1): foreign-currency services are converted
        // to it for the services footer and Total amount. There is no header
        // currency picker; it used to follow the first service line / the
        // source Quotation, so a USD first line made the whole contract USD.
        const selectedCurrency = useMemo(
          () => findDefaultCurrency(currencies),
          [currencies],
        );
        const currencyOptions = useMemo(
          () =>
            currencies.map((currency) => ({
              value: String(currency.id),
              label: currencySelectLabel(currency),
            })),
          [currencies],
        );

        const selectedContractServiceLines = useMemo(
          () =>
            serviceLines.filter((line) =>
              selectedServiceIds.includes(lineKey(line)),
            ),
          [serviceLines, selectedServiceIds],
        );

        const filteredServiceOptions = useMemo(
          () =>
            form.internalCompanyId
              ? companyServiceOptions.filter(
                  (item) =>
                    String(serviceOptionCompanyId(item)) ===
                    String(form.internalCompanyId),
                )
              : [],
          [companyServiceOptions, form.internalCompanyId],
        );

        const applyServiceSelection = (nextIds, lines = serviceLines) => {
          const uniqueIds = Array.from(
            new Set(nextIds.map((id) => String(id)).filter(Boolean)),
          );
          setSelectedServiceIds(uniqueIds);
          const selectedLines = lines.filter((line) =>
            uniqueIds.includes(lineKey(line)),
          );
          const hasAnySelection = selectedLines.length || manualServiceRows.length;
          const packageSource =
            selectedLines.find(isPackageSource) || selectedQuotation;
          const packageMode =
            selectedLines.some(isPackageSource) || isPackageSource(selectedQuotation);
          // Every combo group of the selected services counts — each combo's
          // rows carry only that combo's own amount (see sumPackageGroups).
          const selectedPackageLines = selectedLines.filter(isPackageSource);
          const packageFallback = packageMode
            ? resolvePackageAmounts(packageSource, selectedQuotation)
            : null;
          const packageAmounts = packageMode
            ? selectedPackageLines.length
              ? sumPackageGroups(selectedPackageLines, packageFallback.vatRate)
              : packageFallback
            : null;
          const firstLine = selectedLines[0] || null;
          setForm((prev) => ({
            ...prev,
            projectServiceId: firstLine?.projectServiceId
              ? String(firstLine.projectServiceId)
              : prev.projectServiceId,
            quotationServiceId: firstLine?.quotationServiceId
              ? String(firstLine.quotationServiceId)
              : prev.quotationServiceId,
            quotationId: firstLine?.quotationId
              ? String(firstLine.quotationId)
              : prev.quotationId,
            pricingMode: packageMode ? "package" : "line",
            packageVatRate: packageMode
              ? String(
                  packageAmounts.vatRate !== undefined &&
                    packageAmounts.vatRate !== null &&
                    packageAmounts.vatRate !== ""
                    ? packageAmounts.vatRate
                    : prev.packageVatRate !== undefined &&
                        prev.packageVatRate !== null &&
                        prev.packageVatRate !== ""
                      ? prev.packageVatRate
                      : "8",
                )
              : prev.packageVatRate,
            // Line mode: header totals come from the services table's
            // converted total (applyConvertedServiceTotals), not a raw sum.
            fixedAmount:
              hasAnySelection && packageMode
                ? String(packageAmounts.totalAmount)
                : prev.fixedAmount,
            subTotal:
              hasAnySelection && packageMode ? String(packageAmounts.subTotal) : prev.subTotal,
            vatAmount:
              hasAnySelection && packageMode ? String(packageAmounts.vatAmount) : prev.vatAmount,
            totalAmount:
              hasAnySelection && packageMode
                ? String(packageAmounts.totalAmount)
                : prev.totalAmount,
          }));
        };

        const toggleServiceSelection = (line) => {
          if (!line || line.locked) return;
          const id = lineKey(line);
          const nextIds = selectedServiceIds.includes(id)
            ? selectedServiceIds.filter((item) => item !== id)
            : [...selectedServiceIds, id];
          applyServiceSelection(nextIds);
        };

        const selectAllAvailableServices = () => {
          applyServiceSelection(
            serviceLines
              .filter((line) => !line.locked)
              .map((line) => lineKey(line)),
          );
        };

        const clearServiceSelection = () => {
          applyServiceSelection([]);
        };

        const selectedCaseServiceLines = selectedContractServiceLines.length
          ? selectedContractServiceLines
          : serviceLines.filter((line) => !line.locked);

        const caseServiceEditorRows = useMemo(
          () =>
            selectedCaseServiceLines.map((line) => ({
              ...line,
              id: lineKey(line),
              serviceId: line.serviceId ? String(line.serviceId) : "",
              serviceName: line.serviceName || "",
              serviceType: line.serviceType || "",
              description: line.description || "",
              currencyId: getRecordCurrencyId(line)
                ? String(getRecordCurrencyId(line))
                : "",
              basePrice: line.basePrice ? String(line.basePrice) : "",
              vat:
                line.vat !== undefined && line.vat !== null ? String(line.vat) : "0",
            })),
          [selectedCaseServiceLines],
        );

        // Combines pre-loaded rows with manually-added ones (individual or via a
        // combo's own "+ Add service") for the services table. A manual row
        // tagged with a "persisted-*" _comboInstanceId (added into a combo
        // section that came from the source Case/Quotation, not applied fresh in
        // this session — see onAddServiceToCombo) is spliced in right after that
        // section's last pre-loaded row so it renders inside the section instead
        // of trailing after every case row as a stray duplicate section. Rows
        // added fresh this session (real appliedCombos instanceId, or untagged)
        // are simply appended at the end, same as before.
        const mergedServiceRows = useMemo(() => {
          const taggedManual = manualServiceRows.map((row) => ({
            ...row,
            _isManualAddition: true,
          }));
          const persistedInstanceIds = Array.from(
            new Set(
              taggedManual
                .filter((row) =>
                  String(row._comboInstanceId || "").startsWith("persisted-"),
                )
                .map((row) => row._comboInstanceId),
            ),
          );
          const result = [...caseServiceEditorRows];
          persistedInstanceIds.forEach((instanceId) => {
            const rowsForInstance = taggedManual.filter(
              (row) => row._comboInstanceId === instanceId,
            );
            let insertAt = result.length;
            for (let i = result.length - 1; i >= 0; i--) {
              if (getPersistedComboGroupKey(result[i]) === instanceId) {
                insertAt = i + 1;
                break;
              }
            }
            result.splice(insertAt, 0, ...rowsForInstance);
          });
          const freshManualRows = taggedManual.filter(
            (row) => !String(row._comboInstanceId || "").startsWith("persisted-"),
          );
          return [...result, ...freshManualRows];
        }, [caseServiceEditorRows, manualServiceRows]);

        const removeCaseServiceLineRow = (rowId) => {
          // At least one pre-loaded service must stay selected — otherwise
          // there'd be no reason this contract is linked to that Case/Quotation
          // at all. Removing extra manually-added services has no such limit.
          if (selectedServiceIds.length <= 1) {
            message.warning(
              tr("Keep at least one service from the source Case/Quotation."),
            );
            return;
          }
          applyServiceSelection(
            selectedServiceIds.filter((id) => String(id) !== String(rowId)),
          );
        };

        const applyQuotationToForm = async (
          quotationId,
          quotationOverride = null,
        ) => {
          if (!quotationId) {
            setF("quotationId", "");
            return;
          }

          const listRecord =
            quotationOverride ||
            quotations.find((q) => String(q.id) === String(quotationId)) ||
            {};
          const detailRecord = await fetchQuotationDetail(quotationId);
          const quotation = { ...listRecord, ...(detailRecord || {}) };
          const customerId = quotationCustomerId(quotation);
          const internalCompanyId = quotationInternalCompanyId(quotation);
          const lawyerId = quotationLawyerId(quotation);
          const quotationParentId =
            extractId(quotation.parentId) ||
            extractId(quotation.parent) ||
            extractId(quotation.parentQuotation);
          const popupParams = getPopupParams();
          const targetProjectServiceId =
            form.projectServiceId ||
            (popupParams.projectServiceId
              ? String(popupParams.projectServiceId)
              : "");
          const targetQuotationServiceId =
            form.quotationServiceId ||
            (popupParams.quotationServiceId
              ? String(popupParams.quotationServiceId)
              : "");
          const targetServiceId = popupParams.serviceId
            ? String(popupParams.serviceId)
            : "";

          let projectService = null;
          let targetLine = null;
          try {
            if (targetProjectServiceId) {
              const psRes = await ctx.api.request({
                url: "projectServices:get",
                params: {
                  filterByTk: targetProjectServiceId,
                  appends: ["services"],
                },
              });
              projectService = unwrapRecord(psRes);
            }
            const qsRes = await ctx.api.request({
              url: "quotationServices:list",
              params: {
                filter: JSON.stringify({
                  quotationId: { $eq: parseInt(quotationId, 10) },
                }),
                pageSize: 500,
              },
            });
            const qLines = qsRes?.data?.data || [];
            targetLine =
              qLines.find(
                (line) => String(line.id) === String(targetQuotationServiceId),
              ) ||
              qLines.find((line) => {
                const qServiceId =
                  extractId(line.serviceId) || extractId(line.service);
                const psServiceId =
                  extractId(projectService?.serviceId) ||
                  extractId(projectService?.services);
                return (
                  qServiceId &&
                  (String(qServiceId) === String(psServiceId) ||
                    String(qServiceId) === String(targetServiceId))
                );
              }) ||
              (qLines.length === 1 ? qLines[0] : null) ||
              null;
          } catch (error) {
            console.warn(
              "[ContractCreateForm] Could not load quotation service context",
              error,
            );
          }

          const targetProjectId =
            extractId(projectService?.projectId) ||
            extractId(projectService?.project) ||
            extractId(projectService?.projects) ||
            extractId(quotation.projectId) ||
            extractId(quotation.project) ||
            extractFirstId(quotation.cases) ||
            extractId(popupParams.projectId) ||
            extractId(popupParams.caseId);
          const amountSource = targetLine || quotation;
          const lineAmounts = resolveServiceAmounts(
            targetLine,
            projectService,
            popupParams,
          );
          const quotationAmounts = resolveServiceAmounts({
            basePrice: firstPresent(amountSource, ["basePrice"]),
            quantity: firstPresent(amountSource, ["quantity"]),
            vat: firstPresent(amountSource, ["vat"]),
            subTotal: firstPresent(amountSource, ["subTotal"]),
            vatAmount: firstPresent(amountSource, ["vatAmount"]),
            totalAmount: firstPresent(amountSource, ["totalAmount", "grandTotal"]),
          });
          const packageMode =
            isPackageSource(targetLine) ||
            isPackageSource(projectService) ||
            isPackageSource(quotation);
          const packageAmounts = packageMode
            ? resolvePackageAmounts(targetLine, projectService, quotation)
            : null;
          const amountPatch =
            targetLine && !packageMode
              ? {
                  fixedAmount: lineAmounts.totalAmount
                    ? String(lineAmounts.totalAmount)
                    : "",
                  subTotal: lineAmounts.subTotal ? String(lineAmounts.subTotal) : "",
                  vatAmount:
                    lineAmounts.subTotal || lineAmounts.totalAmount
                      ? String(lineAmounts.vatAmount)
                      : "",
                  totalAmount: lineAmounts.totalAmount
                    ? String(lineAmounts.totalAmount)
                    : "",
                  scopeNote:
                    targetLine.description || projectService?.description || "",
                }
              : {
                  fixedAmount: (
                    packageMode
                      ? packageAmounts.totalAmount
                      : quotationAmounts.totalAmount
                  )
                    ? String(
                        packageMode
                          ? packageAmounts.totalAmount
                          : quotationAmounts.totalAmount,
                      )
                    : "",
                  subTotal: (
                    packageMode ? packageAmounts.subTotal : quotationAmounts.subTotal
                  )
                    ? String(
                        packageMode
                          ? packageAmounts.subTotal
                          : quotationAmounts.subTotal,
                      )
                    : "",
                  vatAmount: (
                    packageMode
                      ? packageAmounts.subTotal || packageAmounts.totalAmount
                      : quotationAmounts.subTotal || quotationAmounts.totalAmount
                  )
                    ? String(
                        packageMode
                          ? packageAmounts.vatAmount
                          : quotationAmounts.vatAmount,
                      )
                    : "",
                  totalAmount: (
                    packageMode
                      ? packageAmounts.totalAmount
                      : quotationAmounts.totalAmount
                  )
                    ? String(
                        packageMode
                          ? packageAmounts.totalAmount
                          : quotationAmounts.totalAmount,
                      )
                    : "",
                  scopeNote:
                    targetLine?.description || projectService?.description || "",
                };
          const isInitialOrSameQuotation =
            !form.quotationId || String(quotationId) === String(form.quotationId);
          const preselectedIds = isInitialOrSameQuotation
            ? selectedServiceIds.length
              ? selectedServiceIds
              : popupParams.projectServiceIds || popupParams.projectServiceId
            : null;

          if (targetProjectId) {
            await loadCaseServiceLines({
              projectId: targetProjectId,
              preselectedProjectServiceId: targetProjectServiceId || null,
              preselectedProjectServiceIds: preselectedIds,
              knownProjectService: projectService,
              knownQuotation: quotation,
              knownProject: projects.find(
                (item) => String(extractId(item?.id)) === String(targetProjectId),
              ),
              quotationId,
              knownQuotations: [quotation],
            });
          }

          setForm((prev) =>
            deriveForm(prev, {
              quotationId: String(quotationId),
              pricingMode: packageMode ? "package" : "line",
              packageVatRate: packageMode
                ? String(
                    packageAmounts.vatRate !== undefined &&
                      packageAmounts.vatRate !== null &&
                      packageAmounts.vatRate !== ""
                      ? packageAmounts.vatRate
                      : prev.packageVatRate !== undefined &&
                          prev.packageVatRate !== null &&
                          prev.packageVatRate !== ""
                        ? prev.packageVatRate
                        : "8",
                  )
                : prev.packageVatRate,
              customerId: customerId ? String(customerId) : prev.customerId,
              internalCompanyId: internalCompanyId
                ? String(internalCompanyId)
                : prev.internalCompanyId,
              lawyerId: lawyerId ? String(lawyerId) : prev.lawyerId,
              projectId: targetProjectId ? String(targetProjectId) : prev.projectId,
              projectServiceId: targetProjectServiceId || prev.projectServiceId,
              quotationServiceId:
                targetQuotationServiceId ||
                (extractId(targetLine?.id)
                  ? String(extractId(targetLine.id))
                  : prev.quotationServiceId),
              contractKind: quotationParentId ? "appendix" : prev.contractKind,
              contractName:
                prev.contractName ||
                (targetLine?.serviceName
                  ? `Contract - ${targetLine.serviceName}`
                  : prev.contractName),
              ...amountPatch,
              // Line mode: the services table's converted total wins over
              // targetLine's (one service) / the quotation header's amounts.
              ...(packageMode
                ? null
                : lineModeTotalsPatch(lastConvertedTotalsRef.current, null)),
            }),
          );
        };

        const handleCustomerChange = (customerId) => {
          setForm((prev) => {
            const currentQuotation = quotations.find(
              (q) => String(q.id) === String(prev.quotationId),
            );
            const currentQuotationCustomerId = quotationCustomerId(currentQuotation);
            const keepQuotation =
              !customerId ||
              !prev.quotationId ||
              !currentQuotationCustomerId ||
              String(currentQuotationCustomerId) === String(customerId);

            return {
              ...prev,
              customerId,
              quotationId: keepQuotation ? prev.quotationId : "",
            };
          });
        };

        const handleProjectChange = async (projectId) => {
          setForm((prev) => ({
            ...prev,
            projectId,
            projectServiceId: "",
            quotationServiceId: "",
          }));
          const result = await loadCaseServiceLines({
            projectId: projectId ? parseInt(projectId, 10) : null,
            preselectedProjectServiceId: null,
            knownProject: projects.find(
              (item) => String(extractId(item?.id)) === String(projectId),
            ),
            knownQuotations: quotations,
          });
          applyServiceSelection(result.selectedIds, result.lines);
        };

        const isRetainer = form.contractType === "retainer";
        // Priced service lines set the contract total (Σ lines, kept by the
        // database): "Total amount" then shows it read-only.
        const totalFromLines = contractTotalFromLines({
          rows: [...selectedContractServiceLines, ...manualServiceRows],
          isRetainer,
          packageMode: form.pricingMode === "package",
        });
        // Distinct from !isRetainer (which also matches byService) —
        // installment-based Billing Cycle/Payment Schedule only make sense
        // for By Case; By Service's billing lives per-service on
        // contractServices/tasks instead (see the unified data model spec).
        const isByCase = form.contractType === "byCase";
        const isByService = form.contractType === "byService";
        // Task data for trigger configuration is needed by By Service (per
        // service) and by By Case Multiple payments (per installment). Not via
        // isMultiplePayments — that const is declared further down.
        // 2026-09-29: One time too (its single payment's trigger tasks).
        const triggerFeatureOn = isByService || isByCase;

        // One entry per service line the contract will create, in Services
        // table order — same identity convention as the payment schedule's
        // service tags: lineKey(line) for catalog lines, row.id for manual rows.
        const triggerLines = useMemo(
          () => [
            ...selectedContractServiceLines.map((line) => ({
              key: lineKey(line),
              name: line.serviceName || `Service #${lineKey(line)}`,
              serviceId: extractId(line.serviceId) ? String(extractId(line.serviceId)) : null,
              projectServiceId: extractId(line.projectServiceId)
                ? String(extractId(line.projectServiceId))
                : null,
            })),
            ...manualServiceRows
              .filter((row) => row.serviceName || row.serviceId)
              .map((row) => ({
                key: row.id,
                name: row.serviceName || "Custom service",
                serviceId: extractId(row.serviceId) ? String(extractId(row.serviceId)) : null,
                projectServiceId: null,
              })),
          ],
          [selectedContractServiceLines, manualServiceRows],
        );
        // Same resolution handleSubmit uses for projectId.
        const triggerProjectId =
          getConfiguredProjectId() || (form.projectId ? parseInt(form.projectId, 10) : null);
        const triggerLineSignature = triggerLines
          .map((line) => `${line.key}:${line.serviceId || ""}:${line.projectServiceId || ""}`)
          .join("|");
        const triggerCaseName = useMemo(() => {
          const project = projects.find(
            (item) => String(extractId(item?.id)) === String(triggerProjectId),
          );
          // Same label the "Case" select shows (projectOptions uses caseLabel).
          return project ? caseLabel(project) : "";
        }, [projects, triggerProjectId]);

        useEffect(() => {
          if (!triggerFeatureOn) {
            triggerScopeRef.current = "";
            setTriggerSource(null);
            setTriggerTasksByLine({});
            setTriggerSelection({});
            setInstallmentTriggerSelection({});
            setTriggerError("");
            setTriggerLoading(false);
            return undefined;
          }
          let cancelled = false;
          const source = triggerProjectId ? "case" : "template";
          const scope = triggerScopeKey(triggerProjectId);
          const scopeChanged = triggerScopeRef.current !== scope;
          // Different task universe (Case switched/cleared): drop the old
          // one's data right away so nothing from it can be shown or
          // submitted while the new scope loads (or if its load fails).
          const clearTriggerData = () => {
            triggerScopeRef.current = "";
            triggerRecordsCacheRef.current = null;
            triggerMatchRef.current = {};
            setTriggerSource(null);
            setTriggerTasksByLine({});
            setTriggerSelection({});
            setInstallmentTriggerSelection({});
          };
          if (scopeChanged) clearTriggerData();
          const load = async () => {
            setTriggerError("");
            try {
              const { records, cache } = await loadTriggerRecords({
                source,
                projectId: triggerProjectId,
                lines: triggerLines,
                request: (options) => {
                  // Spinner only for a real fetch — a cache hit (services
                  // list edited, same Case / same service set) just re-groups.
                  if (!cancelled) setTriggerLoading(true);
                  return ctx.api.request(options);
                },
                cache: triggerRecordsCacheRef.current,
              });
              if (cancelled) return;
              triggerRecordsCacheRef.current = cache;
              const tasksByLine = groupTriggerTasks(source, triggerLines, records);
              const nextMatch = triggerMatchMap(source, triggerLines);
              const resetKeys = changedTriggerLineKeys(triggerMatchRef.current, nextMatch);
              triggerMatchRef.current = nextMatch;
              triggerScopeRef.current = scope;
              setTriggerSource(source);
              setTriggerTasksByLine(tasksByLine);
              setTriggerSelection((prev) =>
                mergeTriggerSelection(scopeChanged ? {} : prev, tasksByLine, resetKeys),
              );
            } catch (error) {
              console.warn("[ContractCreateForm] Could not load payment trigger tasks:", error);
              if (!cancelled) {
                clearTriggerData();
                setTriggerError(
                  tr("Could not load tasks — you can set payment triggers later in Task detail."),
                );
              }
            } finally {
              if (!cancelled) setTriggerLoading(false);
            }
          };
          load();
          return () => {
            cancelled = true;
          };
          // triggerLines is captured via triggerLineSignature (its identity
          // changes on every services edit; the signature only when it matters).
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [triggerFeatureOn, triggerProjectId, triggerLineSignature]);

        const toggleTrigger = (key, taskId, checked) => {
          markDirty();
          setTriggerSelection((prev) => {
            const current = new Set(prev[key] || []);
            if (checked) current.add(taskId);
            else current.delete(taskId);
            return { ...prev, [key]: [...current] };
          });
        };

        // By Service + Combo pricing: locked, editable Payment Request amount
        // per service (docs/superpowers/specs/2026-09-25-by-service-package-allocation-ui-design.md).
        // Price reference for the suggestion: a combo service's price inside
        // its combo (applied row snapshot, else the catalog combo's item),
        // otherwise the service's catalog price. Currency differences between
        // references are not converted — it's only a starting suggestion the
        // lawyer can edit.
        // By Service + Combo pricing → per-item billing (combo / standalone
        // service), spec 2026-09-25 (replaces the per-service allocation).
        const comboBillingActive = isByService && form.pricingMode === "package";
        const allocationActive = comboBillingActive;
        const packagePriceReference = (key) => {
          const manualRow = manualServiceRows.find((row) => row.id === key);
          const line = manualRow || selectedContractServiceLines.find((item) => lineKey(item) === key);
          if (!line) return 0;
          const snapshotPrice = parseNum(line?._comboItemSnapshot?.price);
          if (snapshotPrice > 0) return snapshotPrice;
          const serviceIdVal = extractId(line.serviceId);
          const comboIdVal = extractId(line._comboCatalogId) || extractId(line.comboId);
          if (comboIdVal && serviceIdVal) {
            const catalogCombo = combos.find((combo) => extractId(combo.id) === comboIdVal);
            const item = (catalogCombo?.serviceComboItems || []).find(
              (it) =>
                extractId(it.serviceId || it.services) === serviceIdVal ||
                extractId(it.services?.id) === serviceIdVal,
            );
            const comboPrice = parseNum(item?.price);
            if (comboPrice > 0) return comboPrice;
          }
          if (serviceIdVal) {
            const catalogService = companyServiceOptions.find(
              (item) => extractId(serviceOptionServiceId(item)) === serviceIdVal,
            );
            const catalogPrice = parseNum(
              serviceCatalogPrice(catalogService) ??
                serviceCatalogPrice(catalogService?.services || catalogService?.service || {}),
            );
            if (catalogPrice > 0) return catalogPrice;
          }
          return 0;
        };
        // The combo's own price: a combo applied in this form carries its own
        // amount on its rows (packageSubTotal = comboOwnAmount); so does a
        // combo from the source Case/Quotation (that document's amount for the
        // combo, which may differ from the catalog) — only without one does it
        // fall back to the catalog combo's price. These weights split the
        // contract subtotal back over the combos on submit, so a Case's own
        // combo amounts carry over unchanged (2026-09-25).
        const comboOwnPrice = (line) => {
          if (line?._comboInstanceId) return parseNum(line.packageSubTotal);
          const sourceComboAmount = parseNum(line?.packageSubTotal);
          if (sourceComboAmount > 0 && (line?.comboId || line?.comboName)) return sourceComboAmount;
          const comboIdVal = extractId(line?._comboCatalogId) || extractId(line?.comboId);
          if (!comboIdVal) return 0;
          const catalogCombo = combos.find((combo) => extractId(combo.id) === comboIdVal);
          return parseNum(catalogCombo?.packageSubTotal);
        };
        // By Service + Combo pricing billing items (combos + standalone
        // services) — see the "combo billing helpers" block. Reuses the
        // installment machinery below (installmentItems/installmentSelection)
        // for task ticking, and the allocation state for the amounts.
        // Computed for every Combo pricing contract (not only By Service): the
        // same groups decide each saved row's share of the package subtotal
        // (packageGroupFieldsFor) — Case views sum one amount per group.
        const comboItems = useMemo(() => {
          if (form.pricingMode !== "package") return [];
          return comboBillingItems(
            triggerLines.map((triggerLine) => {
              const manualRow = manualServiceRows.find((row) => row.id === triggerLine.key);
              const line =
                manualRow || selectedContractServiceLines.find((item) => lineKey(item) === triggerLine.key) || {};
              return {
                key: triggerLine.key,
                name: triggerLine.name,
                comboId: extractId(line._comboCatalogId) || extractId(line.comboId) || null,
                comboName: line.comboName || null,
                _comboInstanceId: line._comboInstanceId || null,
                _comboName: line._comboName || null,
                weight: packagePriceReference(triggerLine.key),
                comboWeight: comboOwnPrice(line),
              };
            }),
          );
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [form.pricingMode, triggerLines, manualServiceRows, selectedContractServiceLines, combos, companyServiceOptions]);
        const allocationEntries = comboItems.map((item) => ({
          key: item.key,
          weight: item.weight,
          // With a Case, a service added in this form has no projectService
          // (so no tasks): that part of the item could never be triggered.
          notInCase:
            !!triggerProjectId &&
            item.serviceKeys.some(
              (serviceKey) => !triggerLines.find((line) => line.key === serviceKey)?.projectServiceId,
            ),
        }));
        const allocationPool = parseNum(form.totalAmount);
        const [allocationOverrides, setAllocationOverrides] = useState({});
        // A typed value — including "" (cleared, = 0) — stays as typed; the
        // items not edited share the rest of the Total amount automatically
        // (allocateWithOverrides). Nothing typed = the suggestion.
        const packageAmounts = allocateWithOverrides(allocationEntries, allocationPool, allocationOverrides);
        const allocationKeySignature = allocationEntries.map((entry) => entry.key).join("|");
        // Drop typed amounts of lines that are gone (a re-added line starts
        // from the suggestion again) and start fresh when Combo pricing is
        // switched on/off.
        useEffect(() => {
          setAllocationOverrides((prev) => {
            const keep = new Set(allocationKeySignature ? allocationKeySignature.split("|") : []);
            const next = Object.fromEntries(Object.entries(prev).filter(([key]) => keep.has(key)));
            return Object.keys(next).length === Object.keys(prev).length ? prev : next;
          });
        }, [allocationKeySignature]);
        useEffect(() => {
          setAllocationOverrides({});
        }, [allocationActive]);
        const packageAllocationStatus = allocationStatus(
          packageAmounts,
          allocationEntries.map((entry) => entry.key),
          allocationPool,
        );
        const packageAllocationWarnings = allocationWarnings(allocationEntries, packageAmounts, allocationPool);
        const changeAllocationAmount = (key, value) => {
          markDirty();
          setAllocationOverrides((prev) => ({ ...prev, [key]: value }));
        };
        // Combo pricing: each saved service row carries its GROUP's share of
        // the contract package subtotal (group = a combo, or a standalone
        // service). Case views sum one packageSubTotal per group, so the
        // groups must add up to the contract's Combo Subtotal — previously a
        // Combo Subtotal edited on the contract (70,000,000 for combos priced
        // 62,823,600 + 15,000,000) never reached the rows and the Case summed
        // 77,823,600 (2026-09-25 bug). Shares: By Service → pro-rata to each
        // item's Payment Request amount; otherwise combos pro-rata to their
        // own price and standalone lines 0 ("included in package").
        const packageGroupShares = suggestPackageAllocation(
          comboItems.map((item) => ({
            key: item.key,
            weight: allocationActive ? packageAmounts[item.key] || 0 : item.isCombo ? item.weight : 0,
          })),
          parseNum(form.subTotal || form.fixedAmount),
        );
        const packageGroupOfLine = {};
        comboItems.forEach((item) => {
          item.serviceKeys.forEach((serviceKey) => {
            packageGroupOfLine[serviceKey] = item.key;
          });
        });
        const packageGroupFieldsFor = (serviceKey) => {
          if (form.pricingMode !== "package") return {};
          const groupKey = packageGroupOfLine[serviceKey];
          if (!groupKey) return {};
          const subTotal = packageGroupShares[groupKey] || 0;
          const vatRate = parseNum(form.packageVatRate) || 0;
          const vatAmount = roundAmount((subTotal * vatRate) / 100);
          return {
            packageSubTotal: subTotal,
            packageVatRate: vatRate,
            packageVatAmount: vatAmount,
            packageTotalAmount: subTotal + vatAmount,
          };
        };
        const withPackageGroupFields = (payload, serviceKey) =>
          payload ? { ...payload, ...packageGroupFieldsFor(serviceKey) } : payload;

        // Editing the Combo Subtotal itself: spread it over the combos applied
        // in this form, pro-rata to their current amounts, so each combo's
        // header price stays consistent with the total. (Combos that came
        // from the source Case/Quotation aren't editable here — the saved
        // rows are still normalized by packageGroupFieldsFor on submit.)
        const redistributeComboSubtotal = (value) => {
          const nextSubTotal = Math.max(0, parseNum(value));
          const vatRate = parseNum(form.packageVatRate) || 0;
          const hasSourceCombos = selectedContractServiceLines.some((line) => line.comboId || line.comboName);
          if (appliedCombos.length && !hasSourceCombos) {
            const shares = suggestPackageAllocation(
              appliedCombos.map((combo) => ({ key: combo.instanceId, weight: parseNum(combo.convertedAmount) })),
              nextSubTotal,
            );
            setAppliedCombos((prev) =>
              prev.map((combo) =>
                shares[combo.instanceId] !== undefined ? { ...combo, convertedAmount: shares[combo.instanceId] } : combo,
              ),
            );
            setManualServiceRows((prev) =>
              prev.map((row) => {
                const share = shares[row._comboInstanceId];
                if (share === undefined) return row;
                const rowVatAmount = roundAmount((share * vatRate) / 100);
                return {
                  ...row,
                  packageSubTotal: share,
                  packageVatRate: vatRate,
                  packageVatAmount: rowVatAmount,
                  packageTotalAmount: share + rowVatAmount,
                };
              }),
            );
          }
          syncPackageTotals(nextSubTotal, vatRate);
        };

        const autoDistributeAllocation = () => {
          markDirty();
          setAllocationOverrides({});
        };
        // Line pricing (By Service): read-only preview of what each service's
        // Payment Request will be — its own line total, in its own currency.
        const lineAmountPreview = useMemo(() => {
          if (!isByService || allocationActive) return null;
          const amounts = {};
          const texts = {};
          triggerLines.forEach((triggerLine) => {
            const manualRow = manualServiceRows.find((row) => row.id === triggerLine.key);
            const line =
              manualRow || selectedContractServiceLines.find((item) => lineKey(item) === triggerLine.key);
            if (!line) return;
            const total = manualRow
              ? manualServiceLineAmounts(manualRow, false, getCurrencyDecimals(findCurrencyById(currencies, manualRow.currencyId) || findDefaultCurrency(currencies))).totalAmount
              : resolveServiceAmounts(line).totalAmount;
            amounts[triggerLine.key] = Number(total) || 0;
            texts[triggerLine.key] = formatMoneyByCurrency(
              Number(total) || 0,
              currencyFromRecord(line, currencies, selectedCurrency),
            );
          });
          return { amounts, texts };
        }, [
          isByService,
          allocationActive,
          triggerLines,
          manualServiceRows,
          selectedContractServiceLines,
          currencies,
          selectedCurrency,
        ]);
        const isAppendixContract = useMemo(() => {
          const popupParams = getPopupParams();
          const popupMode = String(
            popupParams.contractMode || popupParams.mode || "",
          ).toLowerCase();
          const popupIsMain = popupParams.isMainContract;
          const quotationParentId =
            extractId(selectedQuotation?.parentId) ||
            extractId(selectedQuotation?.parent) ||
            extractId(selectedQuotation?.parentQuotation);

          return (
            popupMode === "appendix" ||
            popupMode === "sub" ||
            popupMode === "sub-contract" ||
            popupIsMain === false ||
            popupIsMain === "false" ||
            !!form.parentId ||
            !!quotationParentId
          );
        }, [form.parentId, selectedQuotation?.id, selectedQuotation?.parentId]);
        const requestedCodePrefix = String(
          getPopupParams().codePrefix || "",
        ).toUpperCase();
        const autoCodePrefix =
          isAppendixContract || requestedCodePrefix === "PL" ? "PL" : "CT";
        const setRetainerField = (key, value) => {
          markDirty();
          setForm((prev) => {
            const patch = { [key]: value };
            if (key === "retainerDuration") {
              patch.retainerRepeatInterval = value || "1";
            }
            if (key === "retainerRepeatUnit") {
              patch.retainerRepeatAnchorType = value;
              patch.retainerRepeatAnchorValue = "1";
              patch.retainerRepeatInterval = prev.retainerDuration || "1";
            }
            return deriveForm(prev, patch);
          });
        };
        const paymentScheduleRows =
          form.paymentSchedule && form.paymentSchedule.length
            ? form.paymentSchedule
            : [newPaymentScheduleRow(1)];
        const isMultiplePayments = form.billingCycle === "multiple_payments";
        const showPaymentSchedule = isByCase && isMultiplePayments;
        // By Case One time: trigger tasks for its single payment
        const showOneTimeTriggers = isByCase && !isMultiplePayments;

        // By Case trigger tasks per installment — see the "installment trigger
        // helpers" block. installmentSelection is the pruned view (current
        // installments, tasks their tagged services offer, one installment per
        // task) that both the popup and submit use.
        // By Case: one item per Payment Schedule row. By Service + Combo
        // pricing: one item per combo / standalone service (comboItems) —
        // same ticking/locking/linking machinery for both.
        const installmentItems = useMemo(
          () =>
            showPaymentSchedule
              ? installmentTriggerItems(paymentScheduleRows)
              : comboBillingActive
                ? comboItems.map(({ key, name, serviceKeys }) => ({ key, name, serviceKeys }))
                : showOneTimeTriggers
                  ? [oneTimeTriggerItem(triggerLines)]
                  : [],
          // paymentScheduleRows is a fresh array every render when the form has
          // no rows (By Service) — only depend on it when it's actually used.
          // eslint-disable-next-line react-hooks/exhaustive-deps
          [
            showPaymentSchedule,
            showPaymentSchedule ? paymentScheduleRows : null,
            comboBillingActive,
            comboItems,
            showOneTimeTriggers,
            showOneTimeTriggers ? triggerLines : null,
          ],
        );
        const installmentSelection = useMemo(
          () =>
            pruneInstallmentSelection(
              installmentTriggerSelection,
              installmentItems,
              triggerLines,
              triggerTasksByLine,
            ),
          [installmentTriggerSelection, installmentItems, triggerLines, triggerTasksByLine],
        );
        const installmentSectionItems = useMemo(
          () =>
            installmentItems.map((item) => ({
              key: item.key,
              name: item.name,
              groups: installmentTaskGroups(item, triggerLines, triggerTasksByLine).map((group) => ({
                label: group.lineName,
                tasks: group.tasks,
              })),
            })),
          [installmentItems, triggerLines, triggerTasksByLine],
        );
        // Write the pruned view back to state, so dropped ticks (service
        // untagged, installment removed, task no longer offered) are really
        // gone and can't reappear — e.g. to reclaim a task from a later
        // installment when a service is re-tagged.
        useEffect(() => {
          setInstallmentTriggerSelection((prev) => {
            const pruned = pruneInstallmentSelection(prev, installmentItems, triggerLines, triggerTasksByLine);
            return sameInstallmentSelection(prev, pruned) ? prev : pruned;
          });
        }, [installmentItems, triggerLines, triggerTasksByLine]);
        const installmentOwner = installmentLinkOwner(installmentSelection, installmentItems);
        const installmentTasksById = useMemo(
          () =>
            Object.fromEntries(
              Object.values(triggerTasksByLine || {})
                .flat()
                .map((task) => [task.id, task]),
            ),
          [triggerTasksByLine],
        );
        const installmentLockedBy = (itemKey, taskId) => {
          const ownerKey = installmentOwner[taskId];
          if (ownerKey && ownerKey !== itemKey) {
            return (
              installmentItems.find((item) => item.key === ownerKey)?.name ||
              (comboBillingActive ? tr("another item") : tr("another installment"))
            );
          }
          // Already linked to an existing installment (e.g. the Case's main
          // contract) — re-link it in Task Management if that's intended.
          if (!ownerKey && installmentTasksById[taskId]?.linkedPaymentRequestId) {
            return comboBillingActive ? tr("another contract's Payment Request") : tr("another contract's installment");
          }
          return null;
        };
        const toggleInstallmentTrigger = (itemKey, taskId, checked) => {
          markDirty();
          setInstallmentTriggerSelection((prev) =>
            toggleInstallmentTick(prev, installmentItems, triggerLines, triggerTasksByLine, itemKey, taskId, checked),
          );
        };
        // "First payment" only means anything for By Case's own one-time
        // billing cycle (feeds buildPaymentSchedulePayload's firstPaymentDate)
        // or for Retainer (its own first billing date) — By Service has no
        // single "first payment" at all, its Payment Requests are created
        // per-service, driven by tasks.isPaymentTrigger, never by this date
        // (§6i audit: was `!isRetainer`, which also matched byService).
        // Rendered once, in "Commercial Terms" (merged in from the old
        // separate "Contract Date"/"Retainer schedule" Sections, 2026-09-22,
        // §6r) — By Case's and Retainer's "First payment" both read/write the
        // exact same form.paymentDate via handlePaymentDateChange (verified
        // equivalent to setRetainerField for this key), so one Field covers
        // both instead of 2 near-duplicate ones in 2 different sections.
        const showFirstPaymentDate = (isByCase && !isMultiplePayments) || isRetainer;
        // "End date" (contract validity) — By Case/By Service via a plain
        // date input, Retainer via calcRetainerEndDate through the exact same
        // form.endDate/setF pairing (both were previously separate Fields
        // bound to the same value, one per Section — merged into one,
        // §6r). Always relevant now, so no gate at all.
        const nextPaymentDate = isRetainer
          ? calcRetainerNextPaymentDate(form.paymentDate, 1, form.retainerRepeatUnit)
          : "";
        const paymentBaseAmount = parseNum(form.totalAmount);
        // Options for each installment row's "Service" multi-select — every
        // service already selected above (catalog lines keyed by lineKey(line),
        // manual rows keyed by their own local row.id). Resolved to real
        // contractServiceId values at submit time via contractServiceKeyMap,
        // once those service rows actually exist in the DB.
        const paymentScheduleServiceOptions = useMemo(
          () => [
            ...selectedContractServiceLines.map((line) => ({
              value: lineKey(line),
              label: line.serviceName || tr("Service #{0}", { 0: lineKey(line) }),
            })),
            ...manualServiceRows.map((row) => ({
              value: row.id,
              label: row.serviceName || tr("Custom service"),
            })),
          ],
          [selectedContractServiceLines, manualServiceRows],
        );

        const handlePaymentDateChange = (value) => setF("paymentDate", value);
        const syncPaymentScheduleRows = (rows) => {
          setForm((prev) => {
            return deriveForm(prev, { paymentSchedule: rows });
          });
        };

        const addPaymentScheduleRow = () => {
          setForm((prev) => {
            const currentRows =
              prev.paymentSchedule && prev.paymentSchedule.length
                ? prev.paymentSchedule
                : [newPaymentScheduleRow(1)];
            return {
              ...prev,
              paymentSchedule: [
                ...currentRows,
                newPaymentScheduleRow(currentRows.length + 1),
              ],
            };
          });
        };

        const deletePaymentScheduleRow = (rowId) => {
          const nextRows = paymentScheduleRows.filter((row) => row.id !== rowId);
          syncPaymentScheduleRows(
            nextRows.length ? nextRows : [newPaymentScheduleRow(1)],
          );
        };

        const updatePaymentScheduleRow = (rowId, field, value) => {
          const nextRows = paymentScheduleRows.map((row) =>
            row.id === rowId
              ? {
                  ...row,
                  [field]:
                    field === "amount" || field === "percentage"
                      ? moneyRaw(value)
                      : value,
                  ...(field === "percentage"
                    ? {
                        amount: String(
                          calcInstallmentAmount(value, paymentBaseAmount) || "",
                        ),
                      }
                    : {}),
                }
              : row,
          );
          syncPaymentScheduleRows(nextRows);
        };

        const handleContractTypeChange = (value) => {
          setForm((prev) => {
            const nextBillingCycle =
              value === "retainer"
                ? prev.billingCycle === "one_time"
                  ? "multiple_payments"
                  : prev.billingCycle
                : prev.billingCycle === "monthly"
                  ? "one_time"
                  : prev.billingCycle;

            return deriveForm(prev, {
              contractType: value,
              billingCycle: nextBillingCycle,
              retainerRepeatAnchorType:
                value === "retainer"
                  ? prev.retainerRepeatUnit || "month"
                  : prev.retainerRepeatAnchorType,
              retainerRepeatAnchorValue:
                value === "retainer"
                  ? prev.retainerRepeatAnchorValue || "1"
                  : prev.retainerRepeatAnchorValue,
              retainerRepeatInterval:
                value === "retainer"
                  ? prev.retainerDuration || "1"
                  : prev.retainerRepeatInterval,
              retainerRepeatUnit:
                value === "retainer"
                  ? prev.retainerRepeatUnit || "month"
                  : prev.retainerRepeatUnit,
              retainerDuration: value === "retainer" ? prev.retainerDuration : "",
            });
          });
        };

        useEffect(() => {
          if (!selectedQuotation) return;
          applyQuotationToForm(selectedQuotation.id);
        }, [selectedQuotation?.id, form.contractType]);

        const customerOptions = customers.map((item) => ({
          value: String(item.id),
          label: customerLabel(item),
          subLabel: customerOverview(item),
        }));

        const companyOptions = companies.map((item) => ({
          value: String(item.id),
          label: companyLabel(item),
        }));

        const lawyerOptions = lawyers.map((item) => ({
          value: String(item.id),
          label: lawyerLabel(item),
        }));

        // templateKey classifies templates by module — actual enum values are
        // plural ("contracts" | "quotations" | "payroll" | "tasks" | "other",
        // confirmed live via JsField/DiagnoseContractTemplateFilter.js, 2026-
        // 09-22). This call site was passing "contract" (singular) — matched
        // ZERO records, silently hiding every template tagged "contracts".
        // Templates without templateKey at all predate the field and stay
        // visible everywhere until manually tagged. The currently selected
        // template is always kept so editing an existing record never blanks it.
        const matchesTemplateModule = (t, key, selectedId) =>
          !t.templateKey || t.templateKey === key || String(t.id) === String(selectedId);

        const templateOptions = templates
          .filter((t) => matchesTemplateModule(t, "contracts", form.templateId))
          .map((item) => ({
            value: String(item.id),
            label: labelOf(item, ["name", "templateName", "title"], tr("Template")),
          }));

        // Quotations of the chosen customer, fresh from the server (2026-09-25):
        // the list loaded when the form opened goes stale — a quotation
        // created afterwards in another tab/popup never showed up here.
        useEffect(() => {
          const customerId = extractId(form.customerId);
          if (!customerId) return undefined;
          let alive = true;
          fetchAll("quotations:list", {
            filter: JSON.stringify({ customerId: { $eq: customerId } }),
          }).then((rows) => {
            if (!alive || !rows.length) return;
            setQuotations((prev) => rows.reduce((acc, row) => mergeRecordById(acc, row), prev));
          });
          return () => {
            alive = false;
          };
        }, [form.customerId]);

        const filteredQuotations = useMemo(
          () =>
            form.customerId
              ? quotations.filter(
                  (item) =>
                    String(item.id) === String(form.quotationId) ||
                    String(quotationCustomerId(item)) === String(form.customerId),
                )
              : quotations,
          [quotations, form.customerId, form.quotationId],
        );

        const quotationOptions = filteredQuotations.map((item) => ({
          value: String(item.id),
          label: quotationLabel(item),
          subLabel: quotationOverview(item, customers, currencies),
        }));

        const projectOptions = projects.map((item) => ({
          value: String(item.id),
          label: caseLabel(item),
          subLabel: relatedCustomerName(item, customers)
            ? tr("Customer: {0}", { 0: relatedCustomerName(item, customers) })
            : "",
        }));

        const manualRowsTotals = useMemo(
          () =>
            manualServiceRowsTotals(manualServiceRows, (row) =>
              getCurrencyDecimals(findCurrencyById(currencies, row.currencyId) || findDefaultCurrency(currencies)),
            ),
          [manualServiceRows, currencies],
        );

        const packageTotals = useMemo(() => {
          const subTotal = parseNum(form.subTotal || form.fixedAmount);
          const vatRate = parseNum(form.packageVatRate);
          const vatAmount = roundAmount((subTotal * vatRate) / 100);
          return {
            subTotal: roundAmount(subTotal),
            vatAmount,
            totalAmount: roundAmount(subTotal) + vatAmount,
          };
        }, [form.subTotal, form.fixedAmount, form.packageVatRate]);

        // Line pricing header totals are no longer summed here: a raw sum
        // across currencies was wrong (3,000,000 VND + 10 USD = 3,000,010).
        // ManualContractServicesSection reports its converted total through
        // onConvertedTotalsChange → applyConvertedServiceTotals, the single
        // writer of subTotal/vatAmount/totalAmount in line mode. `rows` is
        // kept in the signature for existing call sites.
        // eslint-disable-next-line no-unused-vars
        const syncManualLineTotals = (rows) => {
          setForm((prev) => (prev.pricingMode === "line" ? prev : { ...prev, pricingMode: "line" }));
        };

        const applyConvertedServiceTotals = useCallback((totals) => {
          lastConvertedTotalsRef.current = totals;
          const patch = convertedTotalsPatch(totals);
          if (!patch) return;
          setForm((prev) => {
            if (prev.pricingMode === "package") return prev;
            const unchanged = Object.keys(patch).every((key) => String(prev[key] ?? "") === patch[key]);
            return unchanged ? prev : { ...prev, ...patch };
          });
        }, []);

        const syncPackageTotals = (subTotalValue, vatRateValue) => {
          const subTotal = parseNum(subTotalValue);
          const vatRate = parseNum(vatRateValue);
          const vatAmount = roundAmount((subTotal * vatRate) / 100);
          const totalAmount = roundAmount(subTotal + vatAmount);
          setForm((prev) => ({
            ...prev,
            pricingMode: "package",
            packageVatRate: String(vatRateValue ?? ""),
            fixedAmount: totalAmount ? String(totalAmount) : "",
            subTotal: subTotal ? String(subTotal) : "",
            vatAmount: vatAmount ? String(vatAmount) : "",
            totalAmount: totalAmount ? String(totalAmount) : "",
          }));
        };

        // Combo pricing on the Contract is always VND — the manual Currency
        // picker is hidden while a combo is applied — so auto-convert the
        // combo's own packageSubTotal into VND here if it carries a foreign
        // currency (serviceCombos.currencyId / currencies, when configured).
        // Shared by applyCombo/applyAdhocCombo.
        const convertComboSubTotalToVnd = async (subTotal, comboCurrencyId, vndId) => {
          if (!comboCurrencyId || !vndId || comboCurrencyId === vndId) {
            return { convertedSubTotal: subTotal, wasConverted: false };
          }
          const rates = await fetchExchangeRatesForConversion([comboCurrencyId], vndId);
          const matched = pickConversionRate(rates, comboCurrencyId, vndId, form.signedDate);
          if (matched?.rate > 0) {
            return { convertedSubTotal: Math.round(subTotal * matched.rate), wasConverted: true };
          }
          message.warning(
            tr("No exchange rate from the combo's currency to VND — the original amount is kept; check the rates."),
          );
          return { convertedSubTotal: subTotal, wasConverted: false };
        };

        // Applying a combo while already in package mode APPENDS its rows
        // alongside any previously-applied combos (each combo keeps its own
        // section, independently removable via _comboInstanceId — see
        // removeAppliedCombo). Applying a combo while still in line pricing
        // mode instead clears every existing row — a combo forces package
        // pricing, and mixing line-priced rows with package-priced rows in the
        // same document is exactly what pricing-mode switches are meant to
        // prevent (see handleManualPricingModeChange).
        const applyCombo = async (comboId) => {
          const combo = combos.find((c) => String(c.id) === String(comboId));
          if (!combo) return;
          const items = combo.serviceComboItems || [];
          if (!items.length) {
            message.warning(tr("This combo has no services yet."));
            return;
          }

          const vndId = extractCurrencyId(findDefaultCurrency(currencies)?.id);
          const comboCurrencyId = getRecordCurrencyId(combo);
          const { convertedSubTotal, wasConverted } = await convertComboSubTotalToVnd(
            parseNum(combo.packageSubTotal),
            comboCurrencyId,
            vndId,
          );

          // packagePricingPayload() hardcodes quantity: 1 for every package-mode
          // contractServices row (see packagePricingPayload), so a combo item's
          // quantity > 1 is represented as that many duplicate rows rather than
          // a single row carrying a quantity value.
          const wasPackageMode = form.pricingMode === "package";
          const comboInstanceId = `combo-${comboId}-${Date.now()}`;

          // Transitioning from line pricing to package pricing (this contract's
          // very first combo) used to just discard every existing manual line
          // row — "mixing" is still not allowed, but a service that already had
          // a real typed price shouldn't vanish when the contract switches
          // modes; fold its VND-converted value into the starting subtotal.
          let existingLineContributionVnd = 0;
          const foldContributions = new Map();
          let foldedExistingRows = manualServiceRows;
          if (!wasPackageMode && manualServiceRows.length) {
            const foldTargetCurrency = findCurrencyById(currencies, vndId) || defaultCurrencyObject();
            const foldNeededIds = Array.from(new Set(
              manualServiceRows
                .map((row) => extractCurrencyId(findCurrencyById(currencies, row.currencyId) || foldTargetCurrency))
                .filter((id) => id && id !== vndId),
            ));
            const foldRates = foldNeededIds.length ? await fetchExchangeRatesForConversion(foldNeededIds, vndId) : [];
            // (Not merged with a persistent `exchangeRates` cache — that state
            // lives in the separate ManualContractServicesSection component,
            // out of reach here; freshly fetched rates for exactly the
            // currencies needed are sufficient on their own.)
            const mergedFoldRates = foldRates;
            foldedExistingRows = manualServiceRows.map((row) => {
              const rowCurrency = findCurrencyById(currencies, row.currencyId) || foldTargetCurrency;
              const amounts = manualServiceLineAmounts(row, false, getCurrencyDecimals(rowCurrency));
              const matched = isSameCurrency(rowCurrency, foldTargetCurrency)
                ? { rate: 1 }
                : pickConversionRate(mergedFoldRates, rowCurrency, foldTargetCurrency, form.signedDate);
              const contributionVnd = matched?.rate ? Math.round(amounts.subTotal * matched.rate) : 0;
              existingLineContributionVnd += contributionVnd;
              foldContributions.set(row.id, contributionVnd);
              return { ...row, basePrice: "", vat: "0" };
            });
          }

          const newRows = [];
          const skippedDuplicateNames = [];
          // Existing rows stay on the contract (merged into this combo below),
          // so a combo item duplicating one of them is skipped either way.
          const dedupeBaseline = [...manualServiceRows];
          items.forEach((item) => {
            const svc = item.services || {};
            if (findDuplicateServiceRow(dedupeBaseline, { serviceId: svc.id, serviceName: svc.serviceName })) {
              skippedDuplicateNames.push(svc.serviceName || `#${svc.id}`);
              return;
            }
            dedupeBaseline.push({ serviceId: svc.id ? String(svc.id) : null, serviceName: svc.serviceName || "" });
            const unitCount = Math.max(1, parseInt(item.quantity, 10) || 1);
            for (let i = 0; i < unitCount; i++) {
              const resolvedServiceId = extractId(item.serviceId) || extractId(svc.id);
              newRows.push({
                id: `combo-${comboId}-${svc.id}-${i}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                // The direct serviceComboItems.serviceId FK first — the
                // nested "services" relation frequently fails to resolve,
                // and falling back to svc.id alone left this blank whenever
                // that happened.
                serviceId: resolvedServiceId ? String(resolvedServiceId) : "",
                serviceName: svc.serviceName || item.serviceName || "",
                serviceType: svc.serviceType || item.serviceType || "",
                description: svc.description || item.description || "",
                quantity: "1",
                currencyId: vndId ? String(vndId) : "",
                basePrice: "",
                vat: "0",
                _comboInstanceId: comboInstanceId,
                _comboCatalogId: String(comboId),
                _comboName: combo.comboName || "",
                // Immutable per-line standalone-price snapshot, captured from
                // this exact serviceComboItems record —
                // getComboLineIndividualPrice reads this first instead of
                // re-matching against the live catalog by service id (that
                // re-match is fragile: the services relation can fail to
                // resolve, silently pairing a row with the WRONG item's
                // price — see its own comment).
                _comboItemSnapshot: {
                  price: parseNum(item.price),
                  vat: parseNum(item.vat),
                  currency: currencyFromRecord(
                    item,
                    currencies,
                    currencyFromRecord(combo, currencies, defaultCurrencyObject()),
                  ),
                },
              });
            }
          });
          if (skippedDuplicateNames.length) {
            message.warning(tr("Skipped {0} service(s) already on the contract: {1}", { 0: skippedDuplicateNames.length, 1: skippedDuplicateNames.join(", ") }));
          }
          if (!newRows.length) return;

          // Combos never merge into one blended pool — this combo's own amount
          // (its converted total, plus any pre-existing manual line rows folded
          // in on the very first combo applied) is tracked independently on its
          // own rows/appliedCombos entry, and the contract's subTotal is simply
          // the sum of every applied combo's own amount (see updateComboAmount,
          // which edits one combo's amount without touching any other).
          // Line/Combo sync: every standalone service joins this combo — its
          // value (converted line price, or the package share it already
          // added in Combo pricing) becomes part of the combo's own amount.
          const mergeResult = mergeStandaloneIntoCombo(
            wasPackageMode ? manualServiceRows : foldedExistingRows,
            { instanceId: comboInstanceId, catalogId: String(comboId), name: combo.comboName || "" },
            (row) =>
              wasPackageMode ? parseNum(row._packageBasePrice) : foldContributions.get(row.id) || 0,
          );
          // Package-mode standalone values were already in the subtotal.
          const mergedAlreadyInSubTotal = wasPackageMode ? mergeResult.contribution : 0;
          const comboOwnAmount = convertedSubTotal + mergeResult.contribution;
          // The flat VAT % field is shared across every combo on the contract, so
          // only the first combo applied seeds it — later combos leave whatever
          // rate is already there untouched (it stays freely hand-editable
          // either way, per the multi-combo design).
          const nextVatRate = appliedCombos.length === 0 ? combo.packageVatRate || 0 : form.packageVatRate;
          const comboOwnVatAmount = roundAmount((comboOwnAmount * parseNum(nextVatRate)) / 100);
          const newRowsWithOwnPricing = newRows.map((row) => ({
            ...row,
            packageSubTotal: comboOwnAmount,
            packageVatRate: parseNum(nextVatRate),
            packageVatAmount: comboOwnVatAmount,
            packageTotalAmount: comboOwnAmount + comboOwnVatAmount,
          }));
          const mergedRowIds = new Set(mergeResult.merged.map((row) => row.id));
          const existingRowsAfterMerge = mergeResult.rows.map((row) =>
            mergedRowIds.has(row.id)
              ? {
                  ...row,
                  packageSubTotal: comboOwnAmount,
                  packageVatRate: parseNum(nextVatRate),
                  packageVatAmount: comboOwnVatAmount,
                  packageTotalAmount: comboOwnAmount + comboOwnVatAmount,
                }
              : row,
          );
          setManualServiceRows([...existingRowsAfterMerge, ...newRowsWithOwnPricing]);
          if (mergeResult.merged.length) {
            message.info(
              tr("Merged {0} standalone service(s) into combo \"{1}\": {2}", { 0: mergeResult.merged.length, 1: combo.comboName || "", 2: mergeResult.merged.map((row) => row.serviceName || tr("Service")).join(", ") }),
            );
          }
          const nextSubTotal =
            (wasPackageMode ? parseNum(form.subTotal || form.fixedAmount) - mergedAlreadyInSubTotal : 0) +
            comboOwnAmount;
          syncPackageTotals(nextSubTotal, nextVatRate);
          if (vndId) {
            setForm((p) => ({ ...p, currencyId: String(vndId) }));
          }
          // One entry per applied combo instance — drives the section header +
          // "Remove combo" action in ManualContractServicesSection. Always
          // recorded, in whatever currency the combo template was actually
          // configured with (VND included), not only when a conversion to VND
          // was needed.
          setAppliedCombos((prev) => [
            ...prev,
            {
              instanceId: comboInstanceId,
              comboId: String(comboId),
              comboName: combo.comboName || "",
              originalAmount: parseNum(combo.packageSubTotal),
              convertedAmount: comboOwnAmount,
              currencyCode: getCurrencyCode(currencyFromRecord(combo, currencies)),
              wasConverted,
            },
          ]);
          message.success(tr("Combo \"{0}\" applied.", { 0: combo.comboName }));
        };

        // Ad-hoc combo — a one-off bundle of services grouped under a single flat
        // package price, built directly inside the Add Service modal (unlike
        // applyCombo above, this is NOT backed by a serviceCombos catalog record:
        // _comboCatalogId stays null, only comboName carries the traceability
        // data). Mirrors applyCombo's row-building so ad-hoc rows behave
        // identically to real-combo rows everywhere else.
        const applyAdhocCombo = async (payload) => {
          const items = payload?.items || [];
          if (!items.length) return;
          const comboName = String(payload?.comboName || "").trim();
          const comboType = payload?.serviceComboType || null;
          const packageSubTotal = parseNum(payload?.packageSubTotal);
          const packageVatRate = parseNum(payload?.packageVatRate);
          const vndId = extractCurrencyId(findDefaultCurrency(currencies)?.id);
          const adhocComboId = `adhoc-${Date.now()}`;
          const comboCurrencyId = extractCurrencyId(payload?.currencyId) || vndId;
          const comboCurrencyCode = getCurrencyCode(
            findCurrencyById(currencies, comboCurrencyId) || defaultCurrencyObject(),
          );
          const { convertedSubTotal, wasConverted } = await convertComboSubTotalToVnd(
            packageSubTotal,
            comboCurrencyId,
            vndId,
          );

          const wasPackageMode = form.pricingMode === "package";
          // See applyCombo's own comment: fold any pre-existing manual line
          // rows' VND value into the starting subtotal on this same
          // line->package transition, instead of discarding them.
          let existingLineContributionVnd = 0;
          const foldContributions = new Map();
          let foldedExistingRows = manualServiceRows;
          if (!wasPackageMode && manualServiceRows.length) {
            const foldTargetCurrency = findCurrencyById(currencies, vndId) || defaultCurrencyObject();
            const foldNeededIds = Array.from(new Set(
              manualServiceRows
                .map((row) => extractCurrencyId(findCurrencyById(currencies, row.currencyId) || foldTargetCurrency))
                .filter((id) => id && id !== vndId),
            ));
            const foldRates = foldNeededIds.length ? await fetchExchangeRatesForConversion(foldNeededIds, vndId) : [];
            // (Not merged with a persistent `exchangeRates` cache — that state
            // lives in the separate ManualContractServicesSection component,
            // out of reach here; freshly fetched rates for exactly the
            // currencies needed are sufficient on their own.)
            const mergedFoldRates = foldRates;
            foldedExistingRows = manualServiceRows.map((row) => {
              const rowCurrency = findCurrencyById(currencies, row.currencyId) || foldTargetCurrency;
              const amounts = manualServiceLineAmounts(row, false, getCurrencyDecimals(rowCurrency));
              const matched = isSameCurrency(rowCurrency, foldTargetCurrency)
                ? { rate: 1 }
                : pickConversionRate(mergedFoldRates, rowCurrency, foldTargetCurrency, form.signedDate);
              const contributionVnd = matched?.rate ? Math.round(amounts.subTotal * matched.rate) : 0;
              existingLineContributionVnd += contributionVnd;
              foldContributions.set(row.id, contributionVnd);
              return { ...row, basePrice: "", vat: "0" };
            });
          }
          const newRows = [];
          const skippedDuplicateNames = [];
          // Existing rows stay on the contract (merged into this combo below),
          // so a combo item duplicating one of them is skipped either way.
          const dedupeBaseline = [...manualServiceRows];
          items.forEach((item) => {
            if (findDuplicateServiceRow(dedupeBaseline, { serviceId: item.serviceId, serviceName: item.serviceName })) {
              skippedDuplicateNames.push(item.serviceName || "");
              return;
            }
            dedupeBaseline.push({ serviceId: item.serviceId ? String(item.serviceId) : null, serviceName: item.serviceName || "" });
            const unitCount = Math.max(1, parseInt(item.quantity, 10) || 1);
            for (let i = 0; i < unitCount; i++) {
              newRows.push({
                id: `adhoc-${adhocComboId}-${i}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                serviceId: item.serviceId ? String(item.serviceId) : "",
                serviceName: item.serviceName || "",
                serviceType: item.serviceType || "",
                description: item.description || "",
                quantity: "1",
                currencyId: vndId ? String(vndId) : "",
                basePrice: "",
                vat: "0",
                _saveToCatalog: !!item.saveToCatalog,
                _comboInstanceId: adhocComboId,
                _comboCatalogId: null,
                _comboName: comboName,
                // See applyCombo's matching comment: immutable per-line
                // standalone-price snapshot, read by
                // getComboLineIndividualPrice.
                _comboItemSnapshot: {
                  price: parseNum(item.price),
                  vat: parseNum(item.vat),
                  currency:
                    findCurrencyById(currencies, extractCurrencyId(item.currencyId)) ||
                    findCurrencyById(currencies, comboCurrencyId) ||
                    defaultCurrencyObject(),
                },
              });
            }
          });
          if (skippedDuplicateNames.length) {
            message.warning(tr("Skipped {0} service(s) already on the contract: {1}", { 0: skippedDuplicateNames.length, 1: skippedDuplicateNames.join(", ") }));
          }
          if (!newRows.length) return;

          // See applyCombo's matching comment: no merge into one pool — this
          // combo's own amount is tracked independently on its own rows/
          // appliedCombos entry.
          // Line/Combo sync: every standalone service joins this combo — its
          // value (converted line price, or the package share it already
          // added in Combo pricing) becomes part of the combo's own amount.
          const mergeResult = mergeStandaloneIntoCombo(
            wasPackageMode ? manualServiceRows : foldedExistingRows,
            { instanceId: adhocComboId, catalogId: null, name: comboName },
            (row) =>
              wasPackageMode ? parseNum(row._packageBasePrice) : foldContributions.get(row.id) || 0,
          );
          // Package-mode standalone values were already in the subtotal.
          const mergedAlreadyInSubTotal = wasPackageMode ? mergeResult.contribution : 0;
          const comboOwnAmount = convertedSubTotal + mergeResult.contribution;
          const nextVatRate = appliedCombos.length === 0 ? packageVatRate : form.packageVatRate;
          const comboOwnVatAmount = roundAmount((comboOwnAmount * parseNum(nextVatRate)) / 100);
          const newRowsWithOwnPricing = newRows.map((row) => ({
            ...row,
            packageSubTotal: comboOwnAmount,
            packageVatRate: parseNum(nextVatRate),
            packageVatAmount: comboOwnVatAmount,
            packageTotalAmount: comboOwnAmount + comboOwnVatAmount,
          }));
          const mergedRowIds = new Set(mergeResult.merged.map((row) => row.id));
          const existingRowsAfterMerge = mergeResult.rows.map((row) =>
            mergedRowIds.has(row.id)
              ? {
                  ...row,
                  packageSubTotal: comboOwnAmount,
                  packageVatRate: parseNum(nextVatRate),
                  packageVatAmount: comboOwnVatAmount,
                  packageTotalAmount: comboOwnAmount + comboOwnVatAmount,
                }
              : row,
          );
          setManualServiceRows([...existingRowsAfterMerge, ...newRowsWithOwnPricing]);
          if (mergeResult.merged.length) {
            message.info(
              tr("Merged {0} standalone service(s) into combo \"{1}\": {2}", { 0: mergeResult.merged.length, 1: comboName, 2: mergeResult.merged.map((row) => row.serviceName || tr("Service")).join(", ") }),
            );
          }
          const nextSubTotal =
            (wasPackageMode ? parseNum(form.subTotal || form.fixedAmount) - mergedAlreadyInSubTotal : 0) +
            comboOwnAmount;
          syncPackageTotals(nextSubTotal, nextVatRate);
          if (vndId) {
            setForm((p) => ({ ...p, currencyId: String(vndId) }));
          }
          setAppliedCombos((prev) => [
            ...prev,
            {
              instanceId: adhocComboId,
              comboName,
              originalAmount: packageSubTotal,
              convertedAmount: comboOwnAmount,
              currencyCode: comboCurrencyCode,
              wasConverted,
            },
          ]);
          // Deferred, same as the per-service _saveToCatalog flag: the actual
          // serviceCombos/serviceComboItems writes only happen once the
          // contract is confirmed created (handleSubmit's tail).
          if (payload?.saveComboToCatalog) {
            setPendingComboCatalogSaves((prev) => [
              ...prev,
              {
                instanceId: adhocComboId,
                comboName,
                serviceComboType: comboType,
                packageSubTotal,
                packageVatRate,
                currencyId: comboCurrencyId,
              },
            ]);
          }
          message.success(tr("Combo \"{0}\" applied.", { 0: comboName }));
        };

        // Removes one applied combo instance entirely — its rows AND its own
        // price contribution (the package subtotal is a running sum across every
        // applied combo — see applyCombo/applyAdhocCombo — so removing one
        // subtracts back only the amount that combo itself added).
        const removeAppliedCombo = (instanceId) => {
          // A combo section loaded from an existing Case/Quotation has no
          // appliedCombos entry (its "price" is whatever fraction of the
          // case/quotation's own package total those lines represent, not a
          // separately-tracked running sum) — remove it by deselecting its
          // pre-loaded lines instead, same mechanism as removeCaseServiceLineRow.
          // applyServiceSelection recomputes form totals from what stays
          // selected, so no manual subtotal math is needed here.
          if (String(instanceId).startsWith("persisted-")) {
            const groupLineIds = serviceLines
              .filter((line) => getPersistedComboGroupKey(line) === instanceId)
              .map((line) => lineKey(line));
            const nextSelectedIds = selectedServiceIds.filter(
              (id) => !groupLineIds.includes(id),
            );
            const keepsAtLeastOneSourceLine = nextSelectedIds.some((id) =>
              serviceLines.some((line) => lineKey(line) === id),
            );
            if (groupLineIds.length && !keepsAtLeastOneSourceLine) {
              message.warning(
                tr("Keep at least one service from the source Case/Quotation."),
              );
              return;
            }
            applyServiceSelection(nextSelectedIds);
            setManualServiceRows((prev) =>
              prev.filter((r) => r._comboInstanceId !== instanceId),
            );
            return;
          }
          const entry = appliedCombos.find((c) => c.instanceId === instanceId);
          if (!entry) return;
          // Services merged into this combo (Line/Combo sync) are part of it
          // and go with it; say so, since they were added separately.
          const mergedGoing = manualServiceRows.filter(
            (r) => r._comboInstanceId === instanceId && r._mergedIntoCombo,
          );
          if (mergedGoing.length) {
            message.info(
              tr("Also removed {0} service(s) merged into this combo: {1}", { 0: mergedGoing.length, 1: mergedGoing.map((r) => r.serviceName || tr("Service")).join(", ") }),
            );
          }
          setManualServiceRows((prev) => prev.filter((r) => r._comboInstanceId !== instanceId));
          const nextSubTotal = Math.max(
            parseNum(form.subTotal || form.fixedAmount) - entry.convertedAmount,
            0,
          );
          syncPackageTotals(nextSubTotal, form.packageVatRate);
          setAppliedCombos((prev) => prev.filter((c) => c.instanceId !== instanceId));
        };

        // Combos never merge into one blended pool — each applied combo keeps
        // its own independently-editable amount. Editing one combo's amount
        // here only touches that combo's own entry/rows, then re-sums the
        // contract's subTotal; it never rewrites another combo's amount.
        const updateComboAmount = (instanceId, nextAmount) => {
          const amount = Math.max(0, parseNum(nextAmount));
          const vatRate = parseNum(form.packageVatRate) || 0;
          const rowVatAmount = roundAmount((amount * vatRate) / 100);
          setAppliedCombos((prev) =>
            prev.map((c) => (c.instanceId === instanceId ? { ...c, convertedAmount: amount } : c)),
          );
          setManualServiceRows((prev) =>
            prev.map((r) =>
              r._comboInstanceId === instanceId
                ? {
                  ...r,
                  packageSubTotal: amount,
                  packageVatRate: vatRate,
                  packageVatAmount: rowVatAmount,
                  packageTotalAmount: amount + rowVatAmount,
                }
                : r,
            ),
          );
          const nextSubTotal = appliedCombos.reduce(
            (sum, c) => sum + (c.instanceId === instanceId ? amount : parseNum(c.convertedAmount)),
            0,
          );
          syncPackageTotals(nextSubTotal, vatRate);
        };

        // Adds a brand-new row from the "+ Add service" modal (catalog pick or
        // custom create) — always appends a fresh row, never edits an existing
        // one (re-picking an existing row's service is a separate, unchanged
        // path via selectManualService/createManualContractServiceDraft).
        const addRowFromService = async (value, isCreate = false) => {
          if (
            findDuplicateServiceRow(
              [...manualServiceRows, ...caseServiceEditorRows],
              { serviceId: value.serviceId, serviceName: value.serviceName },
            )
          ) {
            message.warning(tr("This service is already added in the contract."));
            return;
          }
          const packageMode = form.pricingMode === "package";
          // No mixing Line/Combo pricing on one contract: once already in
          // package mode, a newly added service is package-included ($0 on its
          // own row, unchanged) and its typed price folds into the package
          // subtotal instead of just being discarded — otherwise the price the
          // lawyer just typed would never reach Total Amount.
          let packageContributionVnd = 0;
          if (packageMode) {
            const vndId = extractCurrencyId(findDefaultCurrency(currencies)?.id);
            const targetCurrency = findCurrencyById(currencies, vndId) || defaultCurrencyObject();
            const rowCurrency = findCurrencyById(currencies, value.currencyId) || targetCurrency;
            const amounts = resolveServiceAmounts({ quantity: 1, basePrice: value.basePrice, vat: 0 });
            // (No persistent `exchangeRates` cache here — that state lives in
            // the separate ManualContractServicesSection component — so fetch
            // fresh for this one currency instead.)
            let matched = isSameCurrency(rowCurrency, targetCurrency) ? { rate: 1 } : null;
            if (!matched) {
              const rates = await fetchExchangeRatesForConversion([extractCurrencyId(rowCurrency)], vndId);
              matched = pickConversionRate(rates, rowCurrency, targetCurrency, form.signedDate);
            }
            if (matched?.rate) {
              packageContributionVnd = Math.round(amounts.subTotal * matched.rate);
            } else if (!isSameCurrency(rowCurrency, targetCurrency)) {
              message.warning(tr("Missing exchange rate {0} → VND — this service is not in the total yet; check the rates.", { 0: getCurrencyCode(rowCurrency) }));
            }
          }
          const newRow = {
            ...newManualServiceRow(),
            serviceId: value.serviceId ? String(value.serviceId) : "",
            serviceName: value.serviceName || "",
            serviceType: value.serviceType || "",
            description: value.description || "",
            currencyId: value.currencyId
              ? String(value.currencyId)
              : extractCurrencyId(selectedCurrency)
                ? String(extractCurrencyId(selectedCurrency))
                : "",
            basePrice: packageMode ? "" : String(parseNum(value.basePrice) || ""),
            vat: packageMode ? "0" : "8",
            _saveToCatalog: !!value.saveToCatalog,
            _packageBasePrice: packageMode ? packageContributionVnd : 0,
          };
          setManualServiceRows((prev) => {
            const next = [...prev, newRow];
            if (!packageMode) syncManualLineTotals(next);
            return next;
          });
          if (packageMode && packageContributionVnd) {
            syncPackageTotals(parseNum(form.subTotal || form.fixedAmount) + packageContributionVnd, form.packageVatRate);
          }
          if (isCreate) {
            message.success(tr("Service row added."));
          }
        };

        // Adds a service INTO an already-applied combo's section (triggered by
        // that section's own "+ Add service" action) rather than as an untagged
        // row. Always priced at 0 — "included in combo" — per the same
        // decision already applied to Case/Quotation: this service rides along
        // on the combo's existing flat package price, it does not add its own
        // charge.
        const onAddServiceToCombo = (instanceId, value) => {
          if (
            findDuplicateServiceRow(
              [...manualServiceRows, ...caseServiceEditorRows],
              { serviceId: value.serviceId, serviceName: value.serviceName },
            )
          ) {
            message.warning(tr("This service is already added in the contract."));
            return;
          }
          const siblingRow = manualServiceRows.find((r) => r._comboInstanceId === instanceId);
          const comboEntry = appliedCombos.find((c) => c.instanceId === instanceId);
          // A combo section loaded from an existing Case/Quotation (instanceId
          // starts with "persisted-") has no appliedCombos/manualServiceRows
          // entry to read comboId/comboName from — resolve them from one of its
          // pre-loaded rows instead.
          const persistedSourceLine =
            !siblingRow && !comboEntry
              ? serviceLines.find(
                  (line) => getPersistedComboGroupKey(line) === instanceId,
                )
              : null;
          const vndId = extractCurrencyId(findDefaultCurrency(currencies)?.id);
          const rowCurrencyId = extractCurrencyId(value.currencyId) || vndId;
          const newRow = {
            ...newManualServiceRow(),
            serviceId: value.serviceId ? String(value.serviceId) : "",
            serviceName: value.serviceName || "",
            serviceType: value.serviceType || "",
            description: value.description || "",
            currencyId: rowCurrencyId ? String(rowCurrencyId) : "",
            basePrice: "",
            vat: "0",
            _saveToCatalog: !!value.saveToCatalog,
            _comboInstanceId: instanceId,
            _comboCatalogId:
              siblingRow?._comboCatalogId ??
              (persistedSourceLine?.comboId
                ? String(persistedSourceLine.comboId)
                : null),
            _comboName:
              siblingRow?._comboName ||
              comboEntry?.comboName ||
              persistedSourceLine?.comboName ||
              "",
          };
          // Insert right after this combo's own last row, not at the end of the
          // whole list — appending unconditionally would land the new row after
          // a later-applied combo's rows, breaking that combo's section
          // contiguity (isComboSectionStart in ManualContractServicesSection
          // groups purely by adjacency) and rendering it as a stray second
          // section instead of inside the combo it was actually added to.
          setManualServiceRows((prev) => {
            let insertAt = prev.length;
            for (let i = prev.length - 1; i >= 0; i--) {
              if (prev[i]._comboInstanceId === instanceId) {
                insertAt = i + 1;
                break;
              }
            }
            return [...prev.slice(0, insertAt), newRow, ...prev.slice(insertAt)];
          });
          markDirty();
        };

        const handleManualPricingModeChange = (mode) => {
          const nextMode = mode === "package" ? "package" : "line";
          if (nextMode === form.pricingMode) return;

          if (serviceLines.length) {
            // Case-linked services (selectedCaseServiceLines) are a separate data
            // source from manualServiceRows/combo — preserve their existing
            // totals when toggling mode, unaffected by the manual-row reset below.
            const activeTotals = sumServiceLines(selectedCaseServiceLines);
            if (nextMode === "package") {
              const casePackageLines = selectedCaseServiceLines.filter(isPackageSource);
              // Every combo group counts, not only the first package line.
              const sourcePackage = casePackageLines.length
                ? sumPackageGroups(casePackageLines, resolvePackageAmounts(casePackageLines[0]).vatRate)
                : null;
              const sourceSubTotal =
                sourcePackage?.subTotal ||
                activeTotals.subTotal ||
                parseNum(form.subTotal);
              const sourceVatRate =
                sourcePackage?.vatRate !== undefined &&
                sourcePackage?.vatRate !== null &&
                sourcePackage?.vatRate !== ""
                  ? sourcePackage.vatRate
                  : form.packageVatRate !== undefined &&
                      form.packageVatRate !== null &&
                      form.packageVatRate !== ""
                    ? form.packageVatRate
                    : "8";
              syncPackageTotals(
                sourceSubTotal ? String(sourceSubTotal) : "",
                sourceVatRate,
              );
            } else {
              setForm((prev) => ({
                ...prev,
                pricingMode: "line",
                fixedAmount: activeTotals.totalAmount
                  ? String(activeTotals.totalAmount)
                  : "",
                subTotal: activeTotals.subTotal ? String(activeTotals.subTotal) : "",
                vatAmount: activeTotals.vatAmount ? String(activeTotals.vatAmount) : "",
                totalAmount: activeTotals.totalAmount
                  ? String(activeTotals.totalAmount)
                  : "",
              }));
            }
            return;
          }

          // Manual rows: each mode keeps its own manualServiceRows/appliedCombos
          // (and, for package mode, its own typed subtotal/VAT rate), parked in
          // this ref while the other mode is active — switching still keeps a
          // Line-priced contract from mixing with combo/package rows (each mode
          // only ever sees its own list), but a round trip (Line -> Combo ->
          // Line) now restores exactly what was there instead of losing it.
          modeStateParkRef.current[form.pricingMode] = {
            manualServiceRows,
            appliedCombos,
            subTotal: form.subTotal,
            packageVatRate: form.packageVatRate,
          };
          const restored = modeStateParkRef.current[nextMode];
          setManualServiceRows(restored?.manualServiceRows || []);
          setAppliedCombos(restored?.appliedCombos || []);
          if (nextMode === "package") {
            syncPackageTotals(restored?.subTotal || "", restored?.packageVatRate || form.packageVatRate || "8");
          } else {
            syncManualLineTotals(restored?.manualServiceRows || []);
          }
        };

        const deleteManualServiceRow = (rowId) => {
          const row = manualServiceRows.find((r) => r.id === rowId);
          const packageBasePrice = parseNum(row?._packageBasePrice);
          if (form.pricingMode === "package" && packageBasePrice) {
            syncPackageTotals(
              Math.max(parseNum(form.subTotal || form.fixedAmount) - packageBasePrice, 0),
              form.packageVatRate,
            );
          }
          setManualServiceRows((prev) => {
            const next = prev.filter((row) => row.id !== rowId);
            if (form.pricingMode !== "package") syncManualLineTotals(next);
            return next;
          });
        };

        const updateManualServiceRow = (rowId, field, value) => {
          setManualServiceRows((prev) => {
            const next = prev.map((row) =>
              row.id === rowId ? { ...row, [field]: value } : row,
            );
            if (form.pricingMode !== "package") syncManualLineTotals(next);
            return next;
          });
        };

        // Edits a field on a pre-loaded (Case/Quotation-sourced) row in place —
        // the manual-rows counterpart of updateManualServiceRow. Recomputes
        // subTotal/vatAmount/totalAmount when a pricing-driving field changes, then
        // re-syncs the form header totals via applyServiceSelection (same pattern
        // handleProjectChange already uses after loadCaseServiceLines).
        const updateCaseServiceLineRow = (rowId, field, value) => {
          const pricingFields = ["basePrice", "vat", "quantity"];
          const nextLines = serviceLines.map((line) => {
            if (lineKey(line) !== rowId) return line;
            const patched = { ...line, [field]: value };
            return pricingFields.includes(field)
              ? { ...patched, ...resolveServiceAmounts(pricingInputsOnly(patched)) }
              : patched;
          });
          setServiceLines(nextLines);
          applyServiceSelection(selectedServiceIds, nextLines);
        };

        // A row rendered by ManualContractServicesSection is either a pre-loaded
        // Case/Quotation line (tagged nowhere explicitly — identified here by NOT
        // being in manualServiceRows) or one added in this session
        // (_isManualAddition, present in manualServiceRows). Route delete/update
        // to whichever backing state actually owns that row.
        const isManualServiceRowId = (rowId) =>
          manualServiceRows.some((row) => row.id === rowId);

        const dispatchDeleteServiceRow = (rowId) =>
          isManualServiceRowId(rowId)
            ? deleteManualServiceRow(rowId)
            : removeCaseServiceLineRow(rowId);

        const dispatchUpdateServiceRow = (rowId, field, value) =>
          isManualServiceRowId(rowId)
            ? updateManualServiceRow(rowId, field, value)
            : updateCaseServiceLineRow(rowId, field, value);

        const selectManualService = (rowId, serviceId, serviceOverride = null) => {
          const service =
            serviceOverride ||
            filteredServiceOptions.find(
              (item) => String(serviceOptionServiceId(item)) === String(serviceId),
            );
          if (serviceId && !service) {
            message.warning(tr("Selected service was not found in catalog."));
            return;
          }
          if (
            serviceId &&
            manualServiceRows.some(
              (row) =>
                row.id !== rowId && String(row.serviceId) === String(serviceId),
            )
          ) {
            message.warning(tr("This service is already selected in another row."));
            return;
          }
          setManualServiceRows((prev) => {
            const next = prev.map((row) => {
              if (row.id !== rowId) return row;
              if (!serviceId) {
                return {
                  ...row,
                  serviceId: "",
                  serviceName: "",
                  serviceType: "",
                  description: "",
                  currencyId: extractCurrencyId(selectedCurrency)
                    ? String(extractCurrencyId(selectedCurrency))
                    : "",
                  basePrice: "",
                };
              }
              const serviceCurrency = currencyFromRecord(
                service,
                currencies,
                selectedCurrency,
              );
              const serviceCurrencyId =
                extractCurrencyId(serviceCurrency) ||
                getRecordCurrencyId(service) ||
                extractCurrencyId(selectedCurrency);
              if (
                !extractCurrencyId(serviceCurrency) &&
                !getRecordCurrencyId(service)
              ) {
                console.warn(
                  "[ContractCreateForm] Could not resolve a real currencyId for this service (falling back to contract currency). Raw service fields:",
                  {
                    serviceId: extractId(service?.id),
                    serviceKeys: Object.keys(service || {}),
                    currency: service?.currency,
                    currencies: service?.currencies,
                    currencyId: service?.currencyId,
                    currencyCode: service?.currencyCode,
                    defaultCurrencyId: service?.defaultCurrencyId,
                    defaultCurrency: service?.defaultCurrency,
                    basePrice: service?.basePrice,
                    price: service?.price,
                    unitPrice: service?.unitPrice,
                    resolvedServiceCurrency: serviceCurrency,
                    availableCurrencies: (currencies || []).map((c) => ({
                      id: c?.id,
                      code: getCurrencyCode(c),
                    })),
                  },
                );
              }
              return {
                ...row,
                serviceId: String(serviceId),
                serviceName: serviceCatalogName(service),
                serviceType: serviceCatalogType(service),
                description: row.description || serviceCatalogDescription(service),
                currencyId: serviceCurrencyId
                  ? String(serviceCurrencyId)
                  : row.currencyId,
                basePrice:
                  form.pricingMode === "package"
                    ? ""
                    : String(serviceCatalogPrice(service) || ""),
                vat: form.pricingMode === "package" ? "0" : row.vat || "8",
              };
            });
            if (form.pricingMode !== "package") syncManualLineTotals(next);
            return next;
          });
        };

        const createManualContractServiceDraft = (rowId, data) => {
          const serviceName = String(data?.serviceName || "").trim();
          if (!serviceName) {
            message.warning(tr("Please enter service name."));
            return null;
          }
          const existsInCatalog = filteredServiceOptions.find(
            (item) =>
              normalizeSearch(serviceCatalogName(item)) ===
              normalizeSearch(serviceName),
          );
          if (existsInCatalog) {
            message.warning(
              tr("This service already exists in the catalog. Please select it instead."),
            );
            return null;
          }
          const existsInRows = manualServiceRows.find(
            (row) =>
              row.id !== rowId &&
              normalizeSearch(row.serviceName) === normalizeSearch(serviceName),
          );
          if (existsInRows) {
            message.warning(tr("This service is already added in another row."));
            return null;
          }
          if (parseNum(data?.basePrice) <= 0) {
            message.warning(tr("Please enter unit price greater than 0."));
            return null;
          }
          if (currencyOptions.length && !extractCurrencyId(data?.currencyId)) {
            message.warning(tr("Please select service currency."));
            return null;
          }

          const draft = {
            serviceName,
            serviceType: String(data?.serviceType || "").trim() || null,
            currencyId:
              getRecordCurrencyId(data) ||
              extractCurrencyId(selectedCurrency) ||
              null,
            basePrice: String(parseNum(data?.basePrice) || ""),
            description: String(data?.description || "").trim(),
          };

          setManualServiceRows((prev) => {
            const next = prev.map((row) => {
              if (row.id !== rowId) return row;
              return {
                ...row,
                serviceId: "",
                serviceName: draft.serviceName,
                serviceType: draft.serviceType || "",
                description: draft.description,
                currencyId: draft.currencyId
                  ? String(draft.currencyId)
                  : row.currencyId,
                basePrice: draft.basePrice,
                quantity: row.quantity || "1",
                vat: row.vat || "8",
              };
            });
            if (form.pricingMode !== "package") syncManualLineTotals(next);
            return next;
          });
          message.success(tr("Service row added."));
          return draft;
        };

        const parentContractOptions = parentContracts
          .filter((item) => String(item.id) !== String(ctx.record?.id || ""))
          .map((item) => ({
            value: String(item.id),
            label: contractLabel(item),
            subLabel: relatedCustomerName(item, customers)
              ? tr("Customer: {0}", { 0: relatedCustomerName(item, customers) })
              : "",
          }));

        const buildContractServicePayload = async ({
          contractId,
          projectServiceId,
          quotationServiceId,
          projectId,
          serviceLine,
          submitCurrencyId,
        }) => {
          // A line sourced from a Case-less Quotation has no projectServiceId at
          // all — proceed as long as there's a resolvable quotationServiceId
          // instead (the "no Case" fallback path). Only bail out when neither
          // identity is available.
          const fallbackQuotationServiceId =
            quotationServiceId || extractId(serviceLine?.quotationServiceId);
          if (!contractId || (!projectServiceId && !fallbackQuotationServiceId))
            return null;

          const popupParams = getPopupParams();
          const projectService = projectServiceId
            ? await fetchRecord("projectServices:get", projectServiceId, {
                appends: ["services"],
              })
            : null;

          let quotationService = null;
          const directQuotationServiceId =
            quotationServiceId ||
            extractId(serviceLine?.quotationServiceId) ||
            (form.quotationServiceId ? parseInt(form.quotationServiceId, 10) : null);
          if (directQuotationServiceId) {
            quotationService = await fetchRecord(
              "quotationServices:get",
              directQuotationServiceId,
              {
              },
            );
          } else if (form.quotationId) {
            try {
              const serviceIdForMatch =
                extractId(projectService?.serviceId) ||
                extractId(projectService?.services) ||
                extractId(popupParams.serviceId);
              const qsRes = await ctx.api.request({
                url: "quotationServices:list",
                params: {
                  filter: JSON.stringify({
                    quotationId: { $eq: parseInt(form.quotationId, 10) },
                  }),
                  pageSize: 500,
                },
              });
              quotationService =
                (qsRes?.data?.data || []).find((line) => {
                  const lineServiceId =
                    extractId(line.serviceId) || extractId(line.service);
                  return (
                    lineServiceId &&
                    String(lineServiceId) === String(serviceIdForMatch)
                  );
                }) || null;
            } catch (error) {
              console.warn(
                "[ContractCreateForm] Could not find quotation service for contract line",
                error,
              );
            }
          }

          const serviceId =
            extractId(quotationService?.serviceId) ||
            extractId(quotationService?.service) ||
            extractId(projectService?.serviceId) ||
            extractId(projectService?.services) ||
            extractId(popupParams.serviceId) ||
            extractId(serviceLine?.serviceId);
          const serviceName =
            serviceLine?.serviceName ||
            quotationService?.serviceName ||
            projectService?.serviceName ||
            projectService?.services?.serviceName ||
            popupParams.serviceName ||
            form.contractName;
          const description =
            serviceLine?.description ||
            quotationService?.description ||
            form.scopeNote ||
            projectService?.description ||
            projectService?.services?.description ||
            popupParams.description ||
            null;
          const packageMode = form.pricingMode === "package";
          const pricingPayload = packageMode
            ? packagePricingPayload(
                {
                  packageSubTotal: form.subTotal || form.fixedAmount,
                  packageVatRate: form.packageVatRate,
                  packageVatAmount: form.vatAmount,
                  packageTotalAmount: form.totalAmount || form.fixedAmount,
                },
                quotationService,
                serviceLine,
                projectService,
                popupParams,
              )
            : projectServicePricingPayload(
                resolveServiceAmounts(
                  serviceLine,
                  quotationService,
                  projectService,
                  popupParams,
                  {
                    basePrice: form.subTotal || form.fixedAmount,
                    subTotal: form.subTotal,
                    vatAmount: form.vatAmount,
                    totalAmount: form.totalAmount || form.fixedAmount,
                  },
                ),
              );

          const resolvedLineCurrencyId =
            getRecordCurrencyId(serviceLine) ||
            getRecordCurrencyId(quotationService) ||
            getRecordCurrencyId(projectService) ||
            getRecordCurrencyId(popupParams) ||
            submitCurrencyId ||
            getRecordCurrencyId(form) ||
            null;
          // Which combo section (if any) this line belonged to — carried onto
          // the new contractServices row so combo grouping survives creating a
          // Contract from an existing Case/Quotation.
          const resolvedComboId =
            extractId(serviceLine?.comboId) ||
            extractId(quotationService?.comboId) ||
            extractId(quotationService?.serviceCombo) ||
            extractId(projectService?.comboId) ||
            extractId(projectService?.serviceCombo) ||
            null;
          const resolvedComboName =
            serviceLine?.comboName ||
            quotationService?.comboName ||
            projectService?.comboName ||
            null;

          const payload = {
            contractId,
            contracts: contractId,
            projectServiceId,
            projectServices: projectServiceId,
            quotationServiceId:
              extractId(quotationService?.id) || directQuotationServiceId || null,
            quotationServices:
              extractId(quotationService?.id) ||
              directQuotationServiceId ||
              undefined,
            serviceId: serviceId || null,
            ServiceId: serviceId || null,
            comboId: resolvedComboId,
            serviceCombo: resolvedComboId,
            comboName: resolvedComboName,
            projectId:
              projectId ||
              extractId(serviceLine?.projectId) ||
              extractId(popupParams.projectId) ||
              extractId(popupParams.caseId) ||
              null,
            serviceName: serviceName || null,
            description,
            // pricingPayload (line mode) is built from an amounts-only object with
            // no currency info, so its own currencyId is always null — it MUST be
            // spread before the real currencyId/currency assignment below, or it
            // silently wipes the correctly resolved value back to null.
            ...pricingPayload,
            currencyId: resolvedLineCurrencyId,
            currency: resolvedLineCurrencyId,
            lineStatus: contractStatusToProjectServiceStatus(form.status),
          };
          return payload;
        };

        const buildManualContractServicePayload = ({
          contractId,
          row,
          projectId,
          submitCurrencyId,
        }) => {
          if (!contractId || !row) return null;
          const packageMode = form.pricingMode === "package";
          // Combo rows carry their own combo's independently-tracked amount
          // (stamped by applyCombo/applyAdhocCombo/updateComboAmount) — persist
          // THAT, not the record-wide blended subtotal, so each combo's own
          // DB rows reflect only its own share instead of every combo's total.
          // A package-mode row with no combo of its own (none currently exist
          // in this file, but kept as a safety net) falls back to the shared
          // header total, same as before.
          const pricingPayload = packageMode
            ? packagePricingPayload({
                packageSubTotal: row.packageSubTotal ?? (form.subTotal || form.fixedAmount),
                packageVatRate: row.packageVatRate ?? form.packageVatRate,
                packageVatAmount: row.packageVatAmount ?? form.vatAmount,
                packageTotalAmount: row.packageTotalAmount ?? (form.totalAmount || form.fixedAmount),
              })
            : projectServicePricingPayload(manualServiceLineAmounts(row, false, getCurrencyDecimals(findCurrencyById(currencies, row.currencyId) || findDefaultCurrency(currencies))));
          return {
            contractId,
            contracts: contractId,
            serviceId: row.serviceId ? parseInt(row.serviceId, 10) : null,
            ServiceId: row.serviceId ? parseInt(row.serviceId, 10) : null,
            services: row.serviceId ? parseInt(row.serviceId, 10) : undefined,
            projectId: projectId || null,
            serviceName: row.serviceName || null,
            serviceType: row.serviceType || null,
            description: row.description || null,
            comboId: row._comboCatalogId ? parseInt(row._comboCatalogId, 10) : null,
            serviceCombo: row._comboCatalogId ? parseInt(row._comboCatalogId, 10) : null,
            comboName: row._comboName || null,
            // pricingPayload's own currencyId is always null here (see the
            // matching comment in buildContractServicePayload above) — spread it
            // before the real currencyId/currency assignment so it isn't clobbered.
            ...pricingPayload,
            currencyId:
              getRecordCurrencyId(row) ||
              submitCurrencyId ||
              getRecordCurrencyId(form) ||
              null,
            currency:
              getRecordCurrencyId(row) ||
              submitCurrencyId ||
              getRecordCurrencyId(form) ||
              null,
            lineStatus: packageMode
              ? "included_in_package"
              : contractStatusToProjectServiceStatus(form.status),
          };
        };

        const createContractServiceLine = async (payload) => {
          if (!payload) return null;
          const cleanPayload = stripContractServicePayload(lineWritePayload(payload));
          try {
            const res = await ctx.api.request({
              url: "contractServices:create",
              method: "POST",
              data: cleanPayload,
            });
            return res?.data?.data || res?.data || null;
          } catch (error) {
            const fallbackPayload = { ...cleanPayload };
            delete fallbackPayload.contracts;
            delete fallbackPayload.projectServices;
            delete fallbackPayload.quotationServices;
            delete fallbackPayload.services;
            delete fallbackPayload.comboId;
            delete fallbackPayload.serviceCombo;
            delete fallbackPayload.comboName;
            try {
              const res = await ctx.api.request({
                url: "contractServices:create",
                method: "POST",
                data: fallbackPayload,
              });
              return res?.data?.data || res?.data || null;
            } catch (fallbackError) {
              const minimalPayload = { ...fallbackPayload };
              delete minimalPayload.serviceType;
              delete minimalPayload.serviceId;
              delete minimalPayload.ServiceId;
              try {
                const res = await ctx.api.request({
                  url: "contractServices:create",
                  method: "POST",
                  data: minimalPayload,
                });
                return res?.data?.data || res?.data || null;
              } catch (minimalError) {
                // every attempt failed: the first error carries the real reason
                // (e.g. the database refusing a billed contract's service)
                throw error;
              }
            }
          }
        };

        const updateProjectServiceLineSafely = async (projectServiceId, payload) => {
          try {
            return await ctx.api.request({
              url: "projectServices:update",
              method: "POST",
              params: { filterByTk: projectServiceId },
              data: payload,
            });
          } catch (error) {
            const fallbackPayload = stripProjectServiceSyncFields(payload);
            try {
              return await ctx.api.request({
                url: "projectServices:update",
                method: "POST",
                params: { filterByTk: projectServiceId },
                data: fallbackPayload,
              });
            } catch (fallbackError) {
              const minimalPayload = { ...fallbackPayload };
              delete minimalPayload.pricingMode;
              delete minimalPayload.billingMode;
              delete minimalPayload.financialSourceType;
              delete minimalPayload.packageSubTotal;
              delete minimalPayload.packageVatRate;
              delete minimalPayload.packageVatAmount;
              delete minimalPayload.packageTotalAmount;
              try {
                return await ctx.api.request({
                  url: "projectServices:update",
                  method: "POST",
                  params: { filterByTk: projectServiceId },
                  data: minimalPayload,
                });
              } catch (minimalError) {
                throw error; // the first error carries the real reason
              }
            }
          }
        };

        const isContractFolder = (folder, contractId) =>
          String(firstId(folder?.contractId, folder?.contract, folder?.contracts)) ===
          String(contractId);

        const isCaseFolderCandidate = (folder, projectId, projectFolderIds) => {
          const folderProjectId = firstId(
            folder?.projectId,
            folder?.project,
            folder?.projects,
          );
          if (String(folderProjectId) !== String(projectId)) return false;

          const linkedRecordId = firstId(
            folder?.contractId,
            folder?.contract,
            folder?.contracts,
            folder?.quotationId,
            folder?.quotation,
            folder?.quotations,
            folder?.projectServiceId,
            folder?.projectService,
            folder?.projectServices,
            folder?.taskId,
            folder?.task,
            folder?.tasks,
          );
          if (linkedRecordId) return false;

          const parentId = firstId(folder?.parentId, folder?.parent);
          return !parentId || !projectFolderIds.has(String(parentId));
        };

        const ensureMainContractFolder = async ({
          contractId,
          projectId,
          customerId,
          contractCode,
          contractName,
        }) => {
          if (!contractId || !projectId) return null;
          if (!AUTO_CREATE_CONTRACT_FOLDERS) return null;

          try {
            const foldersRes = await ctx.api.request({
              url: "folders:list",
              params: {
                filter: JSON.stringify({
                  projectId: { $eq: parseInt(projectId, 10) },
                }),
                pageSize: 1000,
                sort: ["folderIndex", "createdAt"],
              },
            });
            const allFolders = foldersRes?.data?.data || [];
            const existingContractFolder = allFolders.find((folder) =>
              isContractFolder(folder, contractId),
            );
            if (existingContractFolder) return existingContractFolder;

            const projectFolderIds = new Set(
              allFolders
                .map((folder) => extractId(folder?.id))
                .filter(Boolean)
                .map(String),
            );
            const parentCaseFolder =
              allFolders.find((folder) =>
                isCaseFolderCandidate(folder, projectId, projectFolderIds),
              ) ||
              allFolders.find(
                (folder) =>
                  String(
                    firstId(folder?.projectId, folder?.project, folder?.projects),
                  ) === String(projectId),
              );

            if (!parentCaseFolder) {
              console.warn(
                "[ContractCreateForm] Could not find case folder for contract folder",
                {
                  projectId,
                  contractId,
                  projectRecord: getConfiguredProjectRecord(),
                },
              );
              return null;
            }

            const parentId = extractId(parentCaseFolder.id);
            const childFolders = allFolders.filter(
              (folder) =>
                String(firstId(folder?.parentId, folder?.parent)) ===
                String(parentId),
            );
            const maxFolderIndex = childFolders.reduce(
              (max, folder) => Math.max(max, parseInt(folder.folderIndex, 10) || 0),
              0,
            );
            const projectRecord = getConfiguredProjectRecord();
            const creatorId = firstId(
              projectRecord?.createdById,
              projectRecord?.createdBy,
              projectRecord?.updatedById,
              projectRecord?.updatedBy,
            );
            const folderName = compact([
              "Contract",
              contractCode || contractName || contractId,
            ]).join(" ");

            const folderPayload = {
              name: folderName,
              parentId,
              projectId: parseInt(projectId, 10),
              customerId: customerId
                ? parseInt(customerId, 10)
                : firstId(parentCaseFolder.customerId, parentCaseFolder.customer),
              moduleScope: CASE_DOCUMENT_SCOPE,
              contractId: parseInt(contractId, 10),
              createdById: creatorId || undefined,
              updatedById: creatorId || undefined,
              folderIndex: maxFolderIndex + 1,
            };
            Object.keys(folderPayload).forEach((key) => {
              if (folderPayload[key] === undefined || folderPayload[key] === null)
                delete folderPayload[key];
            });

            const createRes = await ctx.api.request({
              url: "folders:create",
              method: "POST",
              data: folderPayload,
            });

            return createRes?.data?.data || createRes?.data || null;
          } catch (error) {
            console.warn(
              "[ContractCreateForm] Could not create main contract folder",
              error,
            );
            return null;
          }
        };

        const validate = () => {
          if (!form.contractName.trim()) return tr("Please enter the contract name.");
          if (!form.customerId) return tr("Please select a customer.");
          if (!form.internalCompanyId) return tr("Please select an internal company.");
          if (currencyOptions.length && !extractCurrencyId(form.currencyId))
            return tr("Please select contract currency.");
          if (!form.contractType) return tr("Please select the contract type.");
          const activePaymentRows = cleanPaymentScheduleRows(
            form.paymentSchedule,
            paymentBaseAmount,
          );
          if (form.billingCycle === "multiple_payments") {
            if (!paymentBaseAmount)
              return tr("Please enter service pricing before adding payment installments.");
            if (isByCase && !activePaymentRows.length)
              return tr("Please add at least one payment installment.");
            if (
              activePaymentRows.some((row) => parseNum(row.amount) <= 0)
            ) {
              return tr("Please enter payment percentage for every payment installment.");
            }
            if (activePaymentRows.length > 1) {
              const percentageSum = activePaymentRows.reduce(
                (sum, row) => sum + parseNum(row.percentage),
                0,
              );
              if (Math.abs(percentageSum - 100) > 0.01) {
                return tr("Payment installment percentages must add up to 100%.");
              }
            }
            // Every payment installment needs at least one service (2026-09-21,
            // §6m) — the task-side installment picker has no "visible to
            // everyone" fallback anymore for an untagged row, so an installment
            // saved without a service would never be selectable by any task.
            if (
              isByCase &&
              activePaymentRows.some((row) => !row.serviceKeys?.length)
            ) {
              return tr("Please select at least one service for every payment installment.");
            }
          }
          if (
            isRetainer &&
            !["day", "week", "month", "year"].includes(form.retainerRepeatUnit)
          ) {
            return tr("Please select a valid retainer repeat unit.");
          }
          if (serviceLines.length && !selectedContractServiceLines.length) {
            return tr("Please select at least one service for this contract.");
          }
          if (!selectedContractServiceLines.length && !manualServiceRows.length) {
            return tr("Please add at least one service before creating the contract.");
          }
          if (manualServiceRows.length) {
            if (manualServiceRows.some((row) => !row.serviceName && !row.serviceId)) {
              return tr("Please select a service for every contract service row.");
            }
            // Compare against pre-loaded Case/Quotation rows too, now that both
            // sources can be on the contract at once — not just manual-vs-manual.
            const selectedManualServiceIds = [
              ...manualServiceRows,
              ...caseServiceEditorRows,
            ]
              .map((row) => String(row.serviceId || ""))
              .filter(Boolean);
            if (
              new Set(selectedManualServiceIds).size !==
              selectedManualServiceIds.length
            ) {
              return tr("Duplicate services are not allowed in contract service rows.");
            }
            const manualServiceNames = [
              ...manualServiceRows,
              ...caseServiceEditorRows,
            ]
              .map((row) =>
                normalizeSearch(row.serviceName).replace(/\s+/g, " ").trim(),
              )
              .filter(Boolean);
            if (new Set(manualServiceNames).size !== manualServiceNames.length) {
              return tr("Duplicate service names are not allowed in contract service rows.");
            }
            const manualNameMatchesCatalog = manualServiceRows.some((row) => {
              if (row.serviceId || !row.serviceName) return false;
              const name = normalizeSearch(row.serviceName)
                .replace(/\s+/g, " ")
                .trim();
              return filteredServiceOptions.some(
                (service) =>
                  normalizeSearch(serviceCatalogName(service))
                    .replace(/\s+/g, " ")
                    .trim() === name,
              );
            });
            if (manualNameMatchesCatalog) {
              return tr("A manually created service already exists in the catalog. Please select the existing service instead.");
            }
            if (
              form.pricingMode !== "package" &&
              manualServiceRows.some((row) => parseNum(row.basePrice) <= 0)
            ) {
              return tr("Please enter base price for every line-priced service.");
            }
            if (
              form.pricingMode !== "package" &&
              currencyOptions.length &&
              manualServiceRows.some((row) => !extractCurrencyId(row.currencyId))
            ) {
              return tr("Please select currency for every service row.");
            }
            if (
              form.pricingMode === "package" &&
              parseNum(form.subTotal || form.fixedAmount) <= 0
            ) {
              return tr("Please enter combo subtotal.");
            }
          }
          if (
            (form.contractKind === "appendix" || isAppendixContract) &&
            !form.parentId
          ) {
            return tr("Please select the main contract before creating an appendix.");
          }
          return "";
        };

        const handleSubmit = async () => {
          const error = validate();
          if (error) {
            message.warning(error);
            return;
          }

          // By Service + Combo pricing: the locked per-service amounts must add
          // up to the Total amount exactly — they're what the Payment Requests
          // will bill (spec 2026-09-25).
          if (allocationActive && allocationEntries.length) {
            if (allocationPool <= 0) {
              message.warning(
                tr("Enter the Total amount first — it's what the services' Payment Request amounts are split from."),
              );
              return;
            }
            const status = allocationStatus(
              packageAmounts,
              allocationEntries.map((entry) => entry.key),
              parseNum(form.totalAmount),
            );
            if (!status.ok) {
              message.warning(
                tr("Payment Request amounts add up to {0} but the Total amount is {1}. Open Payment Triggers → Configure to adjust them or use Auto-distribute.", { 0: formatMoneyByCurrency(status.sum, selectedCurrency), 1: formatMoneyByCurrency(status.pool, selectedCurrency) }),
              );
              return;
            }
          }

          if (triggerFeatureOn && triggerLoading) {
            message.info(tr("Payment triggers are still loading — please try again in a moment."));
            return;
          }
          // Trigger data is only used if it was loaded for the Case (or
          // Case-less template scope) currently selected — never a previous one.
          // Shared by By Service (per service) and By Case (per installment).
          const triggerDataCurrent =
            triggerFeatureOn &&
            isTriggerDataCurrent(
              triggerScopeRef.current,
              triggerScopeKey(triggerProjectId),
              triggerLoading,
            );

          // Services (By Service) / installments (By Case) that offer tasks
          // but have none ticked will never trigger automatically — warn,
          // don't block (spec §7 / by-case spec §3).
          if (triggerDataCurrent) {
            // By Case: only rows that will actually be created
            // (cleanPaymentScheduleRows drops empty ones).
            const scheduledInstallmentIds = new Set(
              cleanPaymentScheduleRows(form.paymentSchedule, parseNum(form.totalAmount)).map((row) => String(row.id)),
            );
            const perServiceTriggers = isByService && !comboBillingActive;
            const missing = perServiceTriggers
              ? linesWithoutTrigger(triggerLines, triggerTasksByLine, triggerSelection)
              : installmentsWithoutTasks(
                  comboBillingActive
                    ? installmentItems
                    : installmentItems.filter((item) => scheduledInstallmentIds.has(String(item.key))),
                  triggerLines,
                  triggerTasksByLine,
                  installmentSelection,
                );
            if (missing.length) {
              const content = perServiceTriggers
                ? tr("These services have no trigger task and will not create a Payment Request automatically: {0}. Create the contract anyway?", { 0: missing.join(", ") })
                : comboBillingActive
                ? tr("These items have no trigger task, so their Payment Request will stay pending: {0}. Create the contract anyway?", { 0: missing.join(", ") })
                : tr("These installments have no trigger task and will not be activated automatically: {0}. Create the contract anyway?", { 0: missing.join(", ") });
              const proceed = Modal?.confirm
                ? await new Promise((resolve) => {
                    Modal.confirm({
                      title: perServiceTriggers
                        ? tr("Services without payment trigger")
                        : comboBillingActive
                          ? tr("Items without trigger tasks")
                          : tr("Installments without trigger tasks"),
                      content,
                      okText: tr("Create anyway"),
                      cancelText: tr("Back to form"),
                      maskClosable: false,
                      onOk: () => resolve(true),
                      onCancel: () => resolve(false),
                    });
                  })
                : true;
              if (!proceed) return;
            }
          }

          setSavingState(true);
          try {
            const name = form.contractName.trim();
            // Case-less By Service contract: remember which sample tasks were
            // ticked, so CaseCreateForm.js can pre-tick them when a Case is
            // created from this contract (spec §5 B). Only the create call gets
            // the field — contractServicePayload itself stays untouched for the
            // projectServices/quotationServices sync that reuses it.
            const withTriggerTemplateIds = (payload, key) => {
              // Per-service triggers only — Combo pricing bills per item and
              // keeps its sample-task ticks on the schedule rows instead.
              if (
                !payload ||
                !isByService ||
                comboBillingActive ||
                !triggerDataCurrent ||
                triggerSource !== "template"
              )
                return payload;
              const ids = triggerTemplateIdsFor(triggerTasksByLine, triggerSelection, key);
              return ids ? { ...payload, paymentTriggerTemplateIds: ids } : payload;
            };
            const quotationId = form.quotationId
              ? parseInt(form.quotationId, 10)
              : null;
            const currentProjectId = getConfiguredProjectId();
            const projectId =
              currentProjectId ||
              (form.projectId ? parseInt(form.projectId, 10) : null);
            const parentId = form.parentId ? parseInt(form.parentId, 10) : null;
            const projectServiceId = form.projectServiceId
              ? parseInt(form.projectServiceId, 10)
              : null;
            const serviceLinesForSubmit = selectedContractServiceLines.length
              ? selectedContractServiceLines
              : projectServiceId
                ? [
                    {
                      projectServiceId,
                      quotationServiceId: form.quotationServiceId
                        ? parseInt(form.quotationServiceId, 10)
                        : null,
                      projectId,
                    },
                  ]
                : [];
            const formPackagePricingSource =
              form.pricingMode === "package"
                ? {
                    pricingMode: "package",
                    packageSubTotal: form.subTotal || form.fixedAmount,
                    packageVatRate: form.packageVatRate,
                    packageVatAmount: form.vatAmount,
                    packageTotalAmount: form.totalAmount || form.fixedAmount,
                  }
                : null;
            // Both sources can now hold rows at once (a pre-loaded Case/Quotation
            // line list plus services added fresh in this session) — no longer
            // mutually exclusive on serviceLines.length.
            const manualServiceRowsForSubmit = manualServiceRows.filter(
              (row) => row.serviceName || row.serviceId,
            );
            const contractKind =
              form.contractKind || (parentId ? "appendix" : "main");
            const finalContractCode =
              form.contractCode.trim() ||
              (await generateContractCode({
                prefix: autoCodePrefix,
                issuedDate: form.signedDate,
                parentId,
              }));
            // The header is VND (INV-1) — see selectedCurrency.
            const submitCurrency = selectedCurrency;
            const submitCurrencyId =
              extractCurrencyId(submitCurrency) || extractCurrencyId(form.currencyId);
            const pricingRowsForSummary =
              form.pricingMode === "package"
                ? [
                    {
                      currencyId: submitCurrencyId,
                      subTotal: form.subTotal || form.fixedAmount,
                      vatAmount: form.vatAmount,
                      totalAmount: form.totalAmount || form.fixedAmount,
                    },
                  ]
                : [
                    ...serviceLinesForSubmit,
                    ...manualServiceRowsForSubmit.map((row) => ({
                      ...row,
                      ...manualServiceLineAmounts(row, false, getCurrencyDecimals(findCurrencyById(currencies, row.currencyId) || findDefaultCurrency(currencies))),
                    })),
                  ];
            const preliminarySummary = buildContractFinancialSummary({
              rows: pricingRowsForSummary,
              currencies,
              baseCurrency: submitCurrency,
              pricingDate: form.signedDate || new Date().toISOString(),
            });
            const rateCurrencyIds = getConversionSourceCurrencyIds(
              preliminarySummary.groups,
              submitCurrency,
            );
            const exchangeRates = rateCurrencyIds.length
              ? await fetchExchangeRatesForConversion(
                  rateCurrencyIds,
                  submitCurrencyId,
                )
              : [];
            const financialSummary = buildContractFinancialSummary({
              rows: pricingRowsForSummary,
              currencies,
              baseCurrency: submitCurrency,
              exchangeRates,
              pricingDate: form.signedDate || new Date().toISOString(),
            });
            if (!financialSummary.converted.canConvert) {
              message.warning(
                tr("Missing exchange rate: {0}", { 0: formatMissingRatePairs(financialSummary.missing, submitCurrency) }),
              );
              return;
            }
            const headerTotals = financialSummary.converted;
            // Priced service lines: the database keeps Σ lines as the total
            // (2026-09-29 money flow), so the installments are split from that
            // same number; a retainer / combo keeps the typed "Total amount".
            const resolvedTotalAmount = resolveContractTotal({
              rows: pricingRowsForSummary,
              isRetainer,
              packageMode: form.pricingMode === "package",
              typedTotal: form.totalAmount,
              linesTotal: headerTotals.totalAmount,
            });
            const paymentSchedulePayload = buildPaymentSchedulePayload({
              form: {
                ...form,
                currencyId: submitCurrencyId || form.currencyId,
                currencyCode: getCurrencyCode(submitCurrency),
                totalAmount: resolvedTotalAmount,
              },
              isRetainer,
              currency: submitCurrency,
            });
            const resolvedPaymentDate = isMultiplePayments
              ? paymentSchedulePayload?.firstPaymentDate
              : form.paymentDate;

            const payload = {
              status: form.status || "draft",
              contractKind,
              contractType: form.contractType || null,
              billingCycle: form.billingCycle || null,
              contractCode: finalContractCode,
              contractName: name,
              customerId: parseInt(form.customerId, 10),
              internalCompanyId: parseInt(form.internalCompanyId, 10),
              lawyerId: form.lawyerId ? parseInt(form.lawyerId, 10) : null,
              templateId: form.templateId ? parseInt(form.templateId, 10) : null,
              quotationId,
              quotations: quotationId || undefined,
              currencyId: submitCurrencyId || null,
              pricingMode: form.pricingMode,
              packageVatRate:
                form.pricingMode === "package" ? parseNum(form.packageVatRate) : null,
              cases:
                projectId && contractKind !== "appendix" ? [projectId] : undefined,
              parentId,
              parent: parentId || undefined,
              issuedDate: toIso(form.signedDate),
              signedAt: toIso(form.signedDate),
              endDate: isRetainer
                ? toIso(form.endDate)
                : isMultiplePayments
                  ? null
                  : toIso(form.endDate),
              paymentDate: toIsoDateTime(resolvedPaymentDate),
              fixedAmount: resolvedTotalAmount || null,
              billingPlans: isRetainer
                ? [
                    {
                      planType: "retainer",
                      status: "active",
                      totalAmount: resolvedTotalAmount || null,
                      startDate: toIso(form.paymentDate),
                      endDate: toIso(form.endDate),
                      retainerUnit: form.retainerRepeatUnit || "month",
                      retainerTotalCycles: nullableNum(form.retainerDuration),
                    },
                  ]
                : undefined,
              subTotal: headerTotals.subTotal,
              vatAmount: headerTotals.vatAmount,
              totalAmount: resolvedTotalAmount || null,
              // paymentSchedule (JSON) is deprecated — By Case's schedule is now
              // real "contractPaymentSchedules" rows, created below once
              // contractId is known (see
              // docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md).
              // Not sent at all here, not even as null, so the column simply
              // stops being written by new contracts going forward.
              scopeNote: form.scopeNote.trim() || null,
              description: form.description.trim() || null,
              isRequiredApproval: form.isRequiredApproval,
              approvedById:
                form.isRequiredApproval && form.approvedById
                  ? parseInt(form.approvedById, 10)
                  : null,
              approvedAt: form.isRequiredApproval ? new Date().toISOString() : null,
            };

            Object.keys(payload).forEach((key) => {
              if (payload[key] === undefined) delete payload[key];
            });

            // By Service with an existing Case: write the ticked triggers onto
            // the real tasks BEFORE contracts:create. payload.cases is a hasMany
            // on projects.contractId, so creating the contract already links the
            // Case and fires by_service_contract_linked_catches_up_done_tasks,
            // which reads isPaymentTrigger at that moment (the later
            // projects:update is then a no-op for it). Flags written first mean
            // a service whose ticked tasks are already Done gets its Payment
            // Request right away, and an unticked default never creates one
            // (spec §5 A). Harmless if contract creation then fails: no contract
            // gets linked by this submit.

            if (isByService && !comboBillingActive && triggerDataCurrent && triggerSource === "case") {
              const triggerChanges = diffTaskTriggers(triggerTasksByLine, triggerSelection);
              let failedTriggerWrites = 0;
              for (const change of triggerChanges) {
                try {
                  await ctx.api.request({
                    url: `tasks:update?filterByTk=${change.id}`,
                    method: "POST",
                    data: { isPaymentTrigger: change.isPaymentTrigger },
                  });
                } catch (triggerErr) {
                  failedTriggerWrites += 1;
                  console.warn(
                    "[ContractCreateForm] Could not save payment trigger on task:",
                    change.id,
                    triggerErr,
                  );
                }
              }
              if (failedTriggerWrites) {
                message.warning(
                  tr("Could not save payment trigger on {0} task(s) — set it in Task detail.", { 0: failedTriggerWrites }),
                );
              }
            }

            const contractRes = await ctx.api.request({
              url: "contracts:create",
              method: "POST",
              data: payload,
            });
            const contractId = contractRes?.data?.data?.id || contractRes?.data?.id;
            if (!contractId)
              throw new Error(tr("Could not retrieve contract id after creation"));
            const createdContract = contractRes?.data?.data ||
              contractRes?.data || {
                ...payload,
                id: contractId,
              };

            if (isRetainer && payload.billingPlans?.length) {
              try {
                await ensureRetainerBillingPlan(contractId, payload.billingPlans[0]);
              } catch (planError) {
                console.warn("[ContractCreateForm] retainer billing plan not created", planError);
                message.warning(
                  tr("The contract was created, but its retainer billing plan could not be saved — set it up from the case's Finance tab (New billing plan)."),
                );
              }
            }

            const contractServiceLines = [];
            // Resolves a payment-schedule row's local serviceKeys (lineKey(line)
            // for a catalog line, row.id for a manual row — see
            // paymentScheduleServiceOptions) to the real contractServiceId
            // created below. Filled in as each service line is created, then
            // read once both loops finish, right before creating the
            // contractPaymentSchedules rows (moved after service creation for
            // exactly this reason — the schedule loop used to run first, when
            // no contractServiceId existed yet to tag installments with).
            const contractServiceKeyMap = new Map();

            if (contractId && serviceLinesForSubmit.length) {
              for (const line of serviceLinesForSubmit) {
                const lineProjectServiceId = extractId(line.projectServiceId);
                const lineQuotationServiceId = extractId(line.quotationServiceId);
                // A line sourced from a Case-less Quotation has no
                // projectServiceId — still submittable as long as it has its own
                // quotationServiceId (only skip lines with neither identity).
                if (!lineProjectServiceId && !lineQuotationServiceId) continue;
                const contractServicePayload = await buildContractServicePayload({
                  contractId,
                  projectServiceId: lineProjectServiceId,
                  quotationServiceId: extractId(line.quotationServiceId),
                  projectId,
                  serviceLine: line,
                  submitCurrencyId,
                });
                const createdLine = await createContractServiceLine(
                  withPackageGroupFields(withTriggerTemplateIds(contractServicePayload, lineKey(line)), lineKey(line)),
                );
                if (createdLine) {
                  contractServiceLines.push(createdLine);
                  contractServiceKeyMap.set(lineKey(line), extractId(createdLine.id));
                }

                const contractServiceServiceId =
                  extractId(contractServicePayload?.serviceId) || null;
                const projectServiceUpdatePayload = {
                  ...projectServicePricingPayload(
                    formPackagePricingSource || contractServicePayload || line,
                  ),
                  // Combo pricing: this row's GROUP share, not the contract-wide
                  // package total formPackagePricingSource carries (the Case
                  // sums one amount per combo group).
                  ...packageGroupFieldsFor(lineKey(line)),
                  serviceName:
                    line.serviceName || contractServicePayload?.serviceName,
                  serviceType:
                    line.serviceType || contractServicePayload?.serviceType || null,
                  description:
                    line.description || contractServicePayload?.description,
                  // Đồng bộ serviceId — quan trọng để giữ link trong CaseServices
                  ...(contractServiceServiceId
                    ? {
                        serviceId: contractServiceServiceId,
                        ServiceId: contractServiceServiceId,
                        services: contractServiceServiceId,
                      }
                    : {}),
                  contractId,
                  contracts: contractId,
                  contractServiceId: extractId(createdLine?.id) || undefined,
                  contractServices: extractId(createdLine?.id) || undefined,
                  status: contractStatusToProjectServiceStatus(form.status),
                  quotationServiceId:
                    contractServicePayload?.quotationServiceId || undefined,
                  quotationServices:
                    contractServicePayload?.quotationServiceId || undefined,
                  // projectServices' currency field is the belongsTo association
                  // "currencies" (plural), not "currency" — keep both the scalar
                  // and the relation in sync with the resolved line currency.
                  currencyId: contractServicePayload?.currencyId || null,
                  currencies: contractServicePayload?.currencyId || null,
                };
                Object.keys(projectServiceUpdatePayload).forEach((key) => {
                  if (projectServiceUpdatePayload[key] === undefined)
                    delete projectServiceUpdatePayload[key];
                });

                // No projectServices row exists for a Case-less quotation line —
                // nothing to sync back to.
                if (lineProjectServiceId) {
                  // the contract line was created linked to this case line:
                  // the service thread already copied its content
                  // the contract exists already: a refused case-line update is
                  // shown, and the rest of the save goes on
                  try {
                    await updateProjectServiceLineSafely(
                      lineProjectServiceId,
                      linkedLineFollowUpPayload(projectServiceUpdatePayload),
                    );
                  } catch (error) {
                    message.warning(apiErrorText(error, tr("Could not update the case line.")));
                    console.warn("[ContractCreateForm] Could not update projectService:", error);
                  }
                }

                const targetQuotationServiceId =
                  extractId(contractServicePayload?.quotationServiceId) ||
                  extractId(line.quotationServiceId);
                if (targetQuotationServiceId) {
                  try {
                    const quotationServicePayload = {
                      serviceId: contractServiceServiceId || null,
                      ServiceId: contractServiceServiceId || null,
                      services: contractServiceServiceId || null,
                      serviceName:
                        line.serviceName ||
                        contractServicePayload?.serviceName ||
                        null,
                      serviceType:
                        line.serviceType ||
                        contractServicePayload?.serviceType ||
                        null,
                      description:
                        line.description ||
                        contractServicePayload?.description ||
                        null,
                      currencyId: contractServicePayload?.currencyId || null,
                      currency: contractServicePayload?.currencyId || null,
                      basePrice: contractServicePayload?.basePrice,
                      quantity: contractServicePayload?.quantity,
                      vat: contractServicePayload?.vat,
                      subTotal: contractServicePayload?.subTotal,
                      vatAmount: contractServicePayload?.vatAmount,
                      totalAmount: contractServicePayload?.totalAmount,
                      pricingMode: contractServicePayload?.pricingMode,
                      packageSubTotal: contractServicePayload?.packageSubTotal,
                      packageVatRate: contractServicePayload?.packageVatRate,
                      packageVatAmount: contractServicePayload?.packageVatAmount,
                      packageTotalAmount: contractServicePayload?.packageTotalAmount,
                    };
                    Object.keys(quotationServicePayload).forEach((key) => {
                      if (quotationServicePayload[key] === undefined)
                        delete quotationServicePayload[key];
                    });
                    await ctx.api.request({
                      url: `quotationServices:update?filterByTk=${targetQuotationServiceId}`,
                      method: "POST",
                      data: linkedLineFollowUpPayload(quotationServicePayload),
                    });
                    const targetQuotationId =
                      extractId(line.quotationId) || extractId(form.quotationId);
                    if (targetQuotationId) {
                      await syncQuotationHeaderFromServices(targetQuotationId);
                    }
                  } catch (error) {
                    message.warning(apiErrorText(error, tr("Could not update the quotation line.")));
                    console.warn(
                      "[ContractCreateForm] Could not sync quotationService in handleSubmit:",
                      error,
                    );
                  }
                }
              }
            }

            if (contractId && manualServiceRowsForSubmit.length) {
              for (const row of manualServiceRowsForSubmit) {
                const contractServicePayload = buildManualContractServicePayload({
                  contractId,
                  row,
                  projectId,
                  submitCurrencyId,
                });
                const createdLine = await createContractServiceLine(
                  withPackageGroupFields(withTriggerTemplateIds(contractServicePayload, row.id), row.id),
                );
                if (createdLine) {
                  contractServiceLines.push(createdLine);
                  contractServiceKeyMap.set(row.id, extractId(createdLine.id));
                }
              }
            }

            // By Case only — Retainer's own schedule lives on billingPlans
            // (already sent nested above), and By Service has no upfront
            // schedule at all (its Payment Requests are created dynamically
            // by the by_service_task_group_done_creates_payment_request SQL
            // trigger once a service's flagged tasks are done). Each row
            // insert fires by_case_schedule_row_creates_payment_request(),
            // which creates that installment's Payment Request immediately —
            // see the unified data model spec. Runs after both service-creation
            // loops above (not before, as originally) so serviceKeys can be
            // resolved to real contractServiceId via contractServiceKeyMap.
            // Multiple payments only. One time gets no rows from here — its
            // single 100% on_case_done installment (and so its Payment Request)
            // is created by SQL when a Case is linked to the contract
            // (by_case_one_time_ensure_payment_request in
            // pgsql/unified_contract_payment_schedule.sql). Rows left over in
            // form.paymentSchedule after switching Multiple → One time are
            // ignored instead of being created.
            const byCaseInstallments = isMultiplePayments
              ? paymentSchedulePayload?.installments || []
              : [];
            // By Service + Combo pricing: one schedule row per billing item
            // (combo / standalone service) with the amount set in the popup,
            // tagged with the item's services. Its Payment Request is created
            // pending by the same SQL trigger and activated when all linked
            // trigger tasks are Done; no due date here — it's set when the
            // request activates (spec 2026-09-25).
            const comboPool = Math.round(parseNum(form.totalAmount));
            const comboInstallments = comboBillingActive
              ? installmentItems.map((item, index) => ({
                  id: item.key,
                  installmentNo: index + 1,
                  label: item.name,
                  percentage: comboPool > 0 ? Math.round(((packageAmounts[item.key] || 0) * 10000) / comboPool) / 100 : null,
                  amount: packageAmounts[item.key] || 0,
                  triggerType: "on_task_done",
                  dueDate: null,
                  serviceKeys: item.serviceKeys,
                }))
                  // An item left at 0 gets no row, so no 0đ Payment Request
                  // (flagged "zero" in the popup).
                  .filter((installment) => installment.amount > 0)
              : [];
            // 2026-09-29: By Case One time with trigger tasks ticked — its single
            // payment takes them. With a Case linked, the database has already
            // made that payment (by_case_one_time_ensure_payment_request, 100%)
            // and it is reused; with no Case yet it is created here carrying the
            // ticked sample tasks (CaseCreateForm.js links the real ones). Linked
            // tasks switch it from "Case Done" to "all trigger tasks Done"
            // (pgsql/by_case_payment_request_automation.sql).
            const oneTimeInstallments =
              isByCase &&
              !isMultiplePayments &&
              triggerDataCurrent &&
              (installmentSelection[ONE_TIME_TRIGGER_KEY] || []).length
                ? [
                    {
                      id: ONE_TIME_TRIGGER_KEY,
                      installmentNo: 1,
                      label: "One-time payment",
                      percentage: 100,
                      amount: Math.round(parseNum(resolvedTotalAmount)),
                      triggerType: "on_case_done",
                      dueDate: payload.paymentDate || null,
                      reuseExisting: true,
                    },
                  ]
                : [];
            const scheduleInstallments = isByCase
              ? [...byCaseInstallments, ...oneTimeInstallments]
              : comboInstallments;
            // Trigger tasks per installment/item (by-case spec §5): ticks made
            // in the Payment Triggers popup, only if loaded for the current scope.
            const installmentTicks = (installmentId) =>
              (isByCase || comboBillingActive) && triggerDataCurrent
                ? installmentSelection[installmentId] || []
                : [];
            let failedInstallmentLinks = 0;
            if (contractId && (isByCase || comboBillingActive) && scheduleInstallments.length) {
              for (const installment of scheduleInstallments) {
                try {
                  const resolvedServiceIds = (installment.serviceKeys || [])
                    .map((key) => contractServiceKeyMap.get(key))
                    .filter(Boolean);
                  const ticked = installmentTicks(installment.id);
                  // One time: the row the database made when the Case was linked
                  let existingRowId = null;
                  if (installment.reuseExisting) {
                    const existingRes = await ctx.api.request({
                      url: "contractPaymentSchedules:list",
                      params: {
                        filter: JSON.stringify({ contractId: { $eq: contractId } }),
                        fields: ["id"],
                        sort: ["installmentNo"],
                        pageSize: 5,
                      },
                    });
                    existingRowId = extractId(existingRes?.data?.data?.[0]?.id);
                  }
                  const scheduleRes = existingRowId
                    ? null
                    : await ctx.api.request({
                    url: "contractPaymentSchedules:create",
                    method: "POST",
                    data: {
                      contractId,
                      installmentNo: installment.installmentNo,
                      label: installment.label,
                      percentage: installment.percentage,
                      amount: installment.amount,
                      triggerType: installment.triggerType,
                      dueDate: installment.dueDate,
                      // No Case yet: remember the ticked sample tasks;
                      // CaseCreateForm.js links the real tasks on Case creation.
                      ...(triggerSource === "template" && ticked.length
                        ? { triggerTemplateIds: [...ticked] }
                        : {}),
                    },
                  });
                  // Junction rows (contractPaymentScheduleServices), not a JSON
                  // field — see docs/superpowers/specs/2026-09-17-unified-
                  // contract-payment-data-model-design.md §6h. Needs the
                  // schedule row's own id, so this only runs after it's created.
                  const scheduleRowId =
                    existingRowId || extractId(scheduleRes?.data?.data?.id || scheduleRes?.data?.id);
                  if (scheduleRowId && resolvedServiceIds.length) {
                    await Promise.all(
                      resolvedServiceIds.map((serviceId) =>
                        ctx.api
                          .request({
                            url: "contractPaymentScheduleServices:create",
                            method: "POST",
                            data: {
                              contractPaymentScheduleId: scheduleRowId,
                              contractServiceId: serviceId,
                            },
                          })
                          .catch((tagErr) =>
                            console.warn(
                              "[ContractCreateForm] Could not tag payment schedule row with a service:",
                              tagErr,
                            ),
                          ),
                      ),
                    );
                  }
                  // Case exists: link the ticked tasks. Open tasks first, Done
                  // ones last, so a partly linked unit never looks complete.
                  //  - By Service combo / standalone item (2026-09-28, spec
                  //    docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md §3):
                  //    no request exists yet — tick isPaymentTrigger; the request
                  //    is created once every trigger task of the item's
                  //    services is Done (pgsql/unified_contract_payment_schedule.sql).
                  //  - By Case: link to the installment's Payment Request the
                  //    insert above just created (AFTER INSERT trigger).
                  // Own try/catch: the row already exists here, so a failure
                  // must be reported as unlinked tasks, not as "installment
                  // not created" by the outer catch.
                  if (ticked.length && triggerSource === "case" && comboBillingActive) {
                    for (const taskId of orderLinksOpenFirst(ticked, installmentTasksById)) {
                      try {
                        await ctx.api.request({
                          url: `tasks:update?filterByTk=${taskId}`,
                          method: "POST",
                          data: { isPaymentTrigger: true },
                        });
                      } catch (linkErr) {
                        failedInstallmentLinks += 1;
                        console.warn("[ContractCreateForm] Could not tick trigger task:", taskId, linkErr);
                      }
                    }
                  } else if (ticked.length && triggerSource === "case") {
                    let prId = null;
                    try {
                      if (scheduleRowId) {
                        const prRes = await ctx.api.request({
                          url: "paymentRequests:list",
                          params: {
                            filter: JSON.stringify({ contractPaymentScheduleId: { $eq: scheduleRowId } }),
                            fields: ["id"],
                            pageSize: 5,
                          },
                        });
                        prId = extractId(prRes?.data?.data?.[0]?.id);
                      }
                    } catch (prErr) {
                      console.warn("[ContractCreateForm] Could not find installment Payment Request:", prErr);
                    }
                    if (!prId) {
                      failedInstallmentLinks += ticked.length;
                    } else {
                      for (const taskId of orderLinksOpenFirst(ticked, installmentTasksById)) {
                        try {
                          await ctx.api.request({
                            url: `tasks:update?filterByTk=${taskId}`,
                            method: "POST",
                            data: { linkedPaymentRequestId: prId },
                          });
                        } catch (linkErr) {
                          failedInstallmentLinks += 1;
                          console.warn(
                            "[ContractCreateForm] Could not link task to installment:",
                            taskId,
                            linkErr,
                          );
                        }
                      }
                    }
                  }
                } catch (scheduleErr) {
                  console.warn(
                    "[ContractCreateForm] Could not create contractPaymentSchedules row:",
                    scheduleErr,
                  );
                  message.warning(
                    comboBillingActive
                      ? tr("Could not create the Payment Request for \"{0}\" — create it manually for this contract.", { 0: installment.label })
                      : tr("Could not create payment schedule installment \"{0}\" — its Payment Request was not auto-created. You can add it manually from the contract's Payment Schedule tab.", { 0: installment.label }),
                  );
                }
              }
            }
            if (failedInstallmentLinks) {
              message.warning(
                tr("Could not link {0} task(s) to their installment — link them in Task Management.", { 0: failedInstallmentLinks }),
              );
            }

            if (contractId && projectId && contractKind === "main") {
              await ctx.api
                .request({
                  url: "projects:update",
                  method: "POST",
                  params: { filterByTk: projectId },
                  data: { contractId },
                })
                .catch((error) =>
                  console.warn(
                    "[ContractCreateForm] Could not link main contract to project",
                    error,
                  ),
                );
            }

            if (contractId && currentProjectId && contractKind === "main") {
              await ensureMainContractFolder({
                contractId,
                projectId: currentProjectId,
                customerId: payload.customerId,
                contractCode: finalContractCode,
                contractName: name,
              });
            }

            message.success(tr("Contract created successfully."));
            emitQuickCreateCreated("contracts", createdContract);
            isDirtyRef.current = false;

            // The user already opted in per-row (the "Also save to the shared
            // catalog" checkbox in the Create New Service form, checked at the
            // moment they typed the name) — nothing to ask here, just carry out
            // what they already chose, now that the contract is confirmed
            // created. Deferred to this point (rather than writing immediately
            // when the checkbox was checked) so deleting the row or abandoning
            // the contract before submit never leaves a "phantom" catalog entry.
            const rowsToSaveToCatalog = manualServiceRows.filter(
              (r) => !r.serviceId && r.serviceName?.trim() && r._saveToCatalog,
            );
            // Tracks row.id -> the services.id created for it below, so the
            // combo-catalog-save pass further down can resolve a real serviceId
            // for a custom combo item too, not just already-catalog ones.
            const newServiceIdByRowId = new Map();
            if (rowsToSaveToCatalog.length > 0) {
              let savedCount = 0;
              for (const r of rowsToSaveToCatalog) {
                // Defensive re-check — services could only have gone stale
                // within this same form session, but skipping a would-be
                // duplicate here costs nothing and matches the "never create a
                // duplicate catalog entry" rule the Select-tab list enforces.
                if (filteredServiceOptions.some((s) => normalizeSearch(serviceCatalogName(s)) === normalizeSearch(r.serviceName))) continue;
                try {
                  const svcRes = await ctx.api.request({
                    url: "services:create",
                    method: "POST",
                    data: {
                      serviceName: r.serviceName,
                      serviceType: r.serviceType || null,
                      description: r.description || null,
                      basePrice: parseNum(r.basePrice) || 0,
                      currencyId: r.currencyId || null,
                    },
                  });
                  const newServiceId = svcRes?.data?.data?.id;
                  if (newServiceId) {
                    savedCount++;
                    newServiceIdByRowId.set(r.id, newServiceId);
                    // BR-DATA-02: every service picker in this codebase reads
                    // companyServices, not services directly — skipping this
                    // link would leave the new service invisible everywhere
                    // until someone adds it by hand.
                    try {
                      await ctx.api.request({
                        url: "companyServices:create",
                        method: "POST",
                        data: {
                          internalCompanyId: parseInt(form.internalCompanyId),
                          serviceId: newServiceId,
                          serviceName: r.serviceName,
                          serviceType: r.serviceType || null,
                          description: r.description || null,
                          price: parseNum(r.basePrice) || 0,
                          vat: parseNum(r.vat) || 0,
                          currencyId: r.currencyId || null,
                        },
                      });
                    } catch (linkErr) {
                      console.warn("Could not link new service to company catalog:", linkErr);
                    }
                  }
                } catch (err) {
                  console.warn(`Could not save "${r.serviceName}" to the catalog:`, err);
                }
              }
              if (savedCount > 0) {
                message.success(tr("{0} service{1} added to the catalog.", { 0: savedCount, 1: savedCount === 1 ? "" : "s" }));
              }
            }

            // Same deferred-write idea, one level up: for each ad-hoc combo
            // whose "Also save this combo to the shared catalog" was checked,
            // create serviceCombos + one serviceComboItems row per member
            // service that now has a real serviceId (either it was catalog-
            // picked to begin with, or it's a custom item saved via
            // newServiceIdByRowId above — every custom item auto-saves when the
            // combo checkbox is checked). An item still ends up without a
            // serviceId only if its name already matched an existing catalog
            // entry (skipped to avoid a duplicate, see the dedup check above)
            // or its own services:create call failed — that item alone is left
            // out of the combo definition (warned about below), not the whole
            // combo skipped.
            if (pendingComboCatalogSaves.length > 0) {
              for (const comboEntry of pendingComboCatalogSaves) {
                const comboRows = manualServiceRows.filter((r) => r._comboInstanceId === comboEntry.instanceId);
                const resolved = comboRows
                  .map((r) => ({
                    serviceId: r.serviceId ? parseInt(r.serviceId) : newServiceIdByRowId.get(r.id) || null,
                    serviceName: r.serviceName,
                    serviceType: r.serviceType,
                  }))
                  .filter((it) => it.serviceId);
                const skippedCount = comboRows.length - resolved.length;
                if (!resolved.length) {
                  console.warn(`Skipped saving combo "${comboEntry.comboName}" to the catalog — no service in it has a real catalog link.`);
                  message.warning(tr("Combo \"{0}\" was not saved to the catalog — its services could not be linked (a name may already be in use, or saving one of them failed).", { 0: comboEntry.comboName }));
                  continue;
                }
                const byServiceId = new Map();
                for (const it of resolved) {
                  const key = String(it.serviceId);
                  if (!byServiceId.has(key)) byServiceId.set(key, { ...it, quantity: 1 });
                  else byServiceId.get(key).quantity += 1;
                }
                try {
                  const vatAmount = Math.round((parseNum(comboEntry.packageSubTotal) * parseNum(comboEntry.packageVatRate)) / 100);
                  const comboRes = await ctx.api.request({
                    url: "serviceCombos:create",
                    method: "POST",
                    data: {
                      comboName: comboEntry.comboName,
                      serviceComboType: comboEntry.serviceComboType || null,
                      packageSubTotal: parseNum(comboEntry.packageSubTotal),
                      packageVatRate: parseNum(comboEntry.packageVatRate),
                      packageVatAmount: vatAmount,
                      totalAmount: parseNum(comboEntry.packageSubTotal) + vatAmount,
                      currencyId: comboEntry.currencyId || null,
                      isActive: true,
                    },
                  });
                  const newComboId = comboRes?.data?.data?.id;
                  if (newComboId) {
                    await Promise.all(
                      Array.from(byServiceId.values()).map((it) =>
                        ctx.api.request({
                          url: "serviceComboItems:create",
                          method: "POST",
                          data: { comboId: newComboId, serviceId: it.serviceId, serviceName: it.serviceName, serviceType: it.serviceType || null, quantity: it.quantity },
                        }).catch((itemErr) => console.warn("Could not add service to new catalog combo:", itemErr)),
                      ),
                    );
                    message.success(
                      skippedCount > 0
                        ? tr("Combo \"{0}\" saved to the catalog — {1} custom service(s) without a catalog link were left out.", { 0: comboEntry.comboName, 1: skippedCount })
                        : tr("Combo \"{0}\" saved to the catalog.", { 0: comboEntry.comboName }),
                    );
                  }
                } catch (comboErr) {
                  console.warn(`Could not save combo "${comboEntry.comboName}" to the catalog:`, comboErr);
                  message.warning(tr("Could not save combo \"{0}\" to the catalog.", { 0: comboEntry.comboName }));
                }
              }
            }

            setSavingState(false);
            await closePopupAfterSubmit();
            setForm((prev) => ({
              ...prev,
              contractCode: "",
              contractName: "",
              parentId: "",
              projectServiceId: "",
              quotationServiceId: "",
              contractKind: "main",
              quotationId: "",
              projectId: "",
              paymentDate: todayInput(),
              paymentSchedule: [newPaymentScheduleRow(1)],
              retainerRepeatAnchorType: "month",
              retainerRepeatAnchorValue: "1",
              retainerRepeatInterval: "1",
              retainerRepeatUnit: "month",
              monthlyFee: "",
              fixedAmount: "",
              retainerDuration: "",
              includedHours: "",
              overageHourlyRate: "",
              subTotal: "",
              vatAmount: "",
              totalAmount: "",
              scopeNote: "",
              description: "",
              isRequiredApproval: false,
              approvedById: "",
              packageVatRate: "8",
            }));
            setSelectedServiceIds([]);
            setManualServiceRows([]);
            setServiceLines((prev) =>
              prev.map((line) =>
                serviceLinesForSubmit.some(
                  (selectedLine) => lineKey(selectedLine) === lineKey(line),
                )
                  ? {
                      ...line,
                      contractId,
                      locked: true,
                      status: contractStatusToProjectServiceStatus(form.status),
                    }
                  : line,
              ),
            );
          } catch (err) {
            console.error(err);
            message.error(
              tr("Could not create contract{0}", { 0: err?.message ? `: ${err.message}` : "" }),
            );
          } finally {
            setSavingState(false);
          }
        };

        if (loading) {
          return React.createElement(
            "div",
            { style: { padding: 32, textAlign: "center" } },
            React.createElement(Spin, null),
          );
        }

        return React.createElement(
          "div",
          {
            style: {
              fontFamily: FONT,
              color: C.text,
              background: C.bg,
              padding: 20,
              width: "100%",
              boxSizing: "border-box",
            },
            onChange: markDirty,
            onInput: markDirty,
          },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginBottom: 12,
              },
            },
            AntButton
              ? React.createElement(
                  AntButton,
                  { onClick: () => setGuideOpen(true) },
                  tr("Guide"),
                )
              : React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => setGuideOpen(true),
                    style: {
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      background: "#ffffff",
                      color: C.text,
                      padding: "8px 13px",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: FONT,
                      cursor: "pointer",
                    },
                  },
                  tr("Guide"),
                ),
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr)",
                alignItems: "start",
                width: "100%",
              },
            },
            React.createElement(
              "div",
              { style: { minWidth: 0 } },
              // Internal company is now the first field inside "Contract
              // information" itself (2026-09-21) instead of its own separate
              // gate Section — the rest of the form below is always rendered
              // (not hidden), just visually/interactively disabled until it's
              // set (see the wrapper right after this Section closes), so a
              // lawyer can see the full shape of the form immediately instead
              // of a single field followed by a placeholder message.
              React.createElement(
                Section,
                { title: tr("Contract information") },
                React.createElement(
                  "div",
                  { style: gridStyle },
                  React.createElement(
                    Field,
                    { label: tr("Internal company"), required: true },
                    React.createElement(SearchSelect, {
                      value: form.internalCompanyId,
                      onChange: (v) => setF("internalCompanyId", v),
                      options: companyOptions,
                      placeholder: tr("Select company"),
                    }),
                  ),
                  React.createElement(
                    Field,
                    { label: tr("Payment mode"), required: true },
                    React.createElement(SelectInput, {
                      value: isRetainer ? "periodic" : "non_periodic",
                      onChange: (mode) =>
                        handleContractTypeChange(
                          mode === "periodic" ? "retainer" : "byCase",
                        ),
                      options: PAYMENT_MODE_OPTIONS,
                    }),
                  ),
                  // Retainer hides "Contract type" — Status/Contract code slide
                  // left to fill that gap instead of leaving it empty in the
                  // middle of the row (2026-09-22: an empty 3rd-of-5 cell read
                  // as an obvious mistake). The empty aria-hidden placeholder
                  // moves to the END of the row instead — still exactly 5 items
                  // rendered either way, so "Contract name" (item 6) keeps
                  // starting row 2 in both modes; only *which* slot sits empty
                  // changes.
                  !isRetainer &&
                    React.createElement(
                      Field,
                      { label: tr("Contract type"), required: true },
                      React.createElement(SelectInput, {
                        value: form.contractType,
                        onChange: handleContractTypeChange,
                        options: NON_PERIODIC_CONTRACT_TYPES,
                      }),
                    ),
                        React.createElement(
                          Field,
                          { label: tr("Status") },
                          React.createElement(SelectInput, {
                            value: form.status,
                            onChange: (v) => setF("status", v),
                            options: STATUS_OPTIONS,
                          }),
                        ),
                        React.createElement(
                          Field,
                          { label: tr("Contract code") },
                          React.createElement(TextInput, {
                            value: form.contractCode,
                            onChange: (v) => setF("contractCode", v),
                            placeholder: tr("Leave blank to auto-generate {0}", { 0: autoCodePrefix }),
                          }),
                        ),
                        isRetainer &&
                          React.createElement("div", { "aria-hidden": true }),
                        React.createElement(
                          Field,
                          { label: tr("Contract name"), required: true },
                          React.createElement(TextInput, {
                            value: form.contractName,
                            onChange: (v) => setF("contractName", v),
                            placeholder: tr("Contract name"),
                          }),
                        ),
                        React.createElement(
                          Field,
                          { label: tr("Parent contract") },
                          React.createElement(SearchSelect, {
                            value: form.parentId,
                            onChange: (v) => setF("parentId", v),
                            options: parentContractOptions,
                            placeholder: tr("No parent"),
                          }),
                        ),
                        // Simplified (2026-09-21) — replaces the old bespoke
                        // ApprovalSection card (colored toggle box + badge) with
                        // 2 plain Fields in the same grid as every other field
                        // here, same as the user's own "as simple as the other
                        // fields" request.
                        React.createElement(
                          Field,
                          { label: tr("Require approval") },
                          React.createElement(
                            Checkbox,
                            {
                              checked: form.isRequiredApproval,
                              onChange: toggleApproval,
                            },
                            tr("Require approval before execution"),
                          ),
                        ),
                        form.isRequiredApproval &&
                          React.createElement(
                            Field,
                            { label: tr("Approver") },
                            React.createElement(SearchSelect, {
                              options: lawyerOptions,
                              value: form.approvedById,
                              onChange: (v) =>
                                setForm((p) => ({ ...p, approvedById: v })),
                              placeholder: tr("Search and select approver"),
                            }),
                          ),
                      ),
                    ),

                    // Everything from here down is always rendered (not hidden
                    // behind a placeholder) but disabled — visually dimmed and
                    // non-interactive — until Internal company (above) is set.
                    // handleSubmit's own validate() already blocks submission
                    // without it regardless; this is purely so a lawyer sees
                    // the full shape of the form right away instead of a single
                    // field followed by a dashed placeholder box.
                    React.createElement(
                      "div",
                      {
                        style: {
                          opacity: form.internalCompanyId ? 1 : 0.5,
                          pointerEvents: form.internalCompanyId ? "auto" : "none",
                          transition: "opacity 0.15s",
                        },
                        "aria-disabled": !form.internalCompanyId,
                      },
                      !form.internalCompanyId &&
                        React.createElement(
                          "div",
                          {
                            style: {
                              marginBottom: 18,
                              padding: "10px 14px",
                              color: C.sub,
                              background: C.bgSoft,
                              border: `1px dashed ${C.border}`,
                              borderRadius: 8,
                              fontSize: 13,
                            },
                          },
                          tr("Select the Internal company above to continue."),
                        ),

                    React.createElement(
                      Section,
                      { title: tr("Related") },
                      React.createElement(
                        "div",
                        { style: gridStyle },
                        React.createElement(
                          Field,
                          { label: tr("Customer"), required: true },
                          React.createElement(SearchSelect, {
                            value: form.customerId,
                            onChange: handleCustomerChange,
                            options: customerOptions,
                            placeholder: tr("Select customer"),
                            addNewLabel: tr("Add new customer"),
                            onAddNew: () =>
                              openCreatePopup(
                                "customerCreate",
                                refreshCustomers,
                                {
                                  internalCompanyId: form.internalCompanyId,
                                  lawyerId: form.lawyerId,
                                },
                                {
                                  beforeIds: customers.map((customer) => customer.id),
                                  onCreated: (id, record) => {
                                    if (record)
                                      setCustomers((prev) =>
                                        mergeRecordById(prev, record),
                                      );
                                    handleCustomerChange(id);
                                  },
                                },
                              ),
                          }),
                        ),
                        React.createElement(
                          Field,
                          { label: tr("Lawyer") },
                          React.createElement(SearchSelect, {
                            value: form.lawyerId,
                            onChange: (v) => setF("lawyerId", v),
                            options: lawyerOptions,
                            placeholder: tr("Select lawyer"),
                          }),
                        ),
                        React.createElement(
                          Field,
                          { label: tr("Template") },
                          React.createElement(SearchSelect, {
                            value: form.templateId,
                            onChange: (v) => setF("templateId", v),
                            options: templateOptions,
                            placeholder: tr("Select template"),
                            addNewLabel: tr("Add new template"),
                            onAddNew: () =>
                              openCreatePopup(
                                "templateCreate",
                                refreshTemplates,
                                { internalCompanyId: form.internalCompanyId },
                                {
                                  beforeIds: templates.map((template) => template.id),
                                  onCreated: (id, record) => {
                                    if (record)
                                      setTemplates((prev) =>
                                        mergeRecordById(prev, record),
                                      );
                                    setF("templateId", id);
                                  },
                                },
                              ),
                          }),
                        ),
                        React.createElement(
                          Field,
                          { label: tr("Quotation") },
                          React.createElement(SearchSelect, {
                            value: form.quotationId,
                            onChange: (v) => {
                              if (v) {
                                applyQuotationToForm(v);
                              } else {
                                setForm((prev) => ({
                                  ...prev,
                                  quotationId: "",
                                }));
                              }
                            },
                            options: quotationOptions,
                            placeholder: form.customerId
                              ? tr("Search customer quotation")
                              : tr("Search quotation"),
                            addNewLabel: tr("Add new quotation"),
                            onAddNew: () =>
                              openCreatePopup(
                                "quotationCreate",
                                refreshQuotations,
                                {
                                  customerId: form.customerId,
                                  internalCompanyId: form.internalCompanyId,
                                  lawyerId: form.lawyerId,
                                  projectId: form.projectId,
                                  caseId: form.projectId,
                                },
                                {
                                  beforeIds: quotations.map(
                                    (quotation) => quotation.id,
                                  ),
                                  onCreated: (id, record) => {
                                    if (record)
                                      setQuotations((prev) =>
                                        mergeRecordById(prev, record),
                                      );
                                    applyQuotationToForm(id, record);
                                  },
                                },
                              ),
                          }),
                        ),
                        React.createElement(
                          Field,
                          { label: tr("Case") },
                          React.createElement(SearchSelect, {
                            value: form.projectId,
                            onChange: handleProjectChange,
                            options: projectOptions,
                            placeholder: tr("No case"),
                          }),
                        ),
                      ),
                    ),

                    React.createElement(ManualContractServicesSection, {
                      // Services pre-loaded from an existing Case/Quotation and
                      // services added fresh in this session now coexist — a
                      // manually-added row is tagged _isManualAddition so the
                      // dispatchers below (and the per-row read-only check) can
                      // tell the two apart without needing a table-wide either/or.
                      // mergedServiceRows also splices persisted-combo additions
                      // into their section instead of trailing at the bottom.
                      rows: mergedServiceRows,
                      services: filteredServiceOptions,
                      pricingMode: form.pricingMode,
                      packageVatRate: form.packageVatRate,
                      packageTotals,
                      currencies: currencies,
                      currencyOptions: currencyOptions,
                      selectedCurrency: selectedCurrency,
                      readOnlyServices: !!serviceLines.length,
                      showAddRow: true,
                      allowDelete: true,
                      onPricingModeChange: handleManualPricingModeChange,
                      onPackageSubTotalChange: redistributeComboSubtotal,
                      onPackageVatRateChange: (value) =>
                        syncPackageTotals(form.subTotal || form.fixedAmount, value),
                      combos,
                      onApplyCombo: applyCombo,
                      onApplyAdhocCombo: applyAdhocCombo,
                      appliedCombos,
                      onRemoveCombo: removeAppliedCombo,
                      onUpdateComboAmount: updateComboAmount,
                      onAddServiceToCombo: onAddServiceToCombo,
                      onAddFromService: addRowFromService,
                      onDeleteRow: dispatchDeleteServiceRow,
                      onUpdateRow: dispatchUpdateServiceRow,
                      onSelectService: selectManualService,
                      onCreateManualService: createManualContractServiceDraft,
                      onCurrencyChange: (value) => setF("currencyId", value || null),
                      onConvertedTotalsChange: applyConvertedServiceTotals,
                      // blank: pickExchangeRate falls back to today's Vietnam date
                      pricingDate: form.signedDate || "",
                    }),

                    // Single "Commercial Terms" section (2026-09-22, §6r) —
                    // absorbs the old separate "Contract Date" and "Retainer
                    // schedule" Sections entirely (removed). "First payment"
                    // and "End date" are shared, single Fields covering both
                    // By Case and Retainer (both read/write the exact same
                    // form.paymentDate/form.endDate either way — verified
                    // setRetainerField and setF/handlePaymentDateChange are
                    // equivalent for these 2 keys, so 2 near-duplicate Fields
                    // in 2 different Sections weren't actually needed).
                    React.createElement(
                      Section,
                      { title: tr("Commercial Terms") },
                      React.createElement(
                        "div",
                        { style: gridStyle },
                        React.createElement(
                          Field,
                          { label: tr("Signed date") },
                          React.createElement(TextInput, {
                            type: "date",
                            value: form.signedDate,
                            onChange: (v) => setF("signedDate", v),
                          }),
                        ),
                        isByCase &&
                          React.createElement(
                            Field,
                            { label: tr("Billing cycle") },
                            React.createElement(SelectInput, {
                              value: form.billingCycle,
                              onChange: (v) => setF("billingCycle", v),
                              options: BILLING_CYCLES,
                            }),
                          ),
                        showFirstPaymentDate &&
                          React.createElement(
                            Field,
                            { label: tr("First payment") },
                            React.createElement(TextInput, {
                              type: "date",
                              value: form.paymentDate,
                              onChange: handlePaymentDateChange,
                            }),
                          ),
                        React.createElement(
                          Field,
                          { label: tr("End date") },
                          React.createElement(TextInput, {
                            type: "date",
                            value: form.endDate,
                            onChange: (v) => setF("endDate", v),
                          }),
                        ),
                        // Fee model + its Fixed amount/Hourly rate/Estimated
                        // hours/Success fee sub-fields removed (2026-09-22) —
                        // replaced by this one always-visible, directly-
                        // editable field for all 3 contract types. Auto-filled
                        // from the selected services' sum by syncManualLineTotals
                        // whenever services change, but freely overridable by
                        // hand — a manual edit here is what actually wins in
                        // the submitted contract (see resolvedTotalAmount in
                        // the submit handler), matching how this was actually
                        // being used in practice.
                        // Retainer: the billing charges this amount EVERY
                        // period (2026-09-30 — no longer split over a fixed
                        // number of periods; retainer_cycle_amount), so it's
                        // labelled as a per-period amount, not a contract total.
                        React.createElement(
                          Field,
                          isRetainer
                            ? {
                                label: tr("Amount per period"),
                                required: true,
                                tooltip: String(form.retainerDuration || "").trim()
                                  ? tr("Billed every period; the contract is worth this amount × Retainer duration.")
                                  : tr("Open-ended retainer (Retainer duration blank): this amount is billed EVERY period until the next period passes End date (for ever without an End date)."),
                              }
                            : totalFromLines
                              ? {
                                  label: tr("Total amount"),
                                  required: true,
                                  tooltip: tr("= the sum of the services (VND). Change a service price to change the contract total."),
                                }
                              : { label: tr("Total amount"), required: true },
                          React.createElement(MoneyInput, {
                            value: form.totalAmount,
                            onChange: (v) => setF("totalAmount", v),
                            currency: selectedCurrency,
                            disabled: totalFromLines,
                          }),
                        ),
                        // Retainer-only scheduling fields — moved in from the
                        // now-removed RetainerScheduleSection component.
                        isRetainer &&
                          React.createElement(
                            Field,
                            {
                              label: tr("Retainer duration"),
                              hint: tr("Leave blank to bill the amount every cycle until End date"),
                            },
                            React.createElement(SuffixInput, {
                              value: form.retainerDuration,
                              onChange: (v) =>
                                setRetainerField("retainerDuration", moneyRaw(v)),
                              placeholder: tr("Number of billing cycles"),
                              suffix: retainerDurationSuffix(
                                form.retainerRepeatUnit,
                                form.retainerDuration,
                              ),
                            }),
                          ),
                        isRetainer &&
                          React.createElement(
                            Field,
                            { label: tr("Retainer repeat") },
                            React.createElement(SelectInput, {
                              value: form.retainerRepeatUnit,
                              onChange: (v) => setRetainerField("retainerRepeatUnit", v),
                              options: RETAINER_REPEAT_ANCHORS,
                            }),
                          ),
                        isRetainer &&
                          React.createElement(
                            Field,
                            { label: tr("Next payment") },
                            React.createElement(
                              "div",
                              {
                                style: {
                                  ...inputStyle,
                                  minHeight: 40,
                                  display: "flex",
                                  alignItems: "center",
                                  background: C.bgSoft,
                                  color: nextPaymentDate ? C.text : C.sub,
                                  fontWeight: nextPaymentDate ? 700 : 400,
                                },
                              },
                              nextPaymentDate
                                ? formatDateDisplay(nextPaymentDate)
                                : tr("Auto calculated after first payment and duration"),
                            ),
                          ),
                      ),
                    ),

                    // Order revised (2026-09-24): Related → Services → Commercial
                    // Terms → Payment Schedule. Payment Schedule has no Section
                    // header of its own, so it now flows directly under
                    // Commercial Terms — the Total amount / First payment it
                    // splits into installments sit right above it.
                    showPaymentSchedule &&
                      React.createElement(PaymentScheduleSection, {
                        rows: paymentScheduleRows,
                        baseAmount: paymentBaseAmount,
                        currency: selectedCurrency,
                        serviceOptions: paymentScheduleServiceOptions,
                        onAddRow: addPaymentScheduleRow,
                        onDeleteRow: deletePaymentScheduleRow,
                        onUpdateRow: updatePaymentScheduleRow,
                      }),

                    showPaymentSchedule &&
                      React.createElement(PaymentTriggersSection, {
                        noun: "installment",
                        helpText: tr("An installment is activated when ALL its ticked tasks are Done."),
                        sourceLabel: triggerSourceLabel(triggerProjectId, triggerCaseName),
                        loading: triggerLoading,
                        error: triggerError,
                        items: installmentSectionItems,
                        selection: installmentSelection,
                        onToggle: toggleInstallmentTrigger,
                        lockedBy: installmentLockedBy,
                      }),

                    // By Case One time: the single payment's trigger tasks.
                    showOneTimeTriggers &&
                      React.createElement(PaymentTriggersSection, {
                        noun: "payment",
                        helpText:
                          tr("The payment is activated when ALL its ticked tasks are Done. Tick none to activate it when the Case is Done."),
                        sourceLabel: triggerSourceLabel(triggerProjectId, triggerCaseName),
                        loading: triggerLoading,
                        error: triggerError,
                        items: installmentSectionItems,
                        selection: installmentSelection,
                        onToggle: toggleInstallmentTrigger,
                        lockedBy: installmentLockedBy,
                      }),

                    // By Service + Combo pricing: one item per combo /
                    // standalone service, each with its Payment Request
                    // amount and trigger tasks (spec 2026-09-25).
                    comboBillingActive &&
                      React.createElement(PaymentTriggersSection, {
                        noun: "item",
                        helpText:
                          tr("Each item's Payment Request is created on submit and activated when ALL its ticked tasks are Done. Items whose amount you don't edit share the rest of the Total amount automatically."),
                        sourceLabel: triggerSourceLabel(triggerProjectId, triggerCaseName),
                        loading: triggerLoading,
                        error: triggerError,
                        items: installmentSectionItems,
                        selection: installmentSelection,
                        onToggle: toggleInstallmentTrigger,
                        lockedBy: installmentLockedBy,
                        amounts: packageAmounts,
                        amountEditable: true,
                        onAmountChange: changeAllocationAmount,
                        allocation: packageAllocationStatus,
                        onAutoDistribute: autoDistributeAllocation,
                        amountWarnings: packageAllocationWarnings,
                        formatAmount: (value) => formatMoneyByCurrency(value, selectedCurrency),
                        rawAmounts: allocationOverrides,
                      }),

                    isByService &&
                      !comboBillingActive &&
                      React.createElement(PaymentTriggersSection, {
                        sourceLabel: triggerSourceLabel(triggerProjectId, triggerCaseName),
                        loading: triggerLoading,
                        error: triggerError,
                        lines: triggerLines,
                        tasksByLine: triggerTasksByLine,
                        selection: triggerSelection,
                        onToggle: toggleTrigger,
                        ...(lineAmountPreview
                          ? {
                              amounts: lineAmountPreview.amounts,
                              amountTexts: lineAmountPreview.texts,
                              amountEditable: false,
                            }
                          : {}),
                      }),

                    React.createElement(
                      "div",
                      {
                        style: {
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 10,
                          marginTop: 20,
                          paddingTop: 16,
                          borderTop: `1px solid ${C.border}`,
                        },
                      },
                      AntButton
                        ? React.createElement(
                            AntButton,
                            {
                              type: "primary",
                              loading: saving,
                              onClick: handleSubmit,
                            },
                            tr("Submit"),
                          )
                        : React.createElement(
                            "button",
                            {
                              type: "button",
                              disabled: saving,
                              onClick: handleSubmit,
                              style: {
                                border: "none",
                                borderRadius: 6,
                                background: saving ? "#9ca3af" : C.primary,
                                color: "#ffffff",
                                padding: "9px 16px",
                                fontSize: 13,
                                fontWeight: 700,
                                fontFamily: FONT,
                                cursor: saving ? "default" : "pointer",
                                minWidth: 128,
                              },
                            },
                            saving ? tr("Saving...") : tr("Submit"),
                          ),
                    ),
                  ),
            ),
          ),
          React.createElement(
            Modal,
            {
              title: tr("Contract guide"),
              open: guideOpen,
              onCancel: () => setGuideOpen(false),
              footer: null,
              width: 980,
              destroyOnClose: false,
            },
            React.createElement(TutorialPanel, { contractType: form.contractType }),
          ),
        );
      };

      ctx.render(React.createElement(ContractCreateForm));
