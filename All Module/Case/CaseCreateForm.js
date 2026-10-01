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
  "≈ {0} VND": "≈ {0} VND",
  "Could not find an exchange rate to convert the combo's currency to VND — keeping the original amount, please double-check.": "Không tìm thấy tỷ giá để quy đổi tiền tệ của combo sang VND — giữ nguyên số tiền gốc, vui lòng kiểm tra lại.",
  "Discard changes?": "Bỏ các thay đổi?",
  "Your unsaved input will be lost.": "Dữ liệu chưa lưu sẽ bị mất.",
  "Discard": "Bỏ",
  "Continue editing": "Tiếp tục chỉnh sửa",
  "Please configure POPUP_VIEW_UIDS.{0} first.": "Vui lòng cấu hình POPUP_VIEW_UIDS.{0} trước.",
  "ctx.openView is not available in this runtime.": "ctx.openView không khả dụng trong môi trường này.",
  "Cannot open configured popup view.": "Không thể mở popup đã cấu hình.",
  "Low": "Thấp",
  "Medium": "Trung bình",
  "High": "Cao",
  "Partner": "Luật sư đối tác",
  "Lawyer": "Luật sư",
  "Associate": "Luật sư cộng sự",
  "Suppliant": "Trợ lý pháp lý",
  "Not set": "Chưa đặt",
  "Select date & time": "Chọn ngày & giờ",
  "January": "Tháng 1",
  "February": "Tháng 2",
  "March": "Tháng 3",
  "April": "Tháng 4",
  "May": "Tháng 5",
  "June": "Tháng 6",
  "July": "Tháng 7",
  "August": "Tháng 8",
  "September": "Tháng 9",
  "October": "Tháng 10",
  "November": "Tháng 11",
  "December": "Tháng 12",
  "Su": "CN",
  "Mo": "T2",
  "Tu": "T3",
  "We": "T4",
  "Th": "T5",
  "Fr": "T6",
  "Sa": "T7",
  "Date": "Ngày",
  "Time": "Thời gian",
  "⚡ Now": "⚡ Bây giờ",
  "→ Pick Time": "→ Chọn giờ",
  "← Change date": "← Đổi ngày",
  "⚠ Please select a date first": "⚠ Vui lòng chọn ngày trước",
  "Hour : Minute": "Giờ : Phút",
  "Hour": "Giờ",
  "Minute": "Phút",
  "✕ Clear": "✕ Xóa",
  "Close": "Đóng",
  "Confirm": "Xác nhận",
  "Clear": "Bỏ chọn",
  " ▲ Collapse": " ▲ Thu gọn",
  " ▼ Show more": " ▼ Xem thêm",
  "Currency": "Tiền tệ",
  "Add new": "Thêm mới",
  "Search...": "Tìm kiếm...",
  "No results found": "Không tìm thấy kết quả",
  "{0} results": "{0} kết quả",
  "Deselect": "Bỏ chọn",
  "Other": "Khác",
  "{0} people": "{0} người",
  "Deselect group": "Bỏ chọn nhóm",
  "+ Select group": "+ Chọn nhóm",
  "Search by name, lawyer type...": "Tìm theo tên, loại luật sư...",
  "{0} selected · {1} total": "Đã chọn {0} · tổng {1}",
  "Deselect all": "Bỏ chọn tất cả",
  "Untitled task": "Công việc chưa đặt tên",
  "Custom task": "Công việc tự tạo",
  "No sample tasks configured": "Chưa cấu hình công việc mẫu",
  "+{0} more tasks": "+{0} công việc khác",
  "Could not add task template": "Không thể thêm công việc mẫu",
  "Could not save task template": "Không thể lưu công việc mẫu",
  "Remove this task template?": "Gỡ công việc mẫu này?",
  "\"{0}\" will be removed from this service's shared task list — this also affects other cases that use this service.": "\"{0}\" sẽ bị gỡ khỏi danh sách công việc chung của dịch vụ — ảnh hưởng cả các hồ sơ khác dùng dịch vụ này.",
  "Remove": "Gỡ",
  "Cancel": "Hủy",
  "Could not remove task template": "Không thể gỡ công việc mẫu",
  "Please enter a combo name": "Vui lòng nhập tên combo",
  "Please select a currency": "Vui lòng chọn tiền tệ",
  "Please add at least 1 service to the combo": "Vui lòng thêm ít nhất 1 dịch vụ vào combo",
  "One or more services are missing a name": "Một hoặc nhiều dịch vụ chưa có tên",
  "Duplicate service name in combo": "Trùng tên dịch vụ trong combo",
  "Please enter a service name": "Vui lòng nhập tên dịch vụ",
  "Sample tasks for custom service": "Công việc mẫu cho dịch vụ tự tạo",
  "Use this for non-standard services that do not have predefined task templates.": "Dùng cho dịch vụ không chuẩn chưa có công việc mẫu định sẵn.",
  "+ Add task": "+ Thêm công việc",
  "No custom sample tasks yet.": "Chưa có công việc mẫu tự tạo.",
  "Task name": "Tên công việc",
  "Task template name": "Tên công việc mẫu",
  "Description": "Mô tả",
  "Task description or expected output...": "Mô tả công việc hoặc kết quả mong đợi...",
  "Remove task": "Gỡ công việc",
  "Task templates": "Công việc mẫu",
  "Editing here updates this service's shared task list — changes apply to every case, not just this combo.": "Chỉnh sửa ở đây cập nhật danh sách công việc chung của dịch vụ — áp dụng cho mọi hồ sơ, không chỉ combo này.",
  "No tasks yet for this service.": "Dịch vụ này chưa có công việc.",
  "Sample tasks": "Công việc mẫu",
  "These tasks will be created for this service, and copied into the catalog too since \"Also save this combo to the shared catalog\" is checked below.": "Các công việc này sẽ được tạo cho dịch vụ, và được sao chép vào danh mục vì đã chọn \"Lưu combo này vào danh mục chung\" bên dưới.",
  "These tasks will be created for this service on this case only.": "Các công việc này chỉ được tạo cho dịch vụ trong hồ sơ này.",
  "New service name...": "Tên dịch vụ mới...",
  "Already in the standardized catalog": "Đã có trong danh mục chuẩn",
  "Type (optional)...": "Loại (không bắt buộc)...",
  "Description (optional)...": "Mô tả (không bắt buộc)...",
  "Hide": "Ẩn",
  "Manage": "Quản lý",
  "Service name": "Tên dịch vụ",
  "Type": "Loại",
  "Unit Price": "Đơn giá",
  "Tasks": "Công việc",
  "Search combo...": "Tìm combo...",
  "+ New combo": "+ Combo mới",
  "Combo": "Combo",
  "Combo Price": "Giá combo",
  "Services": "Dịch vụ",
  "No combos yet": "Chưa có combo",
  "New combo": "Combo mới",
  "Combo #{0}": "Combo #{0}",
  "VAT {0}%": "VAT {0}%",
  "Save {0} ({1}%)": "Tiết kiệm {0} ({1}%)",
  "Select": "Chọn",
  "Please select an Internal Company in the main form before creating a service": "Vui lòng chọn Công ty nội bộ ở biểu mẫu chính trước khi tạo dịch vụ",
  "Combo Name": "Tên combo",
  "E.g. Business incorporation consulting combo...": "VD: Combo tư vấn thành lập doanh nghiệp...",
  "Combo Type": "Loại combo",
  "E.g. Business, Education...": "VD: Doanh nghiệp, Giáo dục...",
  "Combo Subtotal": "Tạm tính combo",
  "No currencies configured": "Chưa cấu hình tiền tệ",
  "Select currency": "Chọn tiền tệ",
  "Individual price: {0}": "Giá lẻ: {0}",
  "Discount {0}": "Giảm {0}",
  "Increase {0}": "Tăng {0}",
  "VAT %": "VAT %",
  "Services in combo ({0})": "Dịch vụ trong combo ({0})",
  "+ Add existing service...": "+ Thêm dịch vụ có sẵn...",
  "Service #{0}": "Dịch vụ #{0}",
  "+ New service": "+ Dịch vụ mới",
  "No services yet — add one from the list or create a new one.": "Chưa có dịch vụ — thêm từ danh sách hoặc tạo mới.",
  "Also save this combo to the shared catalog (created only if you finish creating this case). All custom services in it are saved too — services already in the catalog are simply reused.": "Lưu combo này vào danh mục chung (chỉ tạo khi bạn hoàn tất tạo hồ sơ). Các dịch vụ tự tạo trong combo cũng được lưu — dịch vụ đã có trong danh mục sẽ được dùng lại.",
  "Back": "Quay lại",
  "Applying...": "Đang áp dụng...",
  "Submit": "Gửi",
  "New Combo": "Combo mới",
  "Select Combo": "Chọn combo",
  "Create New Service": "Tạo dịch vụ mới",
  "Select Service": "Chọn dịch vụ",
  "Line pricing": "Giá theo dòng",
  "Combo pricing": "Giá combo",
  "Add to combo:": "Thêm vào combo:",
  "Combo pricing keeps every service inside a combo.": "Giá combo giữ mọi dịch vụ trong một combo.",
  "Select from list": "Chọn từ danh sách",
  "Create new service": "Tạo dịch vụ mới",
  "Search service, type, currency...": "Tìm dịch vụ, loại, tiền tệ...",
  "Service": "Dịch vụ",
  "Task Templates": "Công việc mẫu",
  "No services found": "Không tìm thấy dịch vụ",
  "Company service currency": "Tiền tệ dịch vụ của công ty",
  "Service default currency": "Tiền tệ mặc định của dịch vụ",
  "Case currency": "Tiền tệ hồ sơ",
  "No currency": "Không có tiền tệ",
  "No sample tasks": "Không có công việc mẫu",
  "Service Name": "Tên dịch vụ",
  "E.g. Employment contract consultation...": "VD: Tư vấn hợp đồng lao động...",
  "Service Type": "Loại dịch vụ",
  "E.g. Consultation, Legal...": "VD: Tư vấn, Pháp lý...",
  "Scope of work, notes...": "Phạm vi công việc, ghi chú...",
  "This name already exists in the standardized catalog — pick it from the list instead of creating a duplicate.": "Tên này đã có trong danh mục chuẩn — hãy chọn từ danh sách thay vì tạo trùng.",
  "Also save to the shared catalog (created only if you finish creating this case).": "Lưu vào danh mục chung (chỉ tạo khi bạn hoàn tất tạo hồ sơ).",
  "Creating...": "Đang tạo...",
  "Save & Select": "Lưu & Chọn",
  "Included in combo": "Đã gồm trong combo",
  "Bill separately": "Thu riêng",
  "Scope only": "Chỉ phạm vi",
  "Line billable": "Tính tiền theo dòng",
  "Linked line": "Dòng liên kết",
  "COMBO": "COMBO",
  "Add service to this combo": "Thêm dịch vụ vào combo này",
  "+ Add service": "+ Thêm dịch vụ",
  "Remove this combo": "Gỡ combo này",
  "× Remove combo": "× Gỡ combo",
  "No sample tasks. Add a task if this service needs work items.": "Không có công việc mẫu. Thêm công việc nếu dịch vụ cần đầu việc.",
  "Task description...": "Mô tả công việc...",
  "Sample tasks — {0}": "Công việc mẫu — {0}",
  "Custom service": "Dịch vụ tự tạo",
  "View currency breakdown ({0} currencies)": "Xem chi tiết tiền tệ ({0} loại tiền)",
  "Totals": "Tổng cộng",
  "{0} {1} used": "đã dùng {0} {1}",
  "+{0} more currencies": "+{0} loại tiền khác",
  "Checking exchange rates...": "Đang kiểm tra tỷ giá...",
  "Converted total in {0}": "Tổng quy đổi theo {0}",
  "Missing rates: {0}{1}": "Thiếu tỷ giá: {0}{1}",
  " +{0} more": " +{0} khác",
  "Conversion not available": "Không quy đổi được",
  "Combo subtotal:": "Tạm tính combo:",
  "VAT (%):": "VAT (%):",
  "VAT amount:": "Tiền VAT:",
  "Combo total:": "Tổng combo:",
  "Subtotal (excl. VAT)": "Tạm tính (chưa VAT)",
  "VAT amount": "Tiền VAT",
  "Total": "Tổng",
  "Currency breakdown": "Chi tiết tiền tệ",
  "Base currency: {0}. Only currencies used in this case are listed here.": "Tiền tệ gốc: {0}. Chỉ liệt kê các loại tiền dùng trong hồ sơ này.",
  "Original total": "Tổng gốc",
  "Rate to {0}": "Tỷ giá sang {0}",
  "Converted total": "Tổng quy đổi",
  "Effective date": "Ngày hiệu lực",
  "Source": "Nguồn",
  "Base currency": "Tiền tệ gốc",
  "Manual": "Thủ công",
  "Missing": "Thiếu",
  "No rate": "Chưa có tỷ giá",
  "Please select an Internal Company first": "Vui lòng chọn Công ty nội bộ trước",
  "Service List": "Danh sách dịch vụ",
  "{0} services": "{0} dịch vụ",
  "{0} from quotation": "{0} từ báo giá",
  "{0} from contract": "{0} từ hợp đồng",
  "{0} included in combo": "{0} trong combo",
  "New service": "Dịch vụ mới",
  "Pricing Mode": "Cách tính giá",
  "Service Name & Type": "Tên & loại dịch vụ",
  "VAT (%)": "VAT (%)",
  "No services yet - click \"New service\"": "Chưa có dịch vụ - bấm \"Dịch vụ mới\"",
  "From quotation": "Từ báo giá",
  "Service name...": "Tên dịch vụ...",
  "Service type...": "Loại dịch vụ...",
  "{0} sample tasks": "{0} công việc mẫu",
  "Enter description...": "Nhập mô tả...",
  "No description": "Không có mô tả",
  "Snapshot currency edited": "Tiền tệ đã chụp bị sửa",
  "Edited currency": "Tiền tệ đã sửa",
  "Original: {0}": "Gốc: {0}",
  "Missing rate to {0}": "Thiếu tỷ giá sang {0}",
  "Done editing": "Xong chỉnh sửa",
  "Edit service": "Sửa dịch vụ",
  "View task": "Xem công việc",
  "Delete service": "Xóa dịch vụ",
  "Cannot close this popup from the current runtime.": "Không thể đóng popup này từ môi trường hiện tại.",
  "Could not load case form data.": "Không thể tải dữ liệu biểu mẫu hồ sơ.",
  "Loaded {0} services from quotation": "Đã tải {0} dịch vụ từ báo giá",
  "This quotation has no services yet": "Báo giá này chưa có dịch vụ",
  "Could not load services from quotation": "Không thể tải dịch vụ từ báo giá",
  "Loaded {0} services from contract": "Đã tải {0} dịch vụ từ hợp đồng",
  "This contract has no services yet": "Hợp đồng này chưa có dịch vụ",
  "Could not load services from contract": "Không thể tải dịch vụ từ hợp đồng",
  "Auto-selected {0} and loaded {1} services from contract": "Đã tự chọn {0} và tải {1} dịch vụ từ hợp đồng",
  "Auto-selected {0} for this customer": "Đã tự chọn {0} cho khách hàng này",
  "Auto-selected quotation and loaded {0} services from quotation": "Đã tự chọn báo giá và tải {0} dịch vụ từ báo giá",
  "Auto-selected quotation for this customer": "Đã tự chọn báo giá cho khách hàng này",
  "This service is already added in the case.": "Dịch vụ này đã có trong hồ sơ.",
  "Service row added. It will be saved to project services on submit.": "Đã thêm dòng dịch vụ. Dịch vụ sẽ được lưu vào hồ sơ khi gửi.",
  "This combo has no services yet.": "Combo này chưa có dịch vụ.",
  "Skipped {0} service(s) already on this case: {1}": "Bỏ qua {0} dịch vụ đã có trong hồ sơ: {1}",
  "Merged {0} standalone service(s) into combo \"{1}\": {2}": "Đã gộp {0} dịch vụ lẻ vào combo \"{1}\": {2}",
  "Applied combo \"{0}\".": "Đã áp dụng combo \"{0}\".",
  "Also removed {0} service(s) merged into this combo: {1}": "Đồng thời gỡ {0} dịch vụ đã gộp vào combo này: {1}",
  "Please select an Internal Company": "Vui lòng chọn Công ty nội bộ",
  "Please select a Customer": "Vui lòng chọn Khách hàng",
  "Please enter a Case name": "Vui lòng nhập tên Hồ sơ",
  "Please select an open date": "Vui lòng chọn ngày mở",
  "Please select a Case Currency": "Vui lòng chọn tiền tệ Hồ sơ",
  "Please add at least one service before creating the case.": "Vui lòng thêm ít nhất một dịch vụ trước khi tạo hồ sơ.",
  "Checking quotation exchange rates...": "Đang kiểm tra tỷ giá báo giá...",
  "Missing exchange rate for quotation total: {0}": "Thiếu tỷ giá cho tổng báo giá: {0}",
  "Checking contract exchange rates...": "Đang kiểm tra tỷ giá hợp đồng...",
  "Missing exchange rate for contract total: {0}": "Thiếu tỷ giá cho tổng hợp đồng: {0}",
  "Could not save the case currency — check it after the case is created.": "Không thể lưu tiền tệ hồ sơ — hãy kiểm tra sau khi tạo hồ sơ.",
  "Creating Case...": "Đang tạo hồ sơ...",
  "Could not retrieve projectId after creation": "Không lấy được projectId sau khi tạo",
  "Could not save the currency of service \"{0}\" — check it after the case is created.": "Không thể lưu tiền tệ của dịch vụ \"{0}\" — hãy kiểm tra sau khi tạo hồ sơ.",
  "Could not {0} the contract line.": "Không thể lưu dòng dịch vụ của hợp đồng.",
  "Creating tasks for {0}...": "Đang tạo công việc cho {0}...",
  "custom service": "dịch vụ tự tạo",
  "Could not link {0} task(s) to their payment installment — link them in Task Management.": "Không thể liên kết {0} công việc với đợt thanh toán — hãy liên kết trong Task Management.",
  "Could not link the contract's installment trigger tasks — link them in Task Management.": "Không thể liên kết công việc kích hoạt các đợt của hợp đồng — hãy liên kết trong Task Management.",
  "Syncing quotation services...": "Đang đồng bộ dịch vụ báo giá...",
  "Could not save the quotation line.": "Không thể lưu dòng dịch vụ của báo giá.",
  "Saving service {0}/{1}...": "Đang lưu dịch vụ {0}/{1}...",
  "Could not link the contract line to the case.": "Không thể liên kết dòng dịch vụ của hợp đồng với hồ sơ.",
  "Syncing contract service {0}/{1}...": "Đang đồng bộ dịch vụ hợp đồng {0}/{1}...",
  "Updating case total...": "Đang cập nhật tổng hồ sơ...",
  "Creating folder structure...": "Đang tạo cấu trúc thư mục...",
  "Assigning folder permissions...": "Đang phân quyền thư mục...",
  "Linking installment trigger tasks...": "Đang liên kết công việc kích hoạt các đợt...",
  "Case created successfully!": "Đã tạo hồ sơ!",
  "Saving to catalog...": "Đang lưu vào danh mục...",
  "{0} service{1} added to the catalog.": "Đã thêm {0} dịch vụ vào danh mục.",
  "Combo \"{0}\" was not saved to the catalog — its services could not be linked (a name may already be in use, or saving one of them failed).": "Combo \"{0}\" chưa được lưu vào danh mục — không liên kết được các dịch vụ (có thể tên đã được dùng, hoặc lưu một dịch vụ bị lỗi).",
  "Combo \"{0}\" saved to the catalog — {1} custom service(s) without a catalog link were left out.": "Đã lưu combo \"{0}\" vào danh mục — bỏ qua {1} dịch vụ tự tạo chưa liên kết danh mục.",
  "Combo \"{0}\" saved to the catalog.": "Đã lưu combo \"{0}\" vào danh mục.",
  "Could not save combo \"{0}\" to the catalog.": "Không thể lưu combo \"{0}\" vào danh mục.",
  "Error: ": "Lỗi: ",
  "Please try again": "Vui lòng thử lại",
  "Referral": "Giới thiệu",
  "Staff": "Nhân viên",
  "Source: {0}": "Nguồn: {0}",
  "Customer #{0}": "Khách hàng #{0}",
  "Contract #{0}": "Hợp đồng #{0}",
  "Quotation #{0}": "Báo giá #{0}",
  "Customer": "Khách hàng",
  "Search or select a customer": "Tìm hoặc chọn khách hàng",
  "Showing {0} contracts and {1} quotations for this customer. ": "Đang hiện {0} hợp đồng và {1} báo giá của khách hàng này. ",
  "Clear selection": "Bỏ chọn",
  "Related Contract": "Hợp đồng liên quan",
  "Select contract": "Chọn hợp đồng",
  "Related Quotation": "Báo giá liên quan",
  "please select internal company": "vui lòng chọn công ty nội bộ",
  "↓ changing will reload services": "↓ thay đổi sẽ tải lại dịch vụ",
  "select to load services into table": "chọn để tải dịch vụ vào bảng",
  "Select quotation": "Chọn báo giá",
  "Case Information": "Thông tin hồ sơ",
  "Internal Company": "Công ty nội bộ",
  "Select company": "Chọn công ty",
  "Company #{0}": "Công ty #{0}",
  "Case Code": "Mã hồ sơ",
  "Auto ({0}): next is {1} — editable": "Tự động ({0}): tiếp theo là {1} — có thể sửa",
  "E.g. CBI-2025-001": "VD: CBI-2025-001",
  "Case Name": "Tên hồ sơ",
  "E.g. Real estate purchase contract consultation...": "VD: Tư vấn hợp đồng mua bán bất động sản...",
  "Open Date & Time": "Ngày & giờ mở",
  "Select open date & time": "Chọn ngày & giờ mở",
  "Deadline": "Hạn",
  "Select deadline date & time": "Chọn ngày & giờ hạn",
  "Priority": "Ưu tiên",
  "Team Members": "Thành viên",
  "Manager": "Quản lý",
  "Select manager": "Chọn người quản lý",
  "— Select manager —": "— Chọn người quản lý —",
  "Members": "Thành viên",
  "optional — multiple": "không bắt buộc — nhiều người",
  "Select lawyers": "Chọn luật sư",
  "— Select lawyers —": "— Chọn luật sư —",
  "Summarize the content, requirements, scope of work...": "Tóm tắt nội dung, yêu cầu, phạm vi công việc...",
  "Loading services...": "Đang tải dịch vụ...",
  "Processing...": "Đang xử lý...",
};
// ---- end ui language ----
const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);

const { React } = ctx;
const { useState, useEffect, useCallback, useMemo, useRef } = React;
const {
  Spin,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Card: AntCard,
  Space,
  Rate,
  Segmented,
} = ctx.antd;

const FONT = "inherit";
const FONT_MONO = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
const REDIRECT_URL = window.location.origin + window.location.pathname;
const PRICING_MODE_LINE = "line";
const PRICING_MODE_PACKAGE = "package";
const PRICING_MODE_SCOPE = "scopeOnly";
const BILLING_LINE = "lineBillable";
const BILLING_PACKAGE_INCLUDED = "packageIncluded";
const BILLING_SEPARATE = "billSeparately";
const BILLING_SCOPE = "scopeOnly";
const SOURCE_QUOTATION = "quotation";
const SOURCE_CONTRACT = "contract";
const SOURCE_MANUAL = "manual";
const SOURCE_NONE = "none";
const CASE_DOCUMENT_SCOPE = "case_document";
// Hidden "Customers" category root folder in the Document Library (see
// Library.js's LIBRARY_CATEGORY_ROOT_FOLDER_ID — duplicated here per this
// repo's no-shared-module constraint). Every new customer's own root
// folder nests under this id so the physical folder tree stays organized
// for external tools (e.g. Google Drive backup sync); the Customer->Case
// gallery itself is unaffected since it never reads parentId.
const CUSTOMERS_ROOT_FOLDER_ID = 381870527283200;
const DEFAULT_CURRENCY_CODE = "VND";
const CURRENCY_RESOURCE_CANDIDATES = ["currencies:list", "currency:list", "Currency:list"];
const PROJECT_TEMPLATE_FIELDS =
  "id,templateFileId,serviceId,templateId,templateName,description,sortOrder,previousTaskId,isPaymentTrigger";

// Configure these popup view UIDs after creating the corresponding NocoBase views.
const POPUP_VIEW_UIDS = {
  customerCreate: "onjascp1npq",
  contractCreate: "41125dcba6c",
  quotationCreate: "v44ehxkcghx",
};

const pad = (n) => String(n).padStart(2, "0");
const parseNum = (v) => {
  const n = parseFloat(String(v ?? "").replace(/[^\d.-]/g, ""));
  return isNaN(n) ? 0 : n;
};
const extractCurrencyId = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return extractCurrencyId(value[0]);
  if (typeof value === "object") return extractCurrencyId(value.id || value.value || value.key);
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
  const match = String(value).trim().toUpperCase().match(/\b[A-Z]{3}\b/);
  return match ? match[0] : "";
};
const getRecordCurrencyId = (record) =>
  extractCurrencyId(
    record?.currencyId ||
      record?.currency ||
      record?.currencies ||
      record?.defaultCurrencyId ||
      record?.defaultCurrency,
  );
const getRecordCurrencyCode = (record) =>
  extractCurrencyCode(
    record?.currencyCode ||
      record?.currency ||
      record?.currencies ||
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
  currency?.locale || (getCurrencyCode(currency) === DEFAULT_CURRENCY_CODE ? "vi-VN" : "en-US");
const defaultCurrencyObject = () => ({
  code: DEFAULT_CURRENCY_CODE,
  symbol: "VND",
  decimalPlaces: 0,
  locale: "vi-VN",
});
const neutralCurrencyObject = () => ({
  code: "",
  decimalPlaces: 2,
  locale: "en-US",
});
const findCurrencyById = (currencies = [], id) => {
  const safeId = extractCurrencyId(id);
  if (!safeId) return null;
  return currencies.find((currency) => extractCurrencyId(currency?.id) === safeId) || null;
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
  return safeCode ? { code: safeCode, currencyCode: safeCode, decimalPlaces: safeCode === DEFAULT_CURRENCY_CODE ? 0 : 2 } : null;
};
const findDefaultCurrency = (currencies = []) =>
  currencies.find((currency) => currency?.isBaseCurrency || getCurrencyCode(currency) === DEFAULT_CURRENCY_CODE) ||
  currencies[0] ||
  defaultCurrencyObject();
const resolveCurrency = (value, currencies = []) => {
  const source = Array.isArray(value) ? value[0] : value;
  return (
    findCurrencyById(currencies, source) ||
    findCurrencyByCode(currencies, source) ||
    (typeof source === "object" && extractCurrencyCode(source) ? source : null) ||
    currencyObjectFromCode(source)
  );
};
const currencyFromRecord = (record, currencies = [], fallback = null) =>
  resolveCurrency(record?.currency || record?.currencies || record?.currencyId, currencies) ||
  resolveCurrency(getRecordCurrencyId(record), currencies) ||
  resolveCurrency(getRecordCurrencyCode(record), currencies) ||
  fallback ||
  defaultCurrencyObject();
const currencyFromRecordOptional = (record, currencies = [], fallback = null) =>
  resolveCurrency(record?.currency || record?.currencies || record?.currencyId, currencies) ||
  resolveCurrency(getRecordCurrencyId(record), currencies) ||
  resolveCurrency(getRecordCurrencyCode(record), currencies) ||
  resolveCurrency(fallback, currencies);
const currencySelectLabel = (currency) => {
  const code = getCurrencyCode(currency);
  return code;
};
const formatMoneyAmount = (value, currency = null) => {
  if (!value && value !== 0) return "-";
  const info = currency || defaultCurrencyObject();
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  const decimals = getCurrencyDecimals(info);
  return n.toLocaleString(getCurrencyLocale(info), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
const formatMoney = (value, currency = null) => {
  if (!value && value !== 0) return "-";
  const info = currency || defaultCurrencyObject();
  return `${formatMoneyAmount(value, info)} ${getCurrencyCode(info)}`;
};
const fmtVND = (n) => formatMoney(n, defaultCurrencyObject());
const formatMoneyDraft = (value, currency = null) => {
  if (value === undefined || value === null || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const info = currency || neutralCurrencyObject();
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: getCurrencyDecimals(info),
  });
};
const parseMoneyDraft = (value, currency = null) => {
  const decimals = getCurrencyDecimals(currency || neutralCurrencyObject());
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  if (decimals <= 0) {
    const whole = raw.replace(/[^\d-]/g, "");
    const n = Number(whole);
    return Number.isFinite(n) ? n : 0;
  }
  const normalized = raw.replace(/,/g, "").replace(/[^\d.-]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};
const parseDateMillis = (value) => {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
};
// exchangeRates real schema (confirmed via Nocobase "Configure fields"):
// fromCurrencyId, toCurrencyId (bigint scalars), rate (double), effectiveDate,
// status. Both directions can have their own row (e.g. USD->VND and VND->USD),
// so match by the (fromCurrencyId, toCurrencyId) pair rather than a single side.
const isUsableExchangeRateStatus = (status) => {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return true;
  return !["inactive", "disabled", "archived", "cancelled", "canceled", "draft"].includes(value);
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
  const fromId = extractCurrencyId(fromCurrency);
  const toId = extractCurrencyId(toCurrency);
  const cutoff = moneyDateKey(pricingDate) || moneyDateKey(Date.now());
  const candidates = (rates || [])
    .map((rate) => ({
      record: rate,
      rate: parseNum(rate?.rate),
      effectiveMs: parseDateMillis(rate?.effectiveDate) || 0,
      day: moneyDateKey(rate?.effectiveDate) || "1900-01-01",
      rateFromId: extractCurrencyId(rate?.fromCurrencyId ?? rate?.fromCurrency),
      rateToId: extractCurrencyId(rate?.toCurrencyId ?? rate?.toCurrency),
    }))
    .filter(
      (item) =>
        item.rate > 0 &&
        isUsableExchangeRateStatus(item.record?.status) &&
        item.rateFromId === fromId &&
        item.rateToId === toId,
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
const isPackagePricing = (recordOrMode) => {
  const mode =
    typeof recordOrMode === "object"
      ? recordOrMode?.pricingMode
      : recordOrMode;
  return String(mode || "").toLowerCase() === PRICING_MODE_PACKAGE;
};
// ---- line amount helpers (pure; tested by scripts/tests/money-rounding.test.js) ----
// 2026-09-29: a line is rounded to its own currency's decimals — whole đồng
// for VND, cents for USD / EUR / SGD. Rounding a foreign line to whole units
// turned 10 USD + 8% VAT into 11 USD (10%) and dropped VAT under 5%.
const roundToDecimals = (value, decimals = 0) => {
  const factor = 10 ** Math.max(0, Math.floor(Number(decimals) || 0));
  const n = parseNum(value);
  return Math.round((n + Math.sign(n) * Number.EPSILON * Math.abs(n)) * factor) / factor;
};
// currency: a currency object (its decimalPlaces) or the number of decimals; none = VND
const lineDecimals = (currency) =>
  typeof currency === "number" ? currency : currency ? getCurrencyDecimals(currency) : 0;
const inferVatRate = (subTotal, vatAmount, fallback = 0) => {
  const sub = parseNum(subTotal);
  return sub ? Math.round((parseNum(vatAmount) * 10000) / sub) / 100 : parseNum(fallback);
};
const calcLineAmounts = (basePrice, vat, currency) => {
  const decimals = lineDecimals(currency);
  const subTotal = roundToDecimals(basePrice, decimals);
  const vatAmount = roundToDecimals((subTotal * parseNum(vat)) / 100, decimals);
  return { subTotal, vatAmount, totalAmount: roundToDecimals(subTotal + vatAmount, decimals) };
};
// ---- end line amount helpers ----
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
// VND of some lines: each line converted and rounded on its own, then summed,
// as the database does (money_line_amounts), so the total shown is the one
// the database stores.
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
// ---- source rate helpers (pure; tested by scripts/tests/create-forms-money.test.js) ----
// A case line linked to a contract / quotation line takes that line's frozen
// rate (money_line_rate in pgsql/money_flow_foundation.sql). Frozen = a
// positive rate with a date, or a rate other than 1 (money_rate_frozen); a
// dateless 1 is a pre-trigger placeholder. null = convert at the Open date.
const frozenSourceRate = (record) => {
  const rate = Number(record?.exchangeRateToBase);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const date = record?.exchangeRateDate ? String(record.exchangeRateDate).slice(0, 10) : null;
  return date || rate !== 1 ? { rate, date } : null;
};
// Only while the row keeps the source line's currency (the database reuses the
// rate only for the same currency).
const rowFrozenRate = (row, extractCurrencyId) =>
  row?._frozenRate &&
  row._frozenRateCurrencyId &&
  String(extractCurrencyId(row.currencyId) || "") === String(row._frozenRateCurrencyId)
    ? row._frozenRate
    : null;
// The rate a row converts at, as the database will: a line-billed row synced to
// the source contract / quotation takes that line's frozen rate while its
// currency is unchanged, else the rate on the source document's date (the
// contract's Signed date, the quotation's creation date); any other row, the
// Case's Open date (date null).
const rowRateBasis = (line, { extractCurrencyId, synced, sourceRateDate }) => {
  if (!synced) return { rate: null, date: null };
  const frozen = rowFrozenRate(line, extractCurrencyId);
  if (frozen) return { rate: frozen.rate, date: frozen.date };
  return { rate: null, date: sourceRateDate || null };
};
// The day the database prices a synced row on (money_line_rate): the source
// contract's Signed date (else its creation), or the source quotation's
// creation — as a Vietnam date (dateKey = moneyDateKey).
const sourceDocumentRateDate = (contract, quotation, dateKey) => {
  if (contract) return dateKey(contract.signedAt || contract.createdAt) || null;
  if (quotation) return dateKey(quotation.createdAt) || null;
  return null;
};
// ---- end source rate helpers ----
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
const isSameCurrency = (left, right) => {
  const leftId = extractCurrencyId(left);
  const rightId = extractCurrencyId(right);
  if (leftId && rightId) return leftId === rightId;
  const leftCode = extractCurrencyCode(left) || getCurrencyCode(left || {});
  const rightCode = extractCurrencyCode(right) || getCurrencyCode(right || {});
  return !!leftCode && !!rightCode && leftCode === rightCode;
};
const getFinancialRowBillingMode = (row, { packageMode, activeFinancialSourceType } = {}) =>
  row?.billingMode ||
  billingModeForContext({
    fromQuotation: !!row?._fromQuotation,
    packageMode: !!packageMode,
    hasFinancialSource: activeFinancialSourceType && activeFinancialSourceType !== SOURCE_NONE,
  });
const buildServiceFinancialSummary = ({
  rows = [],
  currencies = [],
  baseCurrency = null,
  exchangeRates = [],
  pricingDate,
  packageMode = false,
  activeFinancialSourceType = SOURCE_MANUAL,
  includeBillingModes = [BILLING_LINE, BILLING_SEPARATE],
  // the source contract's Signed date / quotation's creation date (rowRateBasis)
  sourceRateDate = null,
} = {}) => {
  const targetCurrency = baseCurrency || findDefaultCurrency(currencies);
  const includeSet = new Set(includeBillingModes);
  const byCurrency = {};
  const lineItems = [];

  (rows || []).forEach((row) => {
    if (!row?.serviceName?.trim() || packageMode) return;
    const billingMode = getFinancialRowBillingMode(row, {
      packageMode,
      activeFinancialSourceType,
    });
    if (!includeSet.has(billingMode)) return;

    const price = Number(row.basePrice) || 0;
    const vatPct = Number(row.vat) || 0;
    const rowCurrency = currencyFromRecord(row, currencies, targetCurrency);
    const amounts = calcLineAmounts(price, vatPct, rowCurrency);
    const basis = rowRateBasis(row, { extractCurrencyId, synced: billingMode === BILLING_LINE, sourceRateDate });
    const key = `${
      extractCurrencyId(row.currencyId) ||
      extractCurrencyId(rowCurrency) ||
      getCurrencyCode(rowCurrency)
    }${basis.rate ? `@${basis.rate}` : basis.date ? `#${basis.date}` : ""}`;

    if (!byCurrency[key]) {
      byCurrency[key] = {
        rateBasis: basis,
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
    lineItems.push({
      row,
      billingMode,
      currency: rowCurrency,
      ...amounts,
    });
  });

  const groups = Object.values(byCurrency);
  const missing = [];
  const converted = groups.reduce(
    (acc, group) => {
      const sameCurrency = isSameCurrency(group.currency, targetCurrency);
      const matched = sameCurrency
        ? { rate: 1, direction: "base", record: null }
        : group.rateBasis?.rate
          ? { rate: group.rateBasis.rate, direction: "direct", record: null }
          : pickConversionRate(exchangeRates, group.currency, targetCurrency, group.rateBasis?.date || pricingDate);
      if (!matched?.rate) {
        missing.push(group);
        return acc;
      }
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
    lineItems,
    missing,
    converted: {
      ...converted,
      canConvert: missing.length === 0,
      currency: targetCurrency,
    },
  };
};
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
const financialStateFromRecord = (record, sourceType = SOURCE_NONE) => {
  if (!record) {
    return {
      pricingMode: PRICING_MODE_LINE,
      financialSourceType: sourceType === SOURCE_NONE ? SOURCE_MANUAL : sourceType,
      packageSubTotal: 0,
      packageVatRate: 0,
      packageVatAmount: 0,
      packageTotalAmount: 0,
    };
  }
  const packageMode =
    isPackagePricing(record) ||
    !!parseNum(record.packageSubTotal) ||
    !!parseNum(record.packageTotalAmount);
  const subTotal = parseNum(record.packageSubTotal ?? record.subTotal);
  const rawVatAmount = parseNum(record.packageVatAmount ?? record.vatAmount);
  const rawTotalAmount = parseNum(
    record.packageTotalAmount || record.totalAmount || record.grandTotal || record.fixedAmount,
  );
  const vatRate = packageMode
    ? parseNum(record.packageVatRate ?? record.vatRate) ||
    inferVatRate(
      subTotal,
      rawVatAmount ||
      (rawTotalAmount && subTotal
        ? Math.max(rawTotalAmount - subTotal, 0)
        : 0),
      0,
    )
    : 0;
  const vatAmount = packageMode
    ? rawVatAmount ||
    (rawTotalAmount && subTotal ? Math.max(rawTotalAmount - subTotal, 0) : 0) ||
    Math.round((subTotal * vatRate) / 100)
    : rawVatAmount;
  const totalAmount = rawTotalAmount || subTotal + vatAmount;
  return {
    pricingMode: packageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
    financialSourceType: sourceType,
    packageSubTotal: packageMode ? subTotal : 0,
    packageVatRate: vatRate,
    packageVatAmount: packageMode ? vatAmount : 0,
    packageTotalAmount: packageMode ? totalAmount : 0,
  };
};
const billingModeForContext = ({ fromQuotation, packageMode, hasFinancialSource }) => {
  if (packageMode && fromQuotation) return BILLING_PACKAGE_INCLUDED;
  if (packageMode) return BILLING_SEPARATE;
  if (hasFinancialSource) return BILLING_LINE;
  return BILLING_SCOPE;
};
const fmtDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const nowISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 0 : 30, 0, 0);
  return d.toISOString();
};
const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0].toUpperCase())
    .join("");
};
const avatarBg = (name) => {
  const cols = [
    "#2563eb",
    "#7c3aed",
    "#059669",
    "#dc2626",
    "#d97706",
    "#0891b2",
    "#be185d",
    "#0369a1",
  ];
  let h = 0;
  for (let i = 0; i < (name || "").length; i++)
    h = (h * 31 + name.charCodeAt(i)) % cols.length;
  return cols[h];
};

async function fetchAll(url, params = {}) {
  try {
    const r = await ctx.api.request({
      url,
      params: { pageSize: 500, page: 1, ...params },
    });
    return r?.data?.data || [];
  } catch {
    return [];
  }
}

// Quotations of one customer, fresh from the server (2026-09-25): the list
// loaded when the form opened goes stale — a quotation created afterwards
// in another tab/popup never showed under Related Quotation — and that
// list is capped at 500 rows.
async function fetchCustomerQuotations(customerId) {
  if (!customerId) return [];
  return fetchAll("quotations:list", {
    filter: JSON.stringify({ customerId: { $eq: customerId } }),
    sort: ["-createdAt"],
  });
}

async function fetchCompanyServices() {
  const appendProfiles = [
    ["services", "currencies"],
    ["service", "currencies"],
    ["services", "currency"],
    ["service", "currency"],
    ["currencies"],
    ["currency"],
    ["services"],
    ["service"],
    [],
  ];
  for (const appends of appendProfiles) {
    const rows = await fetchAll(
      "companyServices:list",
      appends.length ? { appends } : {},
    );
    if (Array.isArray(rows) && rows.length) return rows;
  }
  return [];
}

async function fetchAllFromCandidates(urls = []) {
  for (const url of urls) {
    try {
      const rows = await fetchAll(url);
      if (Array.isArray(rows) && rows.length) return rows;
    } catch { }
  }
  return [];
}

// Companies whose cases follow the auto-numbered PREFIX + STT(3) + MM + YYYY
// caseCode convention. Each company has its own code prefix.
const CASE_CODE_PREFIX_BY_SHORT_NAME = {
  CBI: "C",
  VLIC: "V",
};

function caseCodeDateParts(dateValue) {
  const d = dateValue ? new Date(dateValue) : new Date();
  const safeDate = Number.isNaN(d.getTime()) ? new Date() : d;
  return {
    mm: String(safeDate.getMonth() + 1).padStart(2, "0"),
    yyyy: safeDate.getFullYear(),
  };
}

// ---- case code sequence (pure; tested by scripts/tests/case-code-sequence.test.js) ----
// 2026-10-01: STT runs on through the whole year and resets only in January
// (Sept C001..C032 → Oct C033), like the Cases "Case Code" sequence field's
// reset cycle; MMYYYY still shows the Open date's month/year. The next STT is
// the highest one among this prefix's codes of that year, any month, + 1.
const nextCaseCode = (codes, prefix, mm, yyyy) => {
  const pattern = new RegExp(`^${prefix}(\\d{3,})(0[1-9]|1[0-2])${yyyy}$`, "i");
  const maxIndex = (codes || []).reduce((max, code) => {
    const match = String(code || "").match(pattern);
    return match ? Math.max(max, parseInt(match[1], 10) || 0) : max;
  }, 0);
  return `${prefix}${String(maxIndex + 1).padStart(3, "0")}${mm}${yyyy}`;
};
// ---- end case code sequence ----

// STT is scoped per internal company: CBI and VLIC each keep their own
// independent running sequence for the year.
async function generateCaseCode({ internalCompanyId, shortName, dateValue }) {
  const normalizedShortName = String(shortName || "").trim().toUpperCase();
  const prefix = CASE_CODE_PREFIX_BY_SHORT_NAME[normalizedShortName];
  if (!internalCompanyId || !prefix) {
    return null;
  }

  const { mm, yyyy } = caseCodeDateParts(dateValue);

  const rows = await fetchAll("projects:list", {
    pageSize: 1000,
    sort: ["-createdAt"],
    filter: JSON.stringify({
      internalCompanyId: { $eq: parseInt(internalCompanyId, 10) },
    }),
  });

  return nextCaseCode((rows || []).map((item) => item?.caseCode), prefix, mm, yyyy);
}

async function fetchExchangeRatesForConversion(fromCurrencyIds = [], toCurrencyId) {
  const toId = extractCurrencyId(toCurrencyId);
  const fromIds = Array.from(
    new Set(
      (fromCurrencyIds || [])
        .map((id) => extractCurrencyId(id))
        .filter((id) => id && id !== toId),
    ),
  );
  if (!toId || !fromIds.length) return [];

  try {
    const r = await ctx.api.request({
      url: "exchangeRates:list",
      params: {
        pageSize: Math.max(1000, fromIds.length * 5), // enough history for an older rate date
        page: 1,
        sort: ["-effectiveDate", "-createdAt"],
        filter: JSON.stringify({
          $or: [
            { fromCurrencyId: { $in: fromIds }, toCurrencyId: { $eq: toId } },
            { fromCurrencyId: { $eq: toId }, toCurrencyId: { $in: fromIds } },
          ],
        }),
      },
    });
    return r?.data?.data || [];
  } catch {
    return [];
  }
}

// Shared by applyCombo/applyAdhocCombo (real combo + ad-hoc combo builder):
// combo pricing on the Case is always stored/displayed in VND, so a combo
// whose own packageSubTotal is quoted in a different currency needs
// converting before it lands in the Package Subtotal field. Returns the
// original amount unchanged (wasConverted: false) when no conversion is
// needed or no rate is found — callers keep showing the raw amount rather
// than blocking the user, with a warning toast for the missing-rate case.
async function convertComboSubTotalToVnd(subTotal, comboCurrencyId, vndId, pricingDate) {
  if (!comboCurrencyId || !vndId || comboCurrencyId === vndId) {
    return { convertedSubTotal: subTotal, wasConverted: false };
  }
  const rates = await fetchExchangeRatesForConversion([comboCurrencyId], vndId);
  const matched = pickConversionRate(rates, comboCurrencyId, vndId, pricingDate);
  if (matched?.rate > 0) {
    return { convertedSubTotal: Math.round(subTotal * matched.rate), wasConverted: true };
  }
  message.warning(
    tr("Could not find an exchange rate to convert the combo's currency to VND — keeping the original amount, please double-check."),
  );
  return { convertedSubTotal: subTotal, wasConverted: false };
}

// ---- combo merge helpers (pure; tested by scripts/tests/combo-merge.test.js) ----
// Line/Combo pricing sync (2026-09-25, user rule): when a combo is added
// while standalone services exist (picked in Line pricing, or added with
// "New service" before any combo), they are merged INTO that combo — Combo
// pricing never shows loose lines next to combos. Rows that came from the
// selected Contract/Quotation keep that document's own shape and are left
// alone. Each merged row is tagged with the combo, priced by it (its own
// value kept as _comboItemSnapshot for reference) and flagged
// _mergedIntoCombo; its value (contributionOf) joins the combo's amount.
const mergeStandaloneIntoCombo = (rows, combo, contributionOf) => {
  const merged = [];
  let contribution = 0;
  const next = (rows || []).map((row) => {
    if (row?._comboInstanceId || row?._fromContract || row?._fromQuotation) return row;
    const value = Math.max(Number(contributionOf(row)) || 0, 0);
    contribution += value;
    const mergedRow = {
      ...row,
      basePrice: 0,
      vat: 0,
      billingMode: BILLING_PACKAGE_INCLUDED,
      pricingMode: PRICING_MODE_PACKAGE,
      _packageBasePrice: 0,
      _comboInstanceId: combo.instanceId,
      _comboCatalogId: combo.catalogId ?? null,
      _comboName: combo.name || "",
      _comboSnapshot: combo.snapshot || null,
      _mergedIntoCombo: true,
      _comboItemSnapshot: row._comboItemSnapshot || { price: value, vat: 0, currency: combo.currency || null },
    };
    merged.push(mergedRow);
    return mergedRow;
  });
  return { rows: next, merged, contribution };
};
// ---- end combo merge helpers ----

// Converts every existing LINE-priced row into a package-included row the
// moment the case's very first combo is applied (line mode -> package
// mode), folding each row's own VND-converted subtotal into the starting
// packageSubTotal instead of discarding it — combo/line pricing still
// don't mix within one case, but a service that already had a real price
// shouldn't just vanish when the case switches pricing modes.
//
// Module-level (not defined inside ProjectServicesTable) on purpose: it's
// called from ProjectCreateForm's applyCombo/applyAdhocCombo, a completely
// separate top-level component with no access to ProjectServicesTable's
// own closure. An earlier version of this helper lived inside
// ProjectServicesTable by mistake and threw "foldLineRowsIntoPackage is
// not defined" (silently, inside an async handler) the instant a user
// applied their first combo — which looked like "nothing happens" / the
// combo never shows up in the table.
async function foldLineRowsIntoPackage(existingRows, currencies, vndId, pricingDate) {
  const targetCurrency = findCurrencyById(currencies, vndId) || defaultCurrencyObject();
  const neededIds = Array.from(new Set(
    existingRows
      .map((row) => extractCurrencyId(currencyFromRecord(row, currencies, targetCurrency)))
      .filter((id) => id && id !== vndId),
  ));
  const foldRates = neededIds.length ? await fetchExchangeRatesForConversion(neededIds, vndId) : [];
  let contributionVnd = 0;
  const convertedRows = existingRows.map((row) => {
    const rowBillingMode = row.billingMode || BILLING_LINE;
    if (rowBillingMode !== BILLING_LINE && rowBillingMode !== BILLING_SEPARATE) {
      return { ...row, billingMode: BILLING_PACKAGE_INCLUDED, pricingMode: PRICING_MODE_PACKAGE, _packageBasePrice: 0 };
    }
    const rowCurrency = currencyFromRecord(row, currencies, targetCurrency);
    const amounts = calcLineAmounts(row.basePrice, row.vat, rowCurrency);
    const matched = isSameCurrency(rowCurrency, targetCurrency)
      ? { rate: 1 }
      : pickConversionRate(foldRates, rowCurrency, targetCurrency, pricingDate);
    const rowContributionVnd = matched?.rate ? Math.round(amounts.subTotal * matched.rate) : 0;
    contributionVnd += rowContributionVnd;
    return {
      ...row,
      basePrice: 0,
      vat: 0,
      billingMode: BILLING_PACKAGE_INCLUDED,
      pricingMode: PRICING_MODE_PACKAGE,
      _packageBasePrice: rowContributionVnd,
    };
  });
  return { rows: convertedRows, contributionVnd };
}

// ── Fetch quotationServices by quotationId ──
async function fetchProjectTemplates() {
  const candidates = ["projectTemplates:list", "taskTemplates:list", "taskTemplate:list"];
  for (const url of candidates) {
    try {
      const r = await ctx.api.request({
        url,
        params: {
          pageSize: 500,
          page: 1,
          fields: PROJECT_TEMPLATE_FIELDS,
        },
      });
      const rows = r?.data?.data || [];
      if (Array.isArray(rows)) return rows;
    } catch { }
  }
  return [];
}

const runtimeCompact = (items = []) =>
  items
    .map((item) => (item === undefined || item === null ? "" : String(item).trim()))
    .filter(Boolean);

const runtimeExtractId = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return runtimeExtractId(value[0]);
  if (typeof value === "object") return runtimeExtractId(value.id || value.value || value.key);
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};
const getInternalCompanyId = (record) =>
  runtimeExtractId(
    record?.internalCompanyId ||
    record?.internalCompany ||
    record?.companyId ||
    record?.company ||
    record?.service?.internalCompanyId ||
    record?.service?.internalCompany ||
    record?.services?.internalCompanyId ||
    record?.services?.internalCompany,
  );
const isSameInternalCompany = (record, internalCompanyId) => {
  const recordCompanyId = getInternalCompanyId(record);
  const selectedCompanyId = runtimeExtractId(internalCompanyId);
  return !!recordCompanyId && !!selectedCompanyId && recordCompanyId === selectedCompanyId;
};

const SYSTEM_USER_ID = 1;
const DEFAULT_REFRESH_BLOCK_UID = "28507lshptk";
const QUICK_CREATE_CREATED_EVENT = "law:quick-create:created";
const QUICK_CREATE_BRIDGE_KEY = "__lawQuickCreateBridge";
const CONTRACT_DATA_BLOCK_UID = "7be57facee6";
const QUOTATION_DATA_BLOCK_UID = "sowlvtiiqkv";
// Additional data blocks to refresh after a case is created: the case list
// block sitting behind this create popup, plus the Contract/Quotation list
// blocks — a new case can auto-link or auto-create records there too, and
// those blocks otherwise go stale until the user clicks their own Refresh.
const ADDITIONAL_REFRESH_BLOCK_UIDS = ["kzutpyp7eno", CONTRACT_DATA_BLOCK_UID, QUOTATION_DATA_BLOCK_UID];
const QUICK_CREATE_COLLECTION_BY_VIEW = {
  customerCreate: "customers",
  contractCreate: "contracts",
  quotationCreate: "quotations",
};
const QUICK_CREATE_REFRESH_BLOCK_UID_BY_VIEW = {
  contractCreate: CONTRACT_DATA_BLOCK_UID,
  quotationCreate: QUOTATION_DATA_BLOCK_UID,
};
const mergeRecordById = (items = [], record) => {
  const id = runtimeExtractId(record?.id || record);
  if (!id || !record || typeof record !== "object") return items || [];
  const found = (items || []).some((item) => String(runtimeExtractId(item?.id || item)) === String(id));
  if (found) {
    return (items || []).map((item) =>
      String(runtimeExtractId(item?.id || item)) === String(id)
        ? { ...item, ...record, id }
        : item,
    );
  }
  return [{ ...record, id }, ...(items || [])];
};

const getQuickCreateBridge = () => {
  const scope = ctx.engine || ctx.app || (typeof window !== "undefined" ? window : null);
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
            console.warn("[CaseCreateForm] quick-create bridge listener failed", error);
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
              console.warn("[CaseCreateForm] quick-create bridge replay failed", error);
            }
          });
        }
        return () => listeners.delete(listener);
      },
    };
  }
  return scope[QUICK_CREATE_BRIDGE_KEY];
};

const isSystemUserId = (value) => runtimeExtractId(value) === SYSTEM_USER_ID;
const filterSelectableLawyers = (items = []) =>
  (items || []).filter((item) => {
    const linkedUserId =
      runtimeExtractId(item?.userId) ||
      runtimeExtractId(item?.user) ||
      runtimeExtractId(item?.users) ||
      runtimeExtractId(item?.accountId) ||
      runtimeExtractId(item?.account);
    return linkedUserId ? !isSystemUserId(linkedUserId) : !isSystemUserId(item?.id);
  });
const getLawyerLinkedUserId = (item) =>
  runtimeExtractId(item?.userId) ||
  runtimeExtractId(item?.user) ||
  runtimeExtractId(item?.users) ||
  runtimeExtractId(item?.accountId) ||
  runtimeExtractId(item?.account);

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
      ...(ctx.params || {}),
    };
  } catch {
    return {};
  }
};

const getBlockModelByUid = (uid) => {
  if (!uid) return null;
  const engine = ctx.engine || ctx.app;
  try {
    return (
      ctx.getModel?.(uid, true) ||
      ctx.getModel?.(uid) ||
      engine?.getModel?.(uid) ||
      (ctx.app && ctx.app !== engine ? ctx.app?.getModel?.(uid) : null) ||
      null
    );
  } catch (error) {
    console.warn("[CaseCreateForm] get model failed", uid, error);
    return null;
  }
};

const refreshBlockModel = async (blockModel) => {
  if (!blockModel) return false;
  try {
    const resource = blockModel.resource;
    if (resource && typeof resource.refresh === "function") {
      await resource.refresh();
      return true;
    }
    if (typeof blockModel.refresh === "function") {
      await blockModel.refresh();
      return true;
    }
  } catch (error) {
    console.warn("[CaseCreateForm] refresh failed", error);
  }
  return false;
};

// ctx.getModel(uid)/engine.getModel(uid) do not actually resolve blocks by a
// foreign UID in this NocoBase runtime (verified against ContractCreateForm.js:
// even a UID copied straight from the block's own "Copy UID" menu returns
// nothing) — there is no documented cross-block "get model by uid" API (see
// nocobase-docs/runjs-ctx-api.md). The one thing that reliably updates the
// list is a real click on its own "Refresh" button, so simulate that via
// the DOM instead of guessing at model APIs.
const REFRESH_BUTTON_TEXT_VARIANTS = ["refresh", "làm mới", "tải lại", "reload"];
const clickVisibleRefreshButtons = () => {
  try {
    const candidates = Array.from(document.querySelectorAll("button, [role='button']"));
    const matches = candidates.filter((el) => {
      const text = (el.textContent || "").trim().toLowerCase();
      return REFRESH_BUTTON_TEXT_VARIANTS.includes(text);
    });
    matches.forEach((el) => {
      try {
        el.click();
      } catch (error) {
        console.warn("[CaseCreateForm][refresh-debug] click failed on refresh button", error);
      }
    });
    return matches.length > 0;
  } catch (error) {
    console.warn("[CaseCreateForm][refresh-debug] clickVisibleRefreshButtons failed", error);
    return false;
  }
};

const refreshNocoBaseDataBlocks = async () => {
  const input = getRuntimeInput();
  const uidCandidates = Array.from(
    new Set(
      runtimeCompact([
        input.targetBlockUid,
        input.sourceBlockUid,
        input.blockUid,
        input.dataBlockUid,
        DEFAULT_REFRESH_BLOCK_UID,
        ...ADDITIONAL_REFRESH_BLOCK_UIDS,
      ]),
    ),
  );

  let refreshedAny = false;
  for (const uid of uidCandidates) {
    const refreshed = await refreshBlockModel(getBlockModelByUid(uid));
    refreshedAny = refreshedAny || refreshed;
  }

  if (!refreshedAny) {
    refreshedAny = await refreshBlockModel(ctx.blockModel || ctx.model);
  }

  const clickedRefreshButton = clickVisibleRefreshButtons();
  refreshedAny = refreshedAny || clickedRefreshButton;

  return refreshedAny;
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
        console.warn("[CaseCreateForm] close popup failed", error);
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
      console.warn("[CaseCreateForm] discard close failed", error);
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
        console.warn("[CaseCreateForm] configure modal close failed", error);
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
      console.warn("[CaseCreateForm] patch close failed", error);
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

async function fetchQuotationServices(quotationId) {
  try {
    const r = await ctx.api.request({
      url: "quotationServices:list",
      params: {
        pageSize: 500,
        page: 1,
        appends: ["services"],
        filter: JSON.stringify({ quotationId: { $eq: parseInt(quotationId) } }),
      },
    });
    return r?.data?.data || [];
  } catch {
    return [];
  }
}

// ── Map quotationServices rows → table rows ──
async function fetchContractServices(contractId) {
  if (!contractId) return [];
  const filters = [
    { contractId: { $eq: parseInt(contractId) } },
    { contracts: { id: { $eq: parseInt(contractId) } } },
  ];
  for (const filter of filters) {
    try {
      const r = await ctx.api.request({
        url: "contractServices:list",
        params: {
          pageSize: 500,
          page: 1,
          // "services" is the same relation appended for quotationServices
          // (see fetchQuotationServices) — kept for the rows where it
          // actually resolves. But ContractServices.js's own fetchCSvcs()
          // (the proven-working contract-services editor) never appends
          // "services" at all — it resolves each row's catalog service
          // indirectly through the linked projectServices/quotationServices
          // record instead (see buildProjectServiceSyncPayload's sibling
          // lookups there). contractServices rows created via
          // ContractCreateForm.js's buildContractServicePayload always set
          // quotationServiceId/quotationServices (and often
          // projectServiceId/projectServices) even when the row's own
          // serviceId ends up empty, so appending these two here gives
          // mapContractServicesToRows a real fallback chain instead of
          // silently losing task-template matches whenever "services"
          // itself doesn't resolve.
          appends: ["services", "projectServices", "quotationServices"],
          filter: JSON.stringify(filter),
        },
      });
      const rows = r?.data?.data || [];
      if (rows.length) return rows;
    } catch { }
  }
  return [];
}

function mapQuotationServicesToRows(qsvcs, quotation, taskTemplates = []) {
  const parentPackageMode = isPackagePricing(quotation);
  return qsvcs.map((s) => {
    if (qsvcs.indexOf(s) === 0)
      console.log("[quotationService row]", JSON.stringify(s, null, 2));

    // fetchQuotationServices appends the relation under "services" (plural) —
    // reading only "s.service" (singular) left this always undefined and
    // silently killed every fallback below (serviceId, serviceType,
    // description, basePrice, currency), which in turn starved task-template
    // matching of a reliable serviceId whenever quotationServices.serviceId
    // itself was empty/stale.
    const serviceRecord = s.service || s.services || {};
    const packageMode = parentPackageMode || isPackagePricing(s);
    const packageState = financialStateFromRecord(
      {
        pricingMode: packageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
        packageSubTotal: s.packageSubTotal ?? quotation?.packageSubTotal ?? quotation?.subTotal,
        packageVatRate: s.packageVatRate ?? quotation?.packageVatRate ?? quotation?.vatRate,
        packageVatAmount: s.packageVatAmount ?? quotation?.packageVatAmount ?? quotation?.vatAmount,
        packageTotalAmount: s.packageTotalAmount ?? quotation?.packageTotalAmount ?? quotation?.totalAmount ?? quotation?.grandTotal,
      },
      SOURCE_QUOTATION,
    );
    const basePrice = packageMode
      ? 0
      : s.price ?? s.basePrice ?? serviceRecord.basePrice ?? 0;
    const vat = packageMode ? 0 : s.vat ?? 0;
    const rowCurrencyId =
      getRecordCurrencyId(s) ||
      getRecordCurrencyId(serviceRecord) ||
      getRecordCurrencyId(quotation);
    const row = {
      _id: Date.now() + Math.random(),
      _qServiceId: s.id,
      _frozenRate: frozenSourceRate(s),
      _frozenRateCurrencyId: rowCurrencyId ? String(rowCurrencyId) : null,
      serviceId: s.serviceId
        ? String(s.serviceId)
        : serviceRecord.id
          ? String(serviceRecord.id)
          : null,
      serviceName: s.serviceName || serviceRecord.serviceName || s.name || "",
      serviceType: s.serviceType || serviceRecord.serviceType || s.type || "",
      description: s.description || serviceRecord.description || s.note || "",
      currencyId: rowCurrencyId ? String(rowCurrencyId) : null,
      _sourceCurrencyId: rowCurrencyId ? String(rowCurrencyId) : null,
      basePrice,
      vat,
      billingMode: packageMode ? BILLING_PACKAGE_INCLUDED : BILLING_LINE,
      financialSourceType: SOURCE_QUOTATION,
      pricingMode: packageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
      comboId: s.comboId ?? null,
      comboName: s.comboName ?? null,
      _comboInstanceId: packageMode
        ? (s.comboId ? `combo-${s.comboId}` : (s.comboName ? `comboname-${s.comboName}` : null))
        : null,
      packageSubTotal: packageState.packageSubTotal,
      packageVatRate: packageState.packageVatRate,
      packageVatAmount: packageState.packageVatAmount,
      packageTotalAmount: packageState.packageTotalAmount,
      subTotal: packageMode ? 0 : parseNum(s.subTotal ?? basePrice),
      vatAmount: packageMode
        ? 0
        : parseNum(s.vatAmount) || Math.round((parseNum(basePrice) * parseNum(vat)) / 100),
      totalAmount: packageMode
        ? 0
        : parseNum(s.totalAmount) ||
        parseNum(s.subTotal ?? basePrice) +
        (parseNum(s.vatAmount) || Math.round((parseNum(basePrice) * parseNum(vat)) / 100)),
      _fromQuotation: true,
    };
    // Matched against both the relation's own id (serviceRecord.id, the
    // reliable master services.id) and the raw quotationServices.serviceId
    // scalar — projectTemplates.serviceId is only known to reference one of
    // the two reliably, so both candidates are offered rather than picking
    // one and risking silently matching nothing.
    row._templateTasks = getServiceTaskTemplates(taskTemplates, {
      id: serviceRecord.id,
      serviceId: s.serviceId,
      serviceName: row.serviceName,
    });
    return row;
  });
}

// Rebuilds the same pricingSnapshot shape applyCombo() builds when a combo
// is applied interactively (see its own comment, ~line 9903), but from a
// contractServices row's own comboId instead of a live catalog pick — used
// by mapContractServicesToRows so a Case created from an existing Contract
// carries a real snapshot instead of submitting null. Looks the combo up in
// the already-fetched catalog list first (full item-level detail); if the
// catalog isn't loaded yet or the combo was since deleted, falls back to a
// lighter snapshot built from this row's own already-synced package totals
// so the group price is still preserved instead of lost entirely.
function buildComboSnapshotForContractRow(comboIdVal, comboNameVal, combosList, packageState) {
  if (!comboIdVal) return null;
  const catalogCombo = (combosList || []).find((c) => String(c.id) === String(comboIdVal));
  if (catalogCombo) {
    const items = catalogCombo.serviceComboItems || [];
    return {
      comboId: comboIdVal,
      comboName: catalogCombo.comboName || comboNameVal || "",
      comboCode: catalogCombo.comboCode || "",
      serviceComboType: catalogCombo.serviceComboType || "",
      packageSubTotal: parseNum(catalogCombo.packageSubTotal),
      packageVatRate: parseNum(catalogCombo.packageVatRate),
      appliedAt: new Date().toISOString(),
      items: items.map((item) => ({
        serviceId: item.serviceId || item.services?.id || null,
        serviceName: item.serviceName || item.services?.serviceName || "",
        quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
        price: parseNum(item.price),
        vat: parseNum(item.vat),
        currencyId: item.currencyId || null,
      })),
    };
  }
  return {
    comboId: comboIdVal,
    comboName: comboNameVal || "",
    packageSubTotal: parseNum(packageState.packageSubTotal),
    packageVatRate: parseNum(packageState.packageVatRate),
    appliedAt: new Date().toISOString(),
    items: [],
  };
}

// Maps each contractServices/quotationServices row's own serviceId/serviceName
// against the global taskTemplates catalog (same lookup addRowFromService uses
// for a freshly-picked catalog service), so a Case created from a related
// Contract or Quotation shows that service's sample tasks immediately instead
// of relying only on getRowTaskTemplates' render-time fallback.
// ---- contract trigger seed (pure; tested by scripts/tests/case-trigger-seed.test.js) ----
// A By Service contract created before its Case stores the sample tasks the
// lawyer ticked as payment triggers in contractServices.paymentTriggerTemplateIds
// (ContractCreateForm.js). When present — including [] ("explicitly none") —
// it overrides the catalog default for this row's Sample Tasks; null/absent
// (older contracts, By Case, Retainer) keeps the catalog default. Returns new
// objects: syncCatalogServiceTasks diffs against the pristine catalog entries,
// so those must not be mutated. See
// docs/superpowers/specs/2026-09-24-by-service-payment-trigger-config-design.md §6.
function applyContractTriggerSelection(templateTasks, ids) {
  if (!Array.isArray(ids)) return templateTasks;
  const ticked = new Set(ids.map((id) => String(id)));
  return (templateTasks || []).map((task) => ({
    ...task,
    isPaymentTrigger: ticked.has(String(task?.id)),
  }));
}
// ---- end contract trigger seed ----

// ---- installment template links (pure; tested by scripts/tests/case-installment-links.test.js) ----
// A By Case contract created before its Case stores, per installment, the
// sample tasks ticked as its triggers (contractPaymentSchedules.
// triggerTemplateIds, ContractCreateForm.js). Once this Case's tasks exist,
// each template id resolves to a real task: the row whose Sample Tasks
// contain that template → that entry's FINAL title (the lawyer may have
// renamed it before submit) → the Case task with the same service and title.
// Templates no longer in Sample Tasks are skipped. Returns task ids with
// not-done tasks first — the installment activates when ALL linked tasks are
// Done and each link re-checks, so a Done task linked first would activate
// it too early. See
// docs/superpowers/specs/2026-09-24-by-case-installment-trigger-tasks-design.md §5.
// Returns { taskIds, unresolvedCount }: unresolvedCount = templates still in
// Sample Tasks but with no matching Case task (e.g. a rename that failed to
// save) — reported to the lawyer instead of skipped silently.
function resolveTemplateTaskLinks({ templateIds, rows, tasks }) {
  if (!Array.isArray(templateIds) || !Array.isArray(rows) || !Array.isArray(tasks)) {
    return { taskIds: [], unresolvedCount: 0 };
  }
  const norm = (value) => String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
  const found = [];
  let unresolvedCount = 0;
  templateIds.forEach((templateId) => {
    const wanted = String(templateId);
    for (const row of rows) {
      const entry = (row?._templateTasks || []).find(
        (task) => String(task?._id ?? task?.id ?? "") === wanted,
      );
      if (!entry) continue;
      // Same fallback syncCatalogServiceTasks writes for a blanked title.
      const title = norm(entry.title || entry.templateName || entry.name) || "untitled task";
      const match = tasks.find(
        (task) =>
          String(task?.serviceId?.id ?? task?.serviceId ?? "") === String(row.serviceId) &&
          norm(task?.title) === title,
      );
      if (!match) unresolvedCount += 1;
      else if (!found.some((task) => task.id === match.id)) found.push(match);
      break;
    }
  });
  const isDone = (task) => String(task?.status || "") === "done";
  return {
    taskIds: [...found.filter((task) => !isDone(task)), ...found.filter(isDone)].map((task) => task.id),
    unresolvedCount,
  };
}
// ---- end installment template links ----

// ---- contract package normalization (pure; tested by scripts/tests/package-group-totals.test.js) ----
// Case views sum each package group's own packageSubTotal (one per combo, one
// per standalone package line), so those group amounts must add up to the
// contract's package subtotal. Contracts saved before the 2026-09-25 fix could
// break that: a Combo Subtotal overridden on the contract (e.g. combos
// 62,823,600 + 15,000,000 sold for 70,000,000) wasn't pushed down to the
// combos, and standalone package lines carried the whole contract subtotal as
// a fallback. When the groups don't already sum to the contract subtotal,
// rescale them: combos pro-rata to their own amount, standalone lines 0
// ("included in package"); no combo amounts at all → equal split. Whole
// units, remainder on the last group; package VAT/total recomputed per row.
function normalizeContractPackageRows(rows, contract) {
  const pool = Math.round(Number(contract?.packageSubTotal ?? contract?.subTotal) || 0);
  const pkgRows = (rows || []).filter((row) => row?.pricingMode === "package");
  if (pool <= 0 || !pkgRows.length) return rows;
  const groups = [];
  const byKey = new Map();
  pkgRows.forEach((row, index) => {
    const key = row.comboId
      ? `id:${row.comboId}`
      : row.comboName
        ? `name:${row.comboName}`
        : `row:${row.id ?? row._id ?? index}`;
    if (!byKey.has(key)) {
      const group = { key, isCombo: !key.startsWith("row:"), amount: Number(row.packageSubTotal) || 0, rows: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    byKey.get(key).rows.push(row);
  });
  const currentSum = groups.reduce((sum, group) => sum + group.amount, 0);
  if (Math.abs(currentSum - pool) <= 1) return rows;
  const weights = groups.map((group) => (group.isCombo ? Math.max(group.amount, 0) : 0));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const targets = weightSum > 0 ? groups.filter((_, index) => weights[index] > 0) : groups;
  const share = new Map(groups.map((group) => [group.key, 0]));
  let allocated = 0;
  targets.forEach((group, index) => {
    const amount =
      index === targets.length - 1
        ? pool - allocated
        : weightSum > 0
          ? Math.round((pool * weights[groups.indexOf(group)]) / weightSum)
          : Math.round(pool / targets.length);
    share.set(group.key, amount);
    allocated += amount;
  });
  const keyOfRow = new Map();
  groups.forEach((group) => group.rows.forEach((row) => keyOfRow.set(row, group.key)));
  return rows.map((row) => {
    if (!keyOfRow.has(row)) return row;
    const subTotal = share.get(keyOfRow.get(row));
    const vatRate = Number(row.packageVatRate ?? contract?.packageVatRate ?? contract?.vatRate) || 0;
    const vatAmount = Math.round((subTotal * vatRate) / 100);
    return {
      ...row,
      packageSubTotal: subTotal,
      packageVatRate: vatRate,
      packageVatAmount: vatAmount,
      packageTotalAmount: subTotal + vatAmount,
    };
  });
}
// ---- end contract package normalization ----

function mapContractServicesToRows(csvcs, contract, taskTemplates = [], combosList = []) {
  const parentPackageMode = isPackagePricing(contract);
  const mappedRows = csvcs.map((s) => {
    const serviceRecord = s.service || s.services || {};
    // contractServices' own "services" relation frequently doesn't resolve
    // (see fetchContractServices' comment — ContractServices.js's own
    // editor never relies on it either), so fall back through whichever
    // originating projectServices/quotationServices record this
    // contractService was synced from — ContractCreateForm.js's
    // buildContractServicePayload always links one or both of those even
    // when the contractService's own serviceId/ServiceId ends up empty.
    const linkedProjectService = Array.isArray(s.projectServices) ? s.projectServices[0] : s.projectServices;
    const linkedQuotationService = Array.isArray(s.quotationServices) ? s.quotationServices[0] : s.quotationServices;
    const resolvedServiceId =
      s.serviceId ||
      s.ServiceId ||
      serviceRecord.id ||
      linkedProjectService?.serviceId ||
      linkedProjectService?.ServiceId ||
      linkedQuotationService?.serviceId ||
      linkedQuotationService?.ServiceId ||
      null;
    const packageMode = parentPackageMode || isPackagePricing(s);
    const packageState = financialStateFromRecord(
      {
        pricingMode: packageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
        packageSubTotal: s.packageSubTotal ?? contract?.packageSubTotal ?? contract?.subTotal,
        packageVatRate: s.packageVatRate ?? contract?.packageVatRate ?? contract?.vatRate,
        packageVatAmount: s.packageVatAmount ?? contract?.packageVatAmount ?? contract?.vatAmount,
        packageTotalAmount: s.packageTotalAmount ?? contract?.packageTotalAmount ?? contract?.totalAmount ?? contract?.grandTotal,
      },
      SOURCE_CONTRACT,
    );
    const basePrice = packageMode
      ? 0
      : s.price ?? s.basePrice ?? serviceRecord.basePrice ?? 0;
    const vat = packageMode ? 0 : s.vat ?? 0;
    const subTotal = packageMode ? 0 : parseNum(s.subTotal ?? basePrice);
    const vatAmount = packageMode
      ? 0
      : parseNum(s.vatAmount) || Math.round((parseNum(basePrice) * parseNum(vat)) / 100);
    const rowCurrencyId =
      getRecordCurrencyId(s) ||
      getRecordCurrencyId(serviceRecord) ||
      getRecordCurrencyId(contract);
    const row = {
      _id: Date.now() + Math.random(),
      _contractServiceId: s.id,
      _frozenRate: frozenSourceRate(s),
      _frozenRateCurrencyId: rowCurrencyId ? String(rowCurrencyId) : null,
      serviceId: resolvedServiceId ? String(resolvedServiceId) : null,
      serviceName:
        s.serviceName ||
        serviceRecord.serviceName ||
        s.name ||
        linkedProjectService?.serviceName ||
        linkedQuotationService?.serviceName ||
        "",
      serviceType: s.serviceType || serviceRecord.serviceType || s.type || "",
      description: s.description || serviceRecord.description || s.note || "",
      currencyId: rowCurrencyId ? String(rowCurrencyId) : null,
      _sourceCurrencyId: rowCurrencyId ? String(rowCurrencyId) : null,
      basePrice,
      vat,
      billingMode: packageMode ? BILLING_PACKAGE_INCLUDED : BILLING_LINE,
      financialSourceType: SOURCE_CONTRACT,
      pricingMode: packageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
      comboId: s.comboId ?? null,
      comboName: s.comboName ?? null,
      // Underscore-prefixed combo fields — distinct from comboId/comboName
      // above (which only drive display/grouping) — are what handleSubmit's
      // CONTRACT-branch createProjectService() actually reads to populate
      // the new projectServices row's comboId/serviceCombo/comboName/
      // pricingSnapshot columns. Previously left unset here, so every Case
      // created from an existing Contract silently lost its combo linkage
      // and price snapshot on submit despite displaying correctly beforehand.
      _comboCatalogId: s.comboId ?? null,
      _comboName: s.comboName ?? null,
      _comboSnapshot: packageMode
        ? buildComboSnapshotForContractRow(s.comboId, s.comboName, combosList, packageState)
        : null,
      _comboInstanceId: packageMode
        ? (s.comboId ? `combo-${s.comboId}` : (s.comboName ? `comboname-${s.comboName}` : null))
        : null,
      packageSubTotal: packageState.packageSubTotal,
      packageVatRate: packageState.packageVatRate,
      packageVatAmount: packageState.packageVatAmount,
      packageTotalAmount: packageState.packageTotalAmount,
      subTotal,
      vatAmount,
      totalAmount: packageMode ? 0 : parseNum(s.totalAmount) || subTotal + vatAmount,
      _fromContract: true,
    };
    // See mapQuotationServicesToRows' matching comment above — same
    // both-candidate-ids approach, widened further via resolvedServiceId
    // (which already folds in the linked projectServices/quotationServices
    // fallback computed above) since contractServices.serviceId/services
    // alone are the least reliable of the three sync paths in practice.
    row._templateTasks = getServiceTaskTemplates(taskTemplates, {
      id: resolvedServiceId,
      serviceId: resolvedServiceId,
      serviceName: row.serviceName,
    });
    row._templateTasks = applyContractTriggerSelection(
      row._templateTasks,
      s.paymentTriggerTemplateIds,
    );
    return row;
  });
  // Package groups must add up to the contract's package subtotal (see
  // normalizeContractPackageRows) — repairs contracts saved before the fix.
  return normalizeContractPackageRows(mappedRows, contract);
}

// A Contract/Quotation can hold several independent combo groups (each with
// its own comboId/comboName + shared packageSubTotal across its member
// rows — see mapContractServicesToRows/mapQuotationServicesToRows). This
// rebuilds the `appliedCombos` entries (same shape applyCombo/applyAdhocCombo
// push into state) so the combo section header + "Giá lẻ" comparison still
// render correctly for each group once those rows land on a newly-created
// Case, instead of only the row-level pricing carrying over silently.
function buildAppliedCombosFromRows(mappedRows) {
  const seen = new Map();
  for (const row of mappedRows) {
    if (!row._comboInstanceId || seen.has(row._comboInstanceId)) continue;
    seen.set(row._comboInstanceId, {
      instanceId: row._comboInstanceId,
      comboId: row.comboId ? parseInt(row.comboId) : null,
      comboName: row.comboName || "",
      originalAmount: parseNum(row.packageSubTotal),
      convertedAmount: parseNum(row.packageSubTotal),
      currencyCode: "VND",
      wasConverted: false,
    });
  }
  return Array.from(seen.values());
}

async function getCurrentUser() {
  try {
    const r = await ctx.api.request({ url: "auth:check", method: "GET" });
    return r?.data?.data || r?.data || null;
  } catch {
    return null;
  }
}

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
      params: params,
      defineProperties,
      ...params,
    });
    if (result?.then) await result;
    return true;
  } catch (error) {
    console.warn("[CaseCreateForm] ctx.openView failed", error);
    message.error(tr("Cannot open configured popup view."));
    return false;
  }
};

const PRIORITY_OPTIONS = [
  {
    value: "low",
    label: tr("Low"),
    stars: 1,
    color: "#16a34a",
    bg: "#dcfce7",
    starColor: "#16a34a",
  },
  {
    value: "medium",
    label: tr("Medium"),
    stars: 2,
    color: "#d97706",
    bg: "#fef3c7",
    starColor: "#d97706",
  },
  {
    value: "high",
    label: tr("High"),
    stars: 3,
    color: "#dc2626",
    bg: "#fee2e2",
    starColor: "#dc2626",
  },
];

const LAWYER_TYPE_GROUPS = [
  { key: "partner", label: tr("Partner"), color: "#7c3aed", bg: "#f5f3ff" },
  { key: "lawyer", label: tr("Lawyer"), color: "#2563eb", bg: "#eff6ff" },
  { key: "associate", label: tr("Associate"), color: "#0891b2", bg: "#ecfeff" },
  { key: "suppliant", label: tr("Suppliant"), color: "#d97706", bg: "#fef3c7" },
];

const C = {
  border: "#d9d9d9",
  borderFocus: "#1677ff",
  text: "rgba(0, 0, 0, 0.88)",
  textSub: "rgba(0, 0, 0, 0.45)",
  textLabel: "rgba(0, 0, 0, 0.88)",
  primary: "#1677ff",
  danger: "#ff4d4f",
  success: "#52c41a",
  warning: "#faad14",
  bgCard: "#ffffff",
  bgSection: "#fafafa",
  bgHighlight: "#fafafa",
  borderHighlight: "#d9d9d9",
};

const inp = (ex = {}) => ({
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "4px 11px",
  minHeight: 32,
  fontSize: 14,
  fontFamily: FONT,
  outline: "none",
  color: C.text,
  background: "#fff",
  width: "100%",
  boxSizing: "border-box",
  transition: "all 0.2s",
  lineHeight: "22px",
  ...ex,
});
const onFocus = (e) => {
  if (e.currentTarget) e.currentTarget.style.borderColor = C.borderFocus;
};
const onBlur = (e) => {
  if (e.currentTarget) e.currentTarget.style.borderColor = C.border;
};

const makeIcon = (paths, props = {}) =>
  React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: props.size || 15,
      height: props.size || 15,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
      ...props,
    },
    ...paths,
  );

const PlusIcon = makeIcon([
  React.createElement("path", { key: "1", d: "M12 5v14" }),
  React.createElement("path", { key: "2", d: "M5 12h14" }),
]);
const SearchIcon = makeIcon([
  React.createElement("circle", { key: "1", cx: "11", cy: "11", r: "8" }),
  React.createElement("path", { key: "2", d: "m21 21-4.35-4.35" }),
]);
const FileTextIcon = makeIcon([
  React.createElement("path", { key: "1", d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
  React.createElement("path", { key: "2", d: "M14 2v6h6" }),
  React.createElement("path", { key: "3", d: "M16 13H8" }),
  React.createElement("path", { key: "4", d: "M16 17H8" }),
  React.createElement("path", { key: "5", d: "M10 9H8" }),
]);
const CalendarIcon = makeIcon([
  React.createElement("path", { key: "1", d: "M8 2v4" }),
  React.createElement("path", { key: "2", d: "M16 2v4" }),
  React.createElement("rect", { key: "3", x: "3", y: "4", width: "18", height: "18", rx: "2" }),
  React.createElement("path", { key: "4", d: "M3 10h18" }),
]);
const ClipboardIcon = makeIcon([
  React.createElement("rect", { key: "1", x: "8", y: "2", width: "8", height: "4", rx: "1" }),
  React.createElement("path", { key: "2", d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }),
  React.createElement("path", { key: "3", d: "M9 14h6" }),
  React.createElement("path", { key: "4", d: "M9 18h6" }),
]);
const XIcon = makeIcon([
  React.createElement("path", { key: "1", d: "M18 6 6 18" }),
  React.createElement("path", { key: "2", d: "m6 6 12 12" }),
]);
const CheckIcon = makeIcon([
  React.createElement("path", { key: "1", d: "M20 6 9 17l-5-5" }),
]);
const InfoIcon = makeIcon([
  React.createElement("circle", { key: "1", cx: "12", cy: "12", r: "10" }),
  React.createElement("path", { key: "2", d: "M12 16v-4" }),
  React.createElement("path", { key: "3", d: "M12 8h.01" }),
]);
const ChevronDownIcon = makeIcon([
  React.createElement("path", { key: "1", d: "m6 9 6 6 6-6" }),
]);

const StarRating = ({ value, onChange }) => {
  if (Rate) {
    const priorityToStars = { low: 1, medium: 2, high: 3 };
    const starsToPriority = { 1: "low", 2: "medium", 3: "high" };
    const currentStars = priorityToStars[value] || 0;
    const currentOpt = PRIORITY_OPTIONS.find((p) => p.value === value);
    return React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 12, minHeight: 32 } },
      React.createElement(Rate, {
        count: 3,
        allowClear: false,
        value: currentStars,
        onChange: (stars) => onChange(starsToPriority[stars] || "medium"),
        style: { fontSize: 18 },
      }),
      React.createElement(
        "span",
        { style: { color: C.textSub, fontSize: 13 } },
        currentOpt?.label || tr("Not set"),
      ),
    );
  }
  const [hovered, setHovered] = useState(null);
  const priorityToStars = { low: 1, medium: 2, high: 3 };
  const starsToPriority = { 1: "low", 2: "medium", 3: "high" };
  const currentStars = priorityToStars[value] || 0;
  const displayStars = hovered !== null ? hovered : currentStars;
  const getColor = (s) => {
    const opt = PRIORITY_OPTIONS.find((p) => p.stars === s);
    return opt ? opt.starColor : "#d1d5db";
  };
  const starColor = displayStars > 0 ? getColor(displayStars) : "#d1d5db";
  const currentOpt = PRIORITY_OPTIONS.find((p) => p.value === value);
  return React.createElement(
    "div",
    { style: { display: "flex", alignItems: "center", gap: 16 } },
    React.createElement(
      "div",
      { style: { display: "flex", gap: 6 } },
      [1, 2, 3].map((n) =>
        React.createElement(
          "span",
          {
            key: n,
            onMouseEnter: () => setHovered(n),
            onMouseLeave: () => setHovered(null),
            onClick: () => onChange(starsToPriority[n]),
            style: {
              fontSize: 32,
              cursor: "pointer",
              color: n <= displayStars ? starColor : "#e5e7eb",
              transition: "color 0.12s,transform 0.1s",
              transform: n <= displayStars ? "scale(1.12)" : "scale(1)",
              display: "inline-block",
              lineHeight: 1,
              userSelect: "none",
            },
          },
          "★",
        ),
      ),
    ),
    currentOpt &&
    React.createElement(
      "div",
      {
        style: {
          padding: "4px 14px",
          borderRadius: 20,
          background: currentOpt.bg,
          border: `1.5px solid ${currentOpt.color}`,
          color: currentOpt.color,
          fontSize: 13,
          fontWeight: 700,
          fontFamily: FONT,
        },
      },
      currentOpt.label,
    ),
    hovered !== null &&
    hovered !== currentStars &&
    React.createElement(
      "div",
      { style: { fontSize: 12, color: C.textSub, fontStyle: "italic" } },
      PRIORITY_OPTIONS.find((p) => p.stars === hovered)?.label || "",
    ),
  );
};

const DateTimePickerLegacy = ({
  value,
  onChange,
  minValue,
  placeholder = tr("Select date & time"),
}) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("date");
  const parsed = value ? new Date(value) : null;
  const [display, setDisplay] = useState(() => {
    if (parsed) return { y: parsed.getFullYear(), m: parsed.getMonth() };
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() };
  });
  const [selDate, setSelDate] = useState(() =>
    parsed
      ? { y: parsed.getFullYear(), mo: parsed.getMonth(), d: parsed.getDate() }
      : null,
  );
  const [selTime, setSelTime] = useState(() =>
    parsed
      ? { h: parsed.getHours(), mi: parsed.getMinutes() }
      : { h: 9, mi: 0 },
  );

  useEffect(() => {
    if (!value) {
      setSelDate(null);
      setSelTime({ h: 9, mi: 0 });
      return;
    }
    const d = new Date(value);
    setSelDate({ y: d.getFullYear(), mo: d.getMonth(), d: d.getDate() });
    setSelTime({ h: d.getHours(), mi: d.getMinutes() });
    setDisplay({ y: d.getFullYear(), m: d.getMonth() });
  }, [value]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minD = minValue ? new Date(minValue) : null;
  const MONTHS = [
    tr("January"),
    tr("February"),
    tr("March"),
    tr("April"),
    tr("May"),
    tr("June"),
    tr("July"),
    tr("August"),
    tr("September"),
    tr("October"),
    tr("November"),
    tr("December"),
  ];
  const DAYS = [tr("Su"), tr("Mo"), tr("Tu"), tr("We"), tr("Th"), tr("Fr"), tr("Sa")];
  const first = new Date(display.y, display.m, 1).getDay();
  const daysIn = new Date(display.y, display.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const commit = (sd, st) => {
    if (!sd) return;
    onChange(new Date(sd.y, sd.mo, sd.d, st.h, st.mi, 0, 0).toISOString());
  };
  const handleDayClick = (day) => {
    const nd = { y: display.y, mo: display.m, d: day };
    setSelDate(nd);
    commit(nd, selTime);
    setTab("time");
  };
  const handleTimeChange = (field, val) => {
    const nt = { ...selTime, [field]: val };
    setSelTime(nt);
    if (selDate) commit(selDate, nt);
  };
  const handleNow = () => {
    const n = new Date();
    const nd = { y: n.getFullYear(), mo: n.getMonth(), d: n.getDate() };
    const nt = { h: n.getHours(), mi: Math.floor(n.getMinutes() / 5) * 5 };
    setSelDate(nd);
    setSelTime(nt);
    setDisplay({ y: nd.y, m: nd.mo });
    commit(nd, nt);
  };
  const handleClear = () => {
    onChange("");
    setOpen(false);
    setSelDate(null);
    setSelTime({ h: 9, mi: 0 });
  };
  const handleConfirm = () => {
    if (selDate) {
      commit(selDate, selTime);
      setOpen(false);
    }
  };
  const isDisabled = (day) => {
    if (!minD) return false;
    const d = new Date(display.y, display.m, day);
    d.setHours(0, 0, 0, 0);
    const md = new Date(minD);
    md.setHours(0, 0, 0, 0);
    return d < md;
  };
  const isSel = (day) =>
    selDate &&
    selDate.y === display.y &&
    selDate.mo === display.m &&
    selDate.d === day;
  const isToday = (day) => {
    const d = new Date(display.y, display.m, day);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  return React.createElement(
    "div",
    { style: { position: "relative" } },
    open &&
    React.createElement("div", {
      onClick: () => setOpen(false),
      style: { position: "fixed", inset: 0, zIndex: 998 },
    }),
    React.createElement(
      "div",
      {
        onClick: () => setOpen((o) => !o),
        style: {
          ...inp(),
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          userSelect: "none",
          borderColor: open ? C.borderFocus : C.border,
        },
      },
      React.createElement(
        "span",
        { style: { color: value ? C.text : C.textSub, fontSize: 13.5 } },
        value ? fmtDateTime(value) : placeholder,
      ),
      React.createElement(
        "span",
        { style: { fontSize: 14, color: C.textSub } },
        "🗓",
      ),
    ),
    open &&
    React.createElement(
      "div",
      {
        onClick: (e) => e.stopPropagation(),
        style: {
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          zIndex: 9999,
          background: "#fff",
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
          width: 320,
          overflow: "hidden",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            borderBottom: `1px solid ${C.border}`,
            background: C.bgSection,
          },
        },
        [
          { key: "date", icon: "📅", label: tr("Date") },
          { key: "time", icon: "🕐", label: tr("Time") },
        ].map((t) =>
          React.createElement(
            "div",
            {
              key: t.key,
              onClick: () => setTab(t.key),
              style: {
                flex: 1,
                padding: "10px 0",
                textAlign: "center",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: tab === t.key ? 700 : 400,
                color: tab === t.key ? C.primary : C.textSub,
                borderBottom:
                  tab === t.key
                    ? `2px solid ${C.primary}`
                    : "2px solid transparent",
                fontFamily: FONT,
                userSelect: "none",
              },
            },
            `${t.icon} ${t.label}`,
          ),
        ),
      ),
      tab === "date" &&
      React.createElement(
        "div",
        { style: { padding: "14px 14px 10px" } },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            },
          },
          React.createElement(
            "button",
            {
              onClick: () =>
                setDisplay((p) =>
                  p.m === 0
                    ? { y: p.y - 1, m: 11 }
                    : { y: p.y, m: p.m - 1 },
                ),
              style: {
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: 16,
                color: C.textSub,
                padding: "2px 8px",
              },
            },
            "‹",
          ),
          React.createElement(
            "span",
            {
              style: { fontFamily: FONT, fontWeight: 600, fontSize: 13.5 },
            },
            `${MONTHS[display.m]} ${display.y}`,
          ),
          React.createElement(
            "button",
            {
              onClick: () =>
                setDisplay((p) =>
                  p.m === 11
                    ? { y: p.y + 1, m: 0 }
                    : { y: p.y, m: p.m + 1 },
                ),
              style: {
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: 16,
                color: C.textSub,
                padding: "2px 8px",
              },
            },
            "›",
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(7,1fr)",
              gap: 2,
              marginBottom: 4,
            },
          },
          ...DAYS.map((d) =>
            React.createElement(
              "div",
              {
                key: d,
                style: {
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.textSub,
                },
              },
              d,
            ),
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(7,1fr)",
              gap: 2,
            },
          },
          ...cells.map((day, i) => {
            if (!day) return React.createElement("div", { key: `e${i}` });
            const dis = isDisabled(day),
              sel = isSel(day),
              tod = isToday(day);
            return React.createElement(
              "div",
              {
                key: day,
                onClick: () => !dis && handleDayClick(day),
                style: {
                  textAlign: "center",
                  padding: "6px 0",
                  borderRadius: 6,
                  fontSize: 13.5,
                  fontFamily: FONT,
                  cursor: dis ? "not-allowed" : "pointer",
                  fontWeight: tod ? 600 : 400,
                  color: dis
                    ? "#d1d5db"
                    : sel
                      ? "#fff"
                      : tod
                        ? C.primary
                        : C.text,
                  background: sel
                    ? C.primary
                    : tod && !sel
                      ? C.bgHighlight
                      : "transparent",
                },
              },
              day,
            );
          }),
        ),
        React.createElement(
          "div",
          { style: { marginTop: 10, display: "flex", gap: 8 } },
          React.createElement(
            "div",
            {
              onClick: handleNow,
              style: {
                flex: 1,
                padding: "6px 0",
                textAlign: "center",
                background: C.bgHighlight,
                color: C.primary,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: FONT,
              },
            },
            tr("⚡ Now"),
          ),
          selDate &&
          React.createElement(
            "div",
            {
              onClick: () => setTab("time"),
              style: {
                flex: 1,
                padding: "6px 0",
                textAlign: "center",
                background: "#f0fdf4",
                color: C.success,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: FONT,
              },
            },
            tr("→ Pick Time"),
          ),
        ),
      ),
      tab === "time" &&
      React.createElement(
        "div",
        { style: { padding: "14px" } },
        selDate
          ? React.createElement(
            "div",
            {
              style: {
                padding: "8px 12px",
                background: C.bgHighlight,
                borderRadius: 7,
                marginBottom: 12,
                fontSize: 13,
                color: C.primary,
                fontWeight: 600,
                fontFamily: FONT,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              },
            },
            React.createElement(
              "span",
              null,
              `📅 ${pad(selDate.d)}/${pad(selDate.mo + 1)}/${selDate.y}`,
            ),
            React.createElement(
              "span",
              {
                onClick: () => setTab("date"),
                style: {
                  fontSize: 11.5,
                  color: C.textSub,
                  cursor: "pointer",
                  fontWeight: 400,
                },
              },
              tr("← Change date"),
            ),
          )
          : React.createElement(
            "div",
            {
              style: {
                padding: "8px 12px",
                background: "#fefce8",
                borderRadius: 7,
                marginBottom: 12,
                fontSize: 12.5,
                color: C.warning,
                fontFamily: FONT,
              },
            },
            tr("⚠ Please select a date first"),
          ),
        React.createElement(
          "div",
          { style: { textAlign: "center", marginBottom: 14 } },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 36,
                fontWeight: 700,
                fontFamily: FONT_MONO,
                color: C.text,
                letterSpacing: 2,
              },
            },
            `${pad(selTime.h)}:${pad(selTime.mi)}`,
          ),
          React.createElement(
            "div",
            { style: { fontSize: 11.5, color: C.textSub, marginTop: 2 } },
            tr("Hour : Minute"),
          ),
        ),
        React.createElement(
          "div",
          { style: { marginBottom: 12 } },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 11.5,
                fontWeight: 600,
                color: C.textLabel,
                marginBottom: 6,
                fontFamily: FONT,
              },
            },
            tr("Hour"),
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(6,1fr)",
                gap: 4,
              },
            },
            HOURS.map((h) =>
              React.createElement(
                "div",
                {
                  key: h,
                  onClick: () => handleTimeChange("h", h),
                  style: {
                    padding: "5px 0",
                    textAlign: "center",
                    borderRadius: 5,
                    cursor: "pointer",
                    fontSize: 12.5,
                    fontFamily: FONT_MONO,
                    fontWeight: selTime.h === h ? 700 : 400,
                    background: selTime.h === h ? C.primary : "#fff",
                    color: selTime.h === h ? "#fff" : C.text,
                    border: `1px solid ${selTime.h === h ? C.primary : C.border}`,
                  },
                },
                pad(h),
              ),
            ),
          ),
        ),
        React.createElement(
          "div",
          { style: { marginBottom: 14 } },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 11.5,
                fontWeight: 600,
                color: C.textLabel,
                marginBottom: 6,
                fontFamily: FONT,
              },
            },
            tr("Minute"),
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(6,1fr)",
                gap: 4,
              },
            },
            MINUTES.map((mi) =>
              React.createElement(
                "div",
                {
                  key: mi,
                  onClick: () => handleTimeChange("mi", mi),
                  style: {
                    padding: "5px 0",
                    textAlign: "center",
                    borderRadius: 5,
                    cursor: "pointer",
                    fontSize: 12.5,
                    fontFamily: FONT_MONO,
                    fontWeight: selTime.mi === mi ? 700 : 400,
                    background: selTime.mi === mi ? C.primary : "#fff",
                    color: selTime.mi === mi ? "#fff" : C.text,
                    border: `1px solid ${selTime.mi === mi ? C.primary : C.border}`,
                  },
                },
                pad(mi),
              ),
            ),
          ),
        ),
      ),
      React.createElement(
        "div",
        {
          style: {
            padding: "10px 14px",
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: C.bgSection,
          },
        },
        value
          ? React.createElement(
            "span",
            {
              onClick: handleClear,
              style: {
                fontSize: 12,
                color: C.danger,
                cursor: "pointer",
                fontFamily: FONT,
              },
            },
            tr("✕ Clear"),
          )
          : React.createElement("span", null),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 8 } },
          React.createElement(
            "div",
            {
              onClick: () => setOpen(false),
              style: {
                padding: "6px 14px",
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                cursor: "pointer",
                fontSize: 12.5,
                color: C.textSub,
                fontFamily: FONT,
              },
            },
            tr("Close"),
          ),
          selDate &&
          React.createElement(
            "div",
            {
              onClick: handleConfirm,
              style: {
                padding: "6px 16px",
                borderRadius: 6,
                background: C.primary,
                color: "#fff",
                cursor: "pointer",
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: FONT,
              },
            },
            tr("Confirm"),
          ),
        ),
      ),
    ),
  );
};

const toDateTimeLocalValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const fromDateTimeLocalValue = (value) =>
  value ? new Date(value).toISOString() : "";

const DateTimePicker = ({
  value,
  onChange,
  minValue,
  placeholder = tr("Select date & time"),
}) => {
  if (Input) {
    return React.createElement(Input, {
      type: "datetime-local",
      value: toDateTimeLocalValue(value),
      min: minValue ? toDateTimeLocalValue(minValue) : undefined,
      onChange: (e) => onChange(fromDateTimeLocalValue(e.target.value)),
      placeholder,
      style: { width: "100%" },
    });
  }
  return React.createElement(
    "div",
    {
      style: {
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 8,
        border: `1px solid ${C.border}`,
        borderRadius: 7,
        background: "#fff",
        padding: "0 10px",
        minHeight: 42,
        boxSizing: "border-box",
      },
    },
    React.createElement(
      "span",
      {
        style: {
          display: "inline-flex",
          alignItems: "center",
          color: C.textSub,
          flexShrink: 0,
        },
      },
      CalendarIcon,
    ),
    React.createElement("input", {
      type: "datetime-local",
      value: toDateTimeLocalValue(value),
      min: minValue ? toDateTimeLocalValue(minValue) : undefined,
      onChange: (e) => onChange(fromDateTimeLocalValue(e.target.value)),
      "aria-label": placeholder,
      style: {
        border: "none",
        outline: "none",
        background: "transparent",
        color: value ? C.text : C.textSub,
        fontFamily: FONT,
        fontSize: 13.5,
        lineHeight: "20px",
        width: "100%",
        minWidth: 0,
        padding: "9px 0",
      },
    }),
    value &&
      React.createElement(
        "button",
        {
          type: "button",
          onClick: () => onChange(""),
          title: tr("Clear"),
          style: {
            border: "none",
            background: "transparent",
            color: C.textSub,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            padding: 0,
            flexShrink: 0,
          },
        },
        XIcon,
      ),
  );
};

const ExpandableText = ({ text, limit = 80 }) => {
  const [expanded, setExpanded] = useState(false);
  if (!text)
    return React.createElement(
      "span",
      { style: { color: "#d1d5db", fontSize: 12 } },
      "—",
    );
  const isLong = text.length > limit;
  const shown = expanded || !isLong ? text : text.slice(0, limit) + "…";
  return React.createElement(
    "span",
    { style: { fontSize: 12.5, color: C.textSub, lineHeight: "18px" } },
    shown,
    isLong &&
    React.createElement(
      "span",
      {
        onClick: (e) => {
          e.stopPropagation();
          setExpanded((p) => !p);
        },
        style: {
          color: C.primary,
          cursor: "pointer",
          marginLeft: 4,
          fontWeight: 600,
          fontSize: 12,
          whiteSpace: "nowrap",
        },
      },
      expanded ? tr(" ▲ Collapse") : tr(" ▼ Show more"),
    ),
  );
};

const AutoTextarea = ({ value, onChange, placeholder, minRows = 3 }) => {
  if (Input?.TextArea) {
    return React.createElement(Input.TextArea, {
      value: value || "",
      onChange: (e) => onChange(e.target.value),
      placeholder,
      autoSize: { minRows, maxRows: 8 },
    });
  }
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = ref.current.scrollHeight + "px";
  }, [value]);
  return React.createElement("textarea", {
    ref,
    value: value || "",
    onChange: (e) => onChange(e.target.value),
    placeholder,
    rows: minRows,
    style: {
      ...inp(),
      resize: "none",
      overflow: "hidden",
      lineHeight: "22px",
      minHeight: minRows * 22 + 18,
    },
    onFocus,
    onBlur,
  });
};

const PriceInput = ({ value, onChange, currency, disabled = false }) => {
  const fmt = (v) => formatMoneyDraft(v, currency);
  const raw = (s) => parseMoneyDraft(s, currency);
  const [draft, setDraft] = useState(() => fmt(value));

  useEffect(() => {
    setDraft(fmt(value));
  }, [value, currency]);

  const handleChange = (inputValue) => {
    setDraft(inputValue);
    onChange(raw(inputValue));
  };

  const normalizeDraft = () => {
    setDraft(fmt(raw(draft)));
  };

  if (Input) {
    return React.createElement(Input, {
      value: draft,
      placeholder: "0",
      inputMode: getCurrencyDecimals(currency || neutralCurrencyObject()) > 0 ? "decimal" : "numeric",
      onChange: (e) => handleChange(e.target.value),
      onBlur: normalizeDraft,
      disabled,
      style: { width: "100%" },
      addonAfter: currency ? getCurrencyCode(currency) : tr("Currency"),
    });
  }

  return React.createElement("input", {
    type: "text",
    value: draft,
    placeholder: "0",
    inputMode: getCurrencyDecimals(currency || neutralCurrencyObject()) > 0 ? "decimal" : "numeric",
    disabled,
    onChange: (e) => handleChange(e.target.value),
    style: { ...inp(), textAlign: "right" },
    onFocus,
    onBlur: (e) => {
      normalizeDraft();
      onBlur(e);
    },
  });
};

const Avatar = ({ name, size = 28 }) =>
  React.createElement(
    "div",
    {
      style: {
        width: size,
        height: size,
        borderRadius: "50%",
        background: avatarBg(name),
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.floor(size * 0.34),
        fontWeight: 700,
        fontFamily: FONT,
        flexShrink: 0,
        userSelect: "none",
      },
    },
    getInitials(name),
  );

const LawyerTypeBadge = ({ type }) => {
  const cfg = LAWYER_TYPE_GROUPS.find(
    (g) => g.key === (type || "").toLowerCase(),
  ) || { color: C.textSub, bg: "#f3f4f6" };
  if (!type) return null;
  return React.createElement(
    "span",
    {
      style: {
        fontSize: 10.5,
        background: cfg.bg,
        color: cfg.color,
        padding: "2px 7px",
        borderRadius: 10,
        fontWeight: 600,
        border: `1px solid ${cfg.color}22`,
        flexShrink: 0,
      },
    },
    type,
  );
};

// Renders a "+" suffix icon inside the same bordered select box, right next
// to the clear/chevron icon, instead of a separate button floating outside it.
const renderInlineAddNew = (onAddNew, disabled, title = tr("Add new")) =>
  onAddNew &&
  React.createElement(
    React.Fragment,
    null,
    React.createElement("span", {
      style: {
        width: 1,
        alignSelf: "stretch",
        margin: "2px 0",
        background: C.border,
        flexShrink: 0,
      },
    }),
    React.createElement(
      "span",
      {
        onClick: (e) => {
          e.stopPropagation();
          if (!disabled) onAddNew();
        },
        title,
        style: {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: disabled ? "#d1d5db" : C.primary,
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1,
          flexShrink: 0,
          padding: "0 2px",
        },
      },
      "+",
    ),
  );

const PersonDropdown = ({
  items,
  value,
  onChange,
  placeholder,
  getItemName,
  getItemSub,
  currentItem,
  disabled,
  onAddNew,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);
  const filtered = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (l) =>
        getItemName(l).toLowerCase().includes(q) ||
        (getItemSub?.(l) || "").toLowerCase().includes(q),
    );
  }, [items, search]);
  const selected = useMemo(
    () => items.find((l) => String(l.id) === String(value)),
    [items, value],
  );
  const selName = selected ? getItemName(selected) : "";

  const dropdownNode = React.createElement(
    "div",
    { style: { position: "relative", zIndex: open ? 400 : "auto" } },
    open &&
    React.createElement("div", {
      onClick: () => setOpen(false),
      style: { position: "fixed", inset: 0, zIndex: 398 },
    }),
    React.createElement(
      "div",
      {
        onClick: () => {
          if (!disabled) setOpen((o) => !o);
        },
        style: {
          ...inp(),
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 9,
          userSelect: "none",
          borderColor: open ? C.borderFocus : C.border,
          background: disabled ? "#f3f4f6" : "#fff",
          minHeight: 40,
          padding: "6px 12px",
        },
      },
      selected
        ? React.createElement(
          React.Fragment,
          null,
          React.createElement(Avatar, { name: selName, size: 26 }),
          React.createElement(
            "div",
            { style: { flex: 1, minWidth: 0 } },
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: C.text,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                },
              },
              selName,
            ),
            getItemSub?.(selected) &&
            React.createElement(
              "div",
              { style: { fontSize: 11.5, color: C.textSub } },
              getItemSub(selected),
            ),
          ),
          React.createElement(
            "span",
            {
              onClick: (e) => {
                e.stopPropagation();
                onChange(null);
              },
              style: {
                color: C.danger,
                fontSize: 13,
                cursor: "pointer",
                padding: "2px 8px",
                borderRadius: 4,
                background: "#fef2f2",
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
              },
            },
            XIcon,
          ),
        )
        : React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            {
              style: {
                width: 26,
                height: 26,
                borderRadius: "50%",
                border: `2px dashed #d1d5db`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#d1d5db",
                fontSize: 16,
                flexShrink: 0,
              },
            },
            "+",
          ),
          React.createElement(
            "span",
            { style: { color: C.textSub, fontSize: 13.5, flex: 1 } },
            placeholder,
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 11,
                color: C.textSub,
                transform: open ? "rotate(180deg)" : "none",
                display: "inline-flex",
                alignItems: "center",
                transition: "transform 0.15s",
              },
            },
            ChevronDownIcon,
          ),
        ),
      renderInlineAddNew(onAddNew, disabled),
    ),
    open &&
    React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "#fff",
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          boxShadow: "0 12px 36px rgba(0,0,0,0.14)",
          overflow: "hidden",
          minWidth: 280,
        },
      },
      React.createElement(
        "div",
        {
          style: { padding: "10px 12px", borderBottom: `1px solid #f3f4f6` },
        },
        React.createElement(
          "div",
          { style: { position: "relative" } },
          React.createElement(
            "span",
            {
              style: {
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 13,
                color: C.textSub,
                pointerEvents: "none",
                display: "inline-flex",
                alignItems: "center",
              },
            },
            SearchIcon,
          ),
          React.createElement("input", {
            autoFocus: true,
            value: search,
            onChange: (e) => setSearch(e.target.value),
            placeholder: tr("Search..."),
            style: inp({ paddingLeft: 32, paddingTop: 7, paddingBottom: 7 }),
            onFocus,
            onBlur,
          }),
        ),
      ),

      React.createElement(
        "div",
        { style: { maxHeight: 260, overflowY: "auto" } },
        filtered.length === 0
          ? React.createElement(
            "div",
            {
              style: {
                padding: "32px 0",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 13,
              },
            },
            tr("No results found"),
          )
          : filtered.map((l, i) => {
            const lName = getItemName(l),
              lSub = getItemSub?.(l) || "",
              isSel = String(l.id) === String(value);
            return React.createElement(
              "div",
              {
                key: l.id,
                onClick: () => {
                  onChange(String(l.id));
                  setOpen(false);
                },
                style: {
                  padding: "9px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  background: isSel
                    ? C.bgHighlight
                    : i % 2 === 0
                      ? "#fff"
                      : "#fafafa",
                  borderBottom: `1px solid #f3f4f6`,
                },
              },
              React.createElement(Avatar, { name: lName, size: 28 }),
              React.createElement(
                "div",
                { style: { flex: 1, minWidth: 0 } },
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 13.5,
                      fontWeight: isSel ? 700 : 500,
                      color: C.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                  },
                  lName,
                ),
                lSub &&
                React.createElement(
                  "div",
                  { style: { fontSize: 11.5, color: C.textSub } },
                  lSub,
                ),
              ),
              isSel &&
              React.createElement(
                "span",
                {
                  style: {
                    color: C.primary,
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                  },
                },
                CheckIcon,
              ),
            );
          }),
      ),
      React.createElement(
        "div",
        {
          style: {
            padding: "7px 14px",
            background: C.bgSection,
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          },
        },
        React.createElement(
          "span",
          { style: { fontSize: 11.5, color: C.textSub } },
          tr("{0} results", { 0: filtered.length }),
        ),
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 10 } },
          onAddNew &&
          React.createElement(
            "span",
            {
              onClick: (e) => {
                e.stopPropagation();
                setOpen(false);
                onAddNew();
              },
              style: {
                border: `1px dashed ${C.primary}`,
                borderRadius: 5,
                background: "#fff",
                color: C.primary,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                lineHeight: "18px",
                padding: "2px 8px",
              },
            },
            tr("Add new"),
          ),
          value &&
          React.createElement(
            "span",
            {
              onClick: () => onChange(null),
              style: { fontSize: 11.5, color: C.danger, cursor: "pointer" },
            },
            tr("Deselect"),
          ),
        ),
      ),
    ),
  );

  return dropdownNode;
};

const RelatedSingleDropdown = ({
  items,
  value,
  onChange,
  placeholder,
  getItemLabel,
  getItemSub,
  disabled,
  onAddNew,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) => getItemLabel(i).toLowerCase().includes(q));
  }, [items, search]);
  const selected = useMemo(
    () => items.find((i) => String(i.id) === String(value)),
    [items, value],
  );

  const dropdownNode = React.createElement(
    "div",
    { style: { position: "relative", zIndex: open ? 400 : "auto" } },
    open &&
    React.createElement("div", {
      onClick: () => setOpen(false),
      style: { position: "fixed", inset: 0, zIndex: 398 },
    }),
    React.createElement(
      "div",
      {
        onClick: () => {
          if (!disabled) setOpen((o) => !o);
        },
        style: {
          ...inp(),
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          userSelect: "none",
          borderColor: open ? C.borderFocus : C.border,
          background: disabled ? "#f3f4f6" : "#fff",
          minHeight: 40,
          padding: "7px 12px",
        },
      },
      selected
        ? React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "span",
            {
              style: {
                flex: 1,
                fontSize: 13.5,
                color: C.text,
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            },
            getItemLabel(selected),
          ),
          React.createElement(
            "span",
            {
              onClick: (e) => {
                e.stopPropagation();
                onChange(null);
              },
              style: {
                color: C.danger,
                fontSize: 13,
                cursor: "pointer",
                padding: "2px 8px",
                borderRadius: 4,
                background: "#fef2f2",
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
              },
            },
            XIcon,
          ),
        )
        : React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "span",
            { style: { color: C.textSub, fontSize: 13.5, flex: 1 } },
            placeholder,
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 11,
                color: C.textSub,
                transform: open ? "rotate(180deg)" : "none",
                display: "inline-flex",
                alignItems: "center",
                transition: "transform 0.15s",
              },
            },
            ChevronDownIcon,
          ),
        ),
      renderInlineAddNew(onAddNew, disabled),
    ),
    open &&
    React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "#fff",
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          boxShadow: "0 12px 36px rgba(0,0,0,0.16)",
          overflow: "hidden",
        },
      },
      React.createElement(
        "div",
        {
          style: { padding: "10px 12px", borderBottom: `1px solid #f3f4f6` },
        },
        React.createElement(
          "div",
          { style: { position: "relative" } },
          React.createElement(
            "span",
            {
              style: {
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 13,
                color: C.textSub,
                pointerEvents: "none",
                display: "inline-flex",
                alignItems: "center",
              },
            },
            SearchIcon,
          ),
          React.createElement("input", {
            autoFocus: true,
            value: search,
            onChange: (e) => setSearch(e.target.value),
            placeholder: tr("Search..."),
            style: inp({ paddingLeft: 32, paddingTop: 7, paddingBottom: 7 }),
            onFocus,
            onBlur,
          }),
        ),
      ),
      React.createElement(
        "div",
        { style: { maxHeight: 240, overflowY: "auto" } },
        filtered.length === 0
          ? React.createElement(
            "div",
            {
              style: {
                padding: "28px 0",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 13,
              },
            },
            tr("No results found"),
          )
          : filtered.map((item, i) => {
            const isSel = String(item.id) === String(value),
              sub = getItemSub?.(item) || "";
            return React.createElement(
              "div",
              {
                key: item.id,
                onClick: () => {
                  onChange(String(item.id));
                  setOpen(false);
                },
                style: {
                  padding: "9px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  background: isSel
                    ? C.bgHighlight
                    : i % 2 === 0
                      ? "#fff"
                      : "#fafafa",
                  borderBottom: `1px solid #f3f4f6`,
                },
              },
              React.createElement(
                "div",
                { style: { flex: 1, minWidth: 0 } },
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 13.5,
                      fontWeight: isSel ? 600 : 400,
                      color: C.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                  },
                  getItemLabel(item),
                ),
                sub &&
                React.createElement(
                  "div",
                  { style: { fontSize: 11.5, color: C.textSub } },
                  sub,
                ),
              ),
              isSel &&
              React.createElement(
                "span",
                {
                  style: {
                    color: C.primary,
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                  },
                },
                CheckIcon,
              ),
            );
          }),
      ),
      React.createElement(
        "div",
        {
          style: {
            padding: "7px 14px",
            background: C.bgSection,
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          },
        },
        React.createElement(
          "span",
          { style: { fontSize: 11.5, color: C.textSub } },
          tr("{0} results", { 0: filtered.length }),
        ),
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 10 } },
          onAddNew &&
          React.createElement(
            "span",
            {
              onClick: (e) => {
                e.stopPropagation();
                setOpen(false);
                onAddNew();
              },
              style: {
                border: `1px dashed ${C.primary}`,
                borderRadius: 5,
                background: "#fff",
                color: C.primary,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                lineHeight: "18px",
                padding: "2px 8px",
              },
            },
            tr("Add new"),
          ),
          value &&
          React.createElement(
            "span",
            {
              onClick: () => onChange(null),
              style: { fontSize: 11.5, color: C.danger, cursor: "pointer" },
            },
            tr("Deselect"),
          ),
        ),
      ),
    ),
  );

  return dropdownNode;
};

const MultiPersonDropdown = ({
  items,
  value = [],
  onChange,
  placeholder,
  getItemName,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const filtered = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (l) =>
        getItemName(l).toLowerCase().includes(q) ||
        (l.lawyerType || "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const groups = useMemo(() => {
    if (search.trim()) return null;
    const sorted = [...items].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );
    const buckets = {};
    LAWYER_TYPE_GROUPS.forEach((g) => {
      buckets[g.key] = [];
    });
    buckets["__other__"] = [];
    sorted.forEach((l) => {
      const k = (l.lawyerType || "").toLowerCase().trim();
      if (buckets[k] !== undefined) buckets[k].push(l);
      else buckets["__other__"].push(l);
    });
    const result = LAWYER_TYPE_GROUPS.filter(
      (g) => buckets[g.key].length > 0,
    ).map((g) => ({ ...g, items: buckets[g.key] }));
    if (buckets["__other__"].length > 0)
      result.push({
        key: "__other__",
        label: tr("Other"),
        color: C.textSub,
        bg: "#f3f4f6",
        items: buckets["__other__"],
      });
    return result;
  }, [items, search]);

  const selectedItems = useMemo(
    () => items.filter((l) => value.includes(String(l.id))),
    [items, value],
  );
  const toggle = (id) => {
    const s = String(id);
    onChange(value.includes(s) ? value.filter((v) => v !== s) : [...value, s]);
  };

  const renderItem = (l, i) => {
    const lName = getItemName(l);
    const isSel = value.includes(String(l.id));
    const typeCfg = LAWYER_TYPE_GROUPS.find(
      (g) => g.key === (l.lawyerType || "").toLowerCase(),
    );
    return React.createElement(
      "div",
      {
        key: l.id,
        onClick: () => toggle(l.id),
        style: {
          padding: "9px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          background: isSel ? C.bgHighlight : i % 2 === 0 ? "#fff" : "#fafafa",
          borderBottom: `1px solid #f3f4f6`,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            width: 17,
            height: 17,
            borderRadius: 4,
            border: `2px solid ${isSel ? C.primary : C.border}`,
            background: isSel ? C.primary : "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          },
        },
        isSel &&
        React.createElement(
          "span",
          {
            style: {
              color: "#fff",
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
            },
          },
          CheckIcon,
        ),
      ),
      React.createElement(Avatar, { name: lName, size: 26 }),
      React.createElement(
        "div",
        { style: { flex: 1, minWidth: 0 } },
        React.createElement(
          "span",
          {
            style: {
              fontSize: 13.5,
              fontWeight: isSel ? 600 : 400,
              color: C.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "block",
            },
          },
          lName,
        ),
      ),
      !groups &&
      typeCfg &&
      React.createElement(LawyerTypeBadge, { type: l.lawyerType }),
    );
  };

  const renderGroupHeader = (g) => {
    const allSel = g.items.every((l) => value.includes(String(l.id)));
    const selCount = g.items.filter((l) => value.includes(String(l.id))).length;
    return React.createElement(
      "div",
      {
        key: `gh-${g.key}`,
        style: {
          padding: "6px 14px 5px",
          background: g.bg,
          borderBottom: `1px solid ${g.color}22`,
          borderTop: `1px solid ${g.color}22`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 1,
        },
      },
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8 } },
        React.createElement("div", {
          style: {
            width: 3,
            height: 14,
            borderRadius: 2,
            background: g.color,
            flexShrink: 0,
          },
        }),
        React.createElement(
          "span",
          {
            style: {
              fontSize: 12,
              fontWeight: 700,
              color: g.color,
              fontFamily: FONT,
              letterSpacing: 0,
            },
          },
          g.label,
        ),
        React.createElement(
          "span",
          { style: { fontSize: 11, color: g.color, opacity: 0.7 } },
          tr("{0} people", { 0: g.items.length }),
        ),
        selCount > 0 &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 11,
              background: g.color,
              color: "#fff",
              padding: "1px 7px",
              borderRadius: 10,
              fontWeight: 700,
            },
          },
          selCount,
        ),
      ),
      React.createElement(
        "span",
        {
          onClick: (e) => {
            e.stopPropagation();
            const ids = g.items.map((l) => String(l.id));
            onChange(
              allSel
                ? value.filter((v) => !ids.includes(v))
                : [...new Set([...value, ...ids])],
            );
          },
          style: {
            fontSize: 11.5,
            color: allSel ? C.danger : g.color,
            cursor: "pointer",
            fontWeight: 600,
            padding: "2px 10px",
            borderRadius: 4,
            background: "rgba(255,255,255,0.7)",
            border: `1px solid ${allSel ? C.danger : g.color}44`,
          },
        },
        allSel ? tr("Deselect group") : tr("+ Select group"),
      ),
    );
  };

  return React.createElement(
    "div",
    { style: { position: "relative", zIndex: open ? 400 : "auto" } },
    open &&
    React.createElement("div", {
      onClick: () => setOpen(false),
      style: { position: "fixed", inset: 0, zIndex: 398 },
    }),
    React.createElement(
      "div",
      {
        onClick: () => setOpen((o) => !o),
        style: {
          ...inp(),
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 5,
          minHeight: 40,
          padding: "5px 10px",
          borderColor: open ? C.borderFocus : C.border,
        },
      },
      selectedItems.length === 0
        ? React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            {
              style: {
                width: 26,
                height: 26,
                borderRadius: "50%",
                border: `2px dashed #d1d5db`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#d1d5db",
                fontSize: 16,
                flexShrink: 0,
              },
            },
            "+",
          ),
          React.createElement(
            "span",
            { style: { color: C.textSub, fontSize: 13.5, flex: 1 } },
            placeholder,
          ),
        )
        : selectedItems.map((item) => {
          const name = getItemName(item);
          const typeCfg = LAWYER_TYPE_GROUPS.find(
            (g) => g.key === (item.lawyerType || "").toLowerCase(),
          );
          return React.createElement(
            "span",
            {
              key: item.id,
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: typeCfg ? typeCfg.bg : C.bgHighlight,
                border: `1px solid ${typeCfg ? typeCfg.color + "44" : C.borderHighlight}`,
                borderRadius: 5,
                padding: "2px 6px 2px 4px",
                fontSize: 12.5,
                color: typeCfg ? typeCfg.color : C.primary,
                fontWeight: 500,
              },
            },
            React.createElement(Avatar, { name, size: 18 }),
            React.createElement("span", null, name),
            React.createElement(
              "span",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  toggle(item.id);
                },
                style: {
                  cursor: "pointer",
                  color: C.danger,
                  fontWeight: 700,
                  fontSize: 13,
                  lineHeight: 1,
                  marginLeft: 1,
                  display: "inline-flex",
                  alignItems: "center",
                },
              },
              XIcon,
            ),
          );
        }),
      React.createElement(
        "span",
        {
          style: {
            marginLeft: "auto",
            fontSize: 11,
            color: C.textSub,
            transform: open ? "rotate(180deg)" : "none",
            display: "inline-flex",
            alignItems: "center",
            transition: "transform 0.15s",
            flexShrink: 0,
          },
        },
        ChevronDownIcon,
      ),
    ),
    open &&
    React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "#fff",
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          boxShadow: "0 12px 36px rgba(0,0,0,0.14)",
          overflow: "hidden",
        },
      },
      React.createElement(
        "div",
        {
          style: { padding: "10px 12px", borderBottom: `1px solid #f3f4f6` },
        },
        React.createElement(
          "div",
          { style: { position: "relative" } },
          React.createElement(
            "span",
            {
              style: {
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 13,
                color: C.textSub,
                pointerEvents: "none",
                display: "inline-flex",
                alignItems: "center",
              },
            },
            SearchIcon,
          ),
          React.createElement("input", {
            autoFocus: true,
            value: search,
            onChange: (e) => setSearch(e.target.value),
            placeholder: tr("Search by name, lawyer type..."),
            style: inp({ paddingLeft: 32, paddingTop: 7, paddingBottom: 7 }),
            onFocus,
            onBlur,
          }),
        ),
      ),
      React.createElement(
        "div",
        { style: { maxHeight: 320, overflowY: "auto" } },
        filtered.length === 0
          ? React.createElement(
            "div",
            {
              style: {
                padding: "28px 0",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 13,
              },
            },
            tr("No results found"),
          )
          : groups
            ? groups.map((g, gi) =>
              React.createElement(
                React.Fragment,
                { key: g.key },
                renderGroupHeader(g),
                g.items.map((l, i) => renderItem(l, i)),
              ),
            )
            : filtered.map((l, i) => renderItem(l, i)),
      ),
      React.createElement(
        "div",
        {
          style: {
            padding: "7px 14px",
            background: C.bgSection,
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          },
        },
        React.createElement(
          "span",
          { style: { fontSize: 11.5, color: C.textSub } },
          tr("{0} selected · {1} total", { 0: value.length, 1: items.length }),
        ),
        value.length > 0 &&
        React.createElement(
          "span",
          {
            onClick: () => onChange([]),
            style: { fontSize: 11.5, color: C.danger, cursor: "pointer" },
          },
          tr("Deselect all"),
        ),
      ),
    ),
  );
};

const normalizeTaskText = (value) => String(value || "").trim();
const normalizeTaskLookup = (value) => normalizeTaskText(value).toLowerCase();
// Diacritic-insensitive name matching (copied from ContractCreateForm.js,
// already reused this session for TaskManagement.js/CaseServices.js's own
// save-to-catalog dedup checks) — two names differing only by Vietnamese
// diacritics or extra whitespace should still count as the same service.
const normalizeSearch = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const serviceNameKey = (value) =>
  normalizeSearch(value).replace(/\s+/g, " ").trim();
const extractAllIds = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(runtimeExtractId).filter(Boolean).map(String);
  }
  const id = runtimeExtractId(value);
  return id ? [String(id)] : [];
};
const uniqueTaskTemplates = (items = []) => {
  const seen = new Set();
  return (items || []).filter((item, index) => {
    const key =
      runtimeExtractId(item?.id) ||
      item?._id ||
      `${getTaskTemplateTitle(item)}::${getTaskTemplateDescription(item)}::${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const getTaskTemplateRawTitle = (item) =>
  normalizeTaskText(
    item?.templateName ||
    item?.title ||
    item?.taskTitle ||
    item?.taskName ||
    item?.name ||
    item?.subject,
  );
const getTaskTemplateTitle = (item) =>
  getTaskTemplateRawTitle(item) || tr("Untitled task");
const getTaskTemplateDescription = (item) =>
  normalizeTaskText(
    item?.description ||
    item?.content ||
    item?.note ||
    item?.notes ||
    item?.taskDescription ||
    item?.scope,
  );
const getTaskTemplateSortOrder = (item, fallback = 0) => {
  const order = parseInt(item?.sortOrder ?? item?.order ?? item?.sequence, 10);
  return Number.isFinite(order) ? order : fallback;
};
const sortTaskTemplates = (items = []) =>
  uniqueTaskTemplates(items).sort((a, b) => {
    const aOrder = getTaskTemplateSortOrder(a, 9999);
    const bOrder = getTaskTemplateSortOrder(b, 9999);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return getTaskTemplateTitle(a).localeCompare(getTaskTemplateTitle(b));
  });
const getTaskTemplateServiceIds = (item) =>
  [
    item?.serviceId,
    item?.ServiceId,
    item?.service,
    item?.services,
    item?.companyServiceId,
    item?.companyService,
    item?.companyServices,
    item?.projectServiceId,
    item?.projectService,
    item?.projectServices,
  ].flatMap(extractAllIds);
const getServiceLookupIds = (service) =>
  [
    service?.id,
    service?.serviceId,
    service?.ServiceId,
    service?.service,
    service?.services,
    service?._companyServiceId,
    service?.companyServiceId,
    service?.companyService,
    service?.companyServices,
  ].flatMap(extractAllIds);
const getTemplateServiceName = (item) =>
  normalizeTaskLookup(
    item?.serviceName ||
    item?.service?.serviceName ||
    item?.services?.serviceName ||
    item?.companyService?.serviceName ||
    item?.companyServices?.serviceName,
  );
const getServiceLookupName = (service) =>
  normalizeTaskLookup(
    service?.serviceName ||
    service?.service?.serviceName ||
    service?.services?.serviceName ||
    service?.name,
  );
const getServiceTaskTemplates = (taskTemplates = [], service = {}) => {
  const serviceIds = new Set(getServiceLookupIds(service));
  const serviceName = getServiceLookupName(service);
  return sortTaskTemplates(
    (taskTemplates || []).filter((item) => {
      const templateIds = getTaskTemplateServiceIds(item);
      if (templateIds.some((id) => serviceIds.has(String(id)))) return true;
      const templateServiceName = getTemplateServiceName(item);
      return !!templateServiceName && !!serviceName && templateServiceName === serviceName;
    }),
  );
};
// Shared by addRowFromService/applyCombo/applyAdhocCombo — matches a
// candidate service (by catalog serviceId first, else by case-insensitive
// name) against every row already on the case, regardless of whether that
// row came from an individual pick, a custom-created service, a related
// contract/quotation, or an already-applied combo — a service should only
// ever appear once on a Case no matter which entry point added it.
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
const createCustomTaskDraft = () => ({
  _id: Date.now() + Math.random(),
  title: "",
  description: "",
});
const normalizeCustomTaskTemplates = (tasks = []) =>
  (tasks || [])
    .map((task) => ({
      _id: task?._id || Date.now() + Math.random(),
      title: normalizeTaskText(task?.title || task?.templateName || task?.taskName || task?.name),
      description: normalizeTaskText(task?.description || task?.note),
      _customDraft: true,
    }))
    .filter((task) => task.title || task.description)
    .map((task) => ({
      ...task,
      title: task.title || tr("Custom task"),
    }));
const getRowTaskTemplates = (taskTemplates = [], row = {}) => {
  const customTasks = normalizeCustomTaskTemplates(row?._customTaskTemplates || row?.taskTemplates);
  if (customTasks.length) return customTasks;
  if (row?._templateTasks?.length) return sortTaskTemplates(row._templateTasks);
  return getServiceTaskTemplates(taskTemplates, row);
};
const TaskTemplatePreview = ({
  tasks,
  compact = false,
  max = 4,
  emptyText = tr("No sample tasks configured"),
}) => {
  const visible = sortTaskTemplates(tasks || []).slice(0, max);
  const remaining = Math.max((tasks || []).length - visible.length, 0);
  if (!visible.length) {
    return React.createElement(
      "div",
      {
        style: {
          border: `1px dashed ${C.border}`,
          background: C.bgSection,
          borderRadius: 8,
          padding: compact ? "7px 9px" : "11px 12px",
          color: C.textSub,
          fontSize: compact ? 11.5 : 12.5,
          fontFamily: FONT,
        },
      },
      emptyText,
    );
  }
  return React.createElement(
    "div",
    {
      style: {
        display: "grid",
        gap: compact ? 5 : 8,
        fontFamily: FONT,
      },
    },
    visible.map((task, index) => {
      const title = getTaskTemplateTitle(task);
      const description = getTaskTemplateDescription(task);
      return React.createElement(
        "div",
        {
          key: task?._id || task?.id || `${title}-${index}`,
          style: {
            border: `1px solid ${C.border}`,
            background: "#fff",
            borderRadius: 6,
            padding: compact ? "6px 8px" : "8px 10px",
            display: "grid",
            gridTemplateColumns: compact ? "18px minmax(0, 1fr)" : "22px minmax(0, 1fr)",
            gap: compact ? 6 : 8,
            alignItems: "start",
          },
        },
        React.createElement(
          "span",
          {
            style: {
              width: compact ? 18 : 22,
              height: compact ? 18 : 22,
              borderRadius: 999,
              background: C.bgSection,
              color: C.textSub,
              fontSize: compact ? 10.5 : 11.5,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              lineHeight: 1,
            },
          },
          index + 1,
        ),
        React.createElement(
          "div",
          { style: { minWidth: 0 } },
          React.createElement(
            "div",
            {
              title,
              style: {
                color: C.text,
                fontSize: compact ? 12.5 : 13,
                fontWeight: 500,
                lineHeight: compact ? "17px" : "19px",
                whiteSpace: "normal",
                overflowWrap: "anywhere",
              },
            },
            title,
          ),
          !compact &&
          description &&
          React.createElement(
            "div",
            {
              title: description,
              style: {
                color: C.textSub,
                fontSize: 12,
                lineHeight: "18px",
                marginTop: 3,
                whiteSpace: "normal",
                overflowWrap: "anywhere",
              },
            },
            description,
          ),
        ),
      );
    }),
    remaining > 0 &&
    React.createElement(
      "div",
      {
        style: {
          color: C.textSub,
          fontSize: compact ? 11 : 12,
          paddingLeft: compact ? 24 : 30,
        },
      },
      tr("+{0} more tasks", { 0: remaining }),
    ),
  );
};

const ServicePickerModal = ({
  svcOpts,
  selectedIds,
  onSelect,
  onClose,
  internalCompanyId,
  onCreateAndSelect,
  taskTemplates,
  setTaskTemplates,
  currency,
  currencies = [],
  combos = [],
  onApplyCombo,
  onApplyAdhocCombo,
  comboScopeId = null,
  comboTargets = [],
  comboTarget = null,
  onComboTargetChange,
  convertComboAmountToVndSync,
  vndCurrency,
}) => {
  // "individual" = pick/create a single catalog or custom service (existing
  // flow, unchanged). "combo" = pick an existing serviceCombos template or
  // build a one-off ad-hoc bundle — only ever surfaced in package pricing
  // mode, mirroring the gating the old standalone combo Select used.
  const [mode, setMode] = useState("individual");
  const [tab, setTab] = useState("list");
  const [comboTab, setComboTab] = useState("select");
  const [comboSearch, setComboSearch] = useState("");
  const [comboName, setComboName] = useState("");
  const [comboType, setComboType] = useState("");
  const [comboSubTotal, setComboSubTotal] = useState(0);
  const [comboCurrencyId, setComboCurrencyId] = useState(
    extractCurrencyId(currency) ? String(extractCurrencyId(currency)) : "",
  );
  const [comboVatRate, setComboVatRate] = useState(0);
  const [comboItems, setComboItems] = useState([]);
  const [comboSaveToCatalog, setComboSaveToCatalog] = useState(false);
  const [comboItemPick, setComboItemPick] = useState(undefined);
  const [comboExpandedTaskItemId, setComboExpandedTaskItemId] = useState(null);
  const [comboErrors, setComboErrors] = useState({});
  const [comboApplying, setComboApplying] = useState(false);
  const [search, setSearch] = useState("");
  const [newSvc, setNewSvc] = useState({
    name: "",
    serviceType: "",
    description: "",
    basePrice: 0,
    currencyId: extractCurrencyId(currency) ? String(extractCurrencyId(currency)) : "",
    taskTemplates: [],
    saveToCatalog: false,
  });
  const [errors, setErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const selectedNewSvcCurrency =
    findCurrencyById(currencies, newSvc.currencyId) ||
    (extractCurrencyId(currency) ? currency : null);
  // Real-time duplicate check for the "Also save to the shared catalog"
  // checkbox below — same comparison openCatalogPrompt-style dedup checks
  // elsewhere use (serviceNameKey against svcOpts, the company-scoped list
  // this modal's own "Select from Catalog" tab already reads).
  const isNameAlreadyInCatalog =
    !!newSvc.name.trim() &&
    svcOpts.some((s) => serviceNameKey(s.serviceName) === serviceNameKey(newSvc.name));

  useEffect(() => {
    const defaultCurrencyId = extractCurrencyId(currency);
    if (!defaultCurrencyId) return;
    setNewSvc((prev) =>
      prev.currencyId ? prev : { ...prev, currencyId: String(defaultCurrencyId) },
    );
    setComboCurrencyId((prev) => (prev ? prev : String(defaultCurrencyId)));
  }, [currency]);

  const selectedComboCurrency =
    findCurrencyById(currencies, comboCurrencyId) ||
    (extractCurrencyId(currency) ? currency : null);

  const companyScopedSvcOpts = useMemo(
    () =>
      internalCompanyId
        ? svcOpts.filter(
          (s) =>
            isSameInternalCompany(s, internalCompanyId) || !getInternalCompanyId(s),
        )
        : svcOpts,
    [svcOpts, internalCompanyId],
  );
  const filtered = useMemo(() => {
    let list = companyScopedSvcOpts;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.serviceName || "").toLowerCase().includes(q) ||
          (s.serviceType || "").toLowerCase().includes(q) ||
          (s.currencyCode || extractCurrencyCode(s.currency) || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [companyScopedSvcOpts, search]);

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
      companyScopedSvcOpts.filter(
        (s) =>
          !comboItems.some(
            (it) => it.source === "catalog" && String(it.serviceId) === String(s.id),
          ),
      ),
    [companyScopedSvcOpts, comboItems],
  );

  const addComboCatalogItem = (svc) => {
    setComboItems((prev) => [
      ...prev,
      {
        _id: Date.now() + Math.random(),
        source: "catalog",
        serviceId: String(svc.id),
        serviceName: svc.serviceName || "",
        serviceType: svc.serviceType || "",
        description: svc.description || "",
        quantity: 1,
        basePrice: parseNum(svc.basePrice ?? svc.unitPrice ?? svc.price ?? 0),
        // Prefilled from this service's own catalog task templates so the
        // combo builder shows something useful immediately — the user can
        // still edit/remove/add on top, per row, before applying.
        taskTemplates: getServiceTaskTemplates(taskTemplates, svc).map((t, idx) => ({
          _id: Date.now() + Math.random() + idx,
          id: t.id,
          title: getTaskTemplateRawTitle(t),
          description: getTaskTemplateDescription(t),
          sortOrder: getTaskTemplateSortOrder(t, idx),
        })),
      },
    ]);
    setComboItemPick(undefined);
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
        taskTemplates: [],
      },
    ]);
    setComboErrors((p) => ({ ...p, items: "" }));
  };
  const updateComboItem = (itemId, field, value) => {
    setComboItems((prev) => prev.map((it) => (it._id === itemId ? { ...it, [field]: value } : it)));
  };
  const removeComboItem = (itemId) => {
    setComboItems((prev) => prev.filter((it) => it._id !== itemId));
    setComboExpandedTaskItemId((prev) => (prev === itemId ? null : prev));
  };
  // Catalog combo items only (real services.id) — every task template here
  // is a row in the SHARED projectTemplates catalog, so add/edit/remove
  // write straight to projectTemplates:create/update/destroy as soon as the
  // user acts, same as "Override" in Task Management. This is independent
  // of applying/submitting this combo — an edit made here sticks even if
  // the combo is never applied. setTaskTemplates keeps the cached template
  // list (shared with the individual add-service flow) in sync so a second
  // picker open in the same session sees the latest content.
  const addComboItemTask = async (item) => {
    const sortOrder = (item.taskTemplates || []).length;
    try {
      const res = await ctx.api.request({
        url: "projectTemplates:create",
        method: "POST",
        data: {
          templateName: "Untitled task",
          description: null,
          sortOrder,
          serviceId: parseInt(item.serviceId),
        },
      });
      const created = res?.data?.data;
      setComboItems((prev) =>
        prev.map((it) =>
          it._id !== item._id
            ? it
            : {
              ...it,
              taskTemplates: [
                ...(it.taskTemplates || []),
                {
                  _id: Date.now() + Math.random(),
                  id: created?.id,
                  title: created?.templateName || tr("Untitled task"),
                  description: "",
                  sortOrder,
                },
              ],
            },
        ),
      );
      setTaskTemplates((prev) => [...prev, created]);
    } catch (error) {
      console.error(error);
      message.error(tr("Could not add task template"));
    }
  };
  const updateComboItemTask = (itemId, taskId, field, value) => {
    setComboItems((prev) =>
      prev.map((it) =>
        it._id !== itemId
          ? it
          : {
            ...it,
            taskTemplates: (it.taskTemplates || []).map((t) =>
              t._id === taskId ? { ...t, [field]: value } : t,
            ),
          },
      ),
    );
  };
  const commitComboItemTaskEdit = async (task) => {
    const templateName = (task.title || "").trim() || tr("Untitled task");
    const description = task.description || null;
    try {
      await ctx.api.request({
        url: "projectTemplates:update",
        method: "POST",
        params: { filterByTk: task.id },
        data: { templateName, description },
      });
      setTaskTemplates((prev) =>
        prev.map((t) => (String(t.id) === String(task.id) ? { ...t, templateName, description } : t)),
      );
    } catch (error) {
      console.error(error);
      message.error(tr("Could not save task template"));
    }
  };
  const removeComboItemTask = (item, task) => {
    Modal.confirm({
      title: tr("Remove this task template?"),
      content: tr("\"{0}\" will be removed from this service's shared task list — this also affects other cases that use this service.", { 0: task.title || tr("Untitled task") }),
      okText: tr("Remove"),
      cancelText: tr("Cancel"),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await ctx.api.request({
            url: "projectTemplates:destroy",
            method: "POST",
            params: { filterByTk: task.id },
          });
          setComboItems((prev) =>
            prev.map((it) =>
              it._id !== item._id
                ? it
                : { ...it, taskTemplates: (it.taskTemplates || []).filter((t) => t._id !== task._id) },
            ),
          );
          setTaskTemplates((prev) => prev.filter((t) => String(t.id) !== String(task.id)));
        } catch (error) {
          console.error(error);
          message.error(tr("Could not remove task template"));
        }
      },
    });
  };
  // Custom (typed-name) combo items have no real serviceId yet, so their
  // task list stays local-only — no projectTemplates:create/update/destroy
  // here, unlike addComboItemTask/commitComboItemTaskEdit/removeComboItemTask
  // above (catalog items only). Carried over to real projectTemplates rows
  // later, only if "Also save to the shared catalog" is checked and the
  // case is actually submitted (CaseCreateForm.js's own handleSubmit tail).
  // updateComboItemTask (already defined above) is reused as-is for onChange
  // since it was already local-state-only regardless of item source.
  const addComboCustomItemTask = (itemId) => {
    setComboItems((prev) =>
      prev.map((it) =>
        it._id === itemId
          ? { ...it, taskTemplates: [...(it.taskTemplates || []), createCustomTaskDraft()] }
          : it,
      ),
    );
  };
  const removeComboCustomItemTask = (itemId, taskId) => {
    setComboItems((prev) =>
      prev.map((it) =>
        it._id !== itemId
          ? it
          : { ...it, taskTemplates: (it.taskTemplates || []).filter((t) => t._id !== taskId) },
      ),
    );
  };
  const handleApplyAdhocCombo = async () => {
    const errs = {};
    if (!comboName.trim()) errs.comboName = tr("Please enter a combo name");
    if (currencies.length && !extractCurrencyId(comboCurrencyId))
      errs.comboCurrencyId = tr("Please select a currency");
    if (!comboItems.length) {
      errs.items = tr("Please add at least 1 service to the combo");
    } else {
      const emptyNameItem = comboItems.find((it) => !String(it.serviceName || "").trim());
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
        packageSubTotal: comboSubTotal,
        packageVatRate: comboVatRate,
        currencyId: extractCurrencyId(comboCurrencyId) || extractCurrencyId(currency),
        serviceComboType: comboType.trim() || null,
        saveComboToCatalog: comboSaveToCatalog,
        items: comboItems.map((it) => ({
          serviceId: it.serviceId,
          serviceName: it.serviceName.trim(),
          serviceType: (it.serviceType || "").trim(),
          description: (it.description || "").trim(),
          quantity: it.quantity,
          price: parseNum(it.basePrice ?? it.price),
          vat: parseNum(it.vat),
          currencyId: extractCurrencyId(it.currencyId),
          taskTemplates: it.taskTemplates,
          // Driven entirely by the combo-level checkbox now — checking
          // "Also save this combo to the shared catalog" saves every
          // custom item in it, no separate per-item opt-in.
          saveToCatalog:
            comboSaveToCatalog &&
            !svcOpts.some((s) => serviceNameKey(s.serviceName) === serviceNameKey(it.serviceName)),
        })),
      });
      onClose();
    } finally {
      setComboApplying(false);
    }
  };

  const validate = () => {
    const e = {};
    if (!newSvc.name.trim()) e.name = tr("Please enter a service name");
    if (currencies.length && !extractCurrencyId(newSvc.currencyId))
      e.currencyId = tr("Please select a currency");
    setErrors(e);
    return !Object.keys(e).length;
  };
  const addCustomTask = () => {
    setNewSvc((prev) => ({
      ...prev,
      taskTemplates: [...(prev.taskTemplates || []), createCustomTaskDraft()],
    }));
  };
  const updateCustomTask = (taskId, field, value) => {
    setNewSvc((prev) => ({
      ...prev,
      taskTemplates: (prev.taskTemplates || []).map((task) =>
        task._id === taskId ? { ...task, [field]: value } : task,
      ),
    }));
  };
  const removeCustomTask = (taskId) => {
    setNewSvc((prev) => ({
      ...prev,
      taskTemplates: (prev.taskTemplates || []).filter((task) => task._id !== taskId),
    }));
  };
  const handleCreate = async () => {
    if (!validate()) return;
    setCreating(true);
    try {
      await onCreateAndSelect({
        serviceName: newSvc.name.trim(),
        serviceType: newSvc.serviceType.trim() || null,
        description: newSvc.description.trim() || null,
        basePrice: newSvc.basePrice || 0,
        currencyId: extractCurrencyId(newSvc.currencyId) || extractCurrencyId(currency),
        currency: selectedNewSvcCurrency,
        taskTemplates: normalizeCustomTaskTemplates(newSvc.taskTemplates),
        saveToCatalog: newSvc.saveToCatalog && !isNameAlreadyInCatalog,
      });
      onClose();
    } catch { }
    setCreating(false);
  };

  const thS = (ex = {}) => ({
    padding: "9px 14px",
    fontSize: 11.5,
    fontWeight: 600,
    color: C.textSub,
    background: C.bgSection,
    borderBottom: `2px solid ${C.border}`,
    textAlign: "left",
    whiteSpace: "nowrap",
    fontFamily: FONT,
    ...ex,
  });
  const tdS = (ex = {}) => ({
    padding: "9px 14px",
    fontSize: 13.5,
    borderBottom: `1px solid #f3f4f6`,
    verticalAlign: "top",
    fontFamily: FONT,
    ...ex,
  });
  const renderCustomTaskEditor = () =>
    React.createElement(
      "div",
      {
        style: {
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          background: "#fff",
          padding: 12,
          marginTop: 8,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 12,
          },
        },
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            {
              style: {
                fontSize: 14,
                fontWeight: 600,
                color: C.text,
                fontFamily: FONT,
              },
            },
            tr("Sample tasks for custom service"),
          ),
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                color: C.textSub,
                marginTop: 3,
                lineHeight: "18px",
                fontFamily: FONT,
              },
            },
            tr("Use this for non-standard services that do not have predefined task templates."),
          ),
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: addCustomTask,
            style: {
              border: `1px dashed ${C.primary}`,
              background: "#fff",
              color: C.primary,
              borderRadius: 6,
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 500,
              fontFamily: FONT,
              whiteSpace: "nowrap",
            },
          },
          tr("+ Add task"),
        ),
      ),
      (newSvc.taskTemplates || []).length === 0
        ? React.createElement(
          "div",
          {
            style: {
              border: `1px dashed ${C.border}`,
              background: C.bgSection,
              borderRadius: 6,
              padding: "12px 14px",
              color: C.textSub,
              fontSize: 12.5,
              fontFamily: FONT,
            },
          },
          tr("No custom sample tasks yet."),
        )
        : React.createElement(
          "div",
          { style: { display: "grid", gap: 10 } },
          (newSvc.taskTemplates || []).map((task, index) =>
            React.createElement(
              "div",
              {
                key: task._id,
                style: {
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  background: "#fff",
                  padding: 10,
                  display: "grid",
                  gridTemplateColumns: "28px minmax(0, 1fr) 34px",
                  gap: 8,
                  alignItems: "start",
                },
              },
              React.createElement(
                "div",
                {
                  style: {
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    background: C.bgSection,
                    color: C.textSub,
                    fontSize: 11.5,
                    fontWeight: 500,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 4,
                  },
                },
                index + 1,
              ),
              React.createElement(
                "div",
                {
                  style: {
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 8,
                    minWidth: 0,
                    alignItems: "start",
                  },
                },
                React.createElement(
                  "label",
                  { style: { display: "grid", gap: 4, fontSize: 12, color: C.textSub } },
                  tr("Task name"),
                  React.createElement("input", {
                    value: task.title || "",
                    onChange: (e) => updateCustomTask(task._id, "title", e.target.value),
                    placeholder: tr("Task template name"),
                    style: inp({ fontSize: 13, padding: "6px 9px" }),
                    onFocus,
                    onBlur,
                  }),
                ),
                React.createElement(
                  "label",
                  {
                    style: {
                      display: "grid",
                      gap: 4,
                      fontSize: 12,
                      color: C.textSub,
                    },
                  },
                  tr("Description"),
                  React.createElement("textarea", {
                    value: task.description || "",
                    onChange: (e) => updateCustomTask(task._id, "description", e.target.value),
                    placeholder: tr("Task description or expected output..."),
                    rows: 2,
                    style: {
                      ...inp({
                        minHeight: 52,
                        resize: "vertical",
                        fontSize: 12.5,
                        lineHeight: "18px",
                      }),
                    },
                    onFocus,
                    onBlur,
                  }),
                ),
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => removeCustomTask(task._id),
                  title: tr("Remove task"),
                  style: {
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    border: `1px solid ${C.border}`,
                    background: "#fff",
                    color: C.danger,
                    cursor: "pointer",
                    fontSize: 16,
                    lineHeight: 1,
                  },
                },
                "x",
              ),
            ),
          ),
        ),
    );

  const renderNewSvcFieldLabel = (labelText, required, hint) =>
    React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", marginBottom: 5 } },
      React.createElement(
        "span",
        { style: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: C.textLabel } },
        labelText,
      ),
      required && React.createElement("span", { style: { color: C.danger, marginLeft: 3, fontSize: 12 } }, "*"),
      hint &&
        React.createElement(
          "span",
          { style: { fontSize: 11, color: "#9ca3af", fontStyle: "italic", marginLeft: 6 } },
          hint,
        ),
    );
  const renderNewSvcFieldError = (key) =>
    errors[key] && React.createElement("div", { style: { color: C.danger, fontSize: 11.5, marginTop: 4 } }, errors[key]);

  const renderComboItemTaskPanel = (item) =>
    React.createElement(
      "div",
      {
        style: {
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          background: C.bgSection,
          padding: 10,
          marginTop: 8,
        },
      },
      React.createElement(
        "div",
        { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 } },
        React.createElement(
          "span",
          { style: { fontSize: 12.5, fontWeight: 600, color: C.text, fontFamily: FONT } },
          tr("Task templates"),
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () => addComboItemTask(item),
            style: {
              border: `1px dashed ${C.primary}`,
              background: "#fff",
              color: C.primary,
              borderRadius: 6,
              padding: "4px 9px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              fontFamily: FONT,
            },
          },
          tr("+ Add task"),
        ),
      ),
      React.createElement(
        "div",
        { style: { fontSize: 11, color: "#9ca3af", fontStyle: "italic", marginBottom: 8 } },
        tr("Editing here updates this service's shared task list — changes apply to every case, not just this combo."),
      ),
      (item.taskTemplates || []).length === 0
        ? React.createElement(
          "div",
          {
            style: {
              padding: "10px 12px",
              color: C.textSub,
              fontSize: 12,
              background: "#fff",
              border: `1px dashed ${C.border}`,
              borderRadius: 6,
            },
          },
          tr("No tasks yet for this service."),
        )
        : React.createElement(
          "div",
          { style: { display: "grid", gap: 8 } },
          (item.taskTemplates || []).map((task) =>
            React.createElement(
              "div",
              {
                key: task._id,
                style: {
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  background: "#fff",
                  padding: 8,
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 30px",
                  gap: 8,
                  alignItems: "start",
                },
              },
              React.createElement(
                "div",
                { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 6 } },
                React.createElement("input", {
                  value: task.title || "",
                  onChange: (e) => updateComboItemTask(item._id, task._id, "title", e.target.value),
                  onBlur: (e) => {
                    onBlur(e);
                    commitComboItemTaskEdit(task);
                  },
                  placeholder: tr("Task name"),
                  style: inp({ fontSize: 12.5, padding: "5px 8px" }),
                  onFocus,
                }),
                React.createElement("input", {
                  value: task.description || "",
                  onChange: (e) => updateComboItemTask(item._id, task._id, "description", e.target.value),
                  onBlur: (e) => {
                    onBlur(e);
                    commitComboItemTaskEdit(task);
                  },
                  placeholder: tr("Description"),
                  style: inp({ fontSize: 12.5, padding: "5px 8px" }),
                  onFocus,
                }),
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => removeComboItemTask(item, task),
                  title: tr("Remove task"),
                  style: {
                    width: 26,
                    height: 26,
                    borderRadius: 5,
                    border: `1px solid ${C.border}`,
                    background: "#fff",
                    color: C.danger,
                    cursor: "pointer",
                    fontSize: 14,
                    lineHeight: 1,
                  },
                },
                "x",
              ),
            ),
          ),
        ),
    );

  // Custom-item counterpart of renderComboItemTaskPanel above — same visual
  // shape, but every action is local-only (addComboCustomItemTask/
  // removeComboCustomItemTask, and updateComboItemTask reused as-is for
  // onChange), since a custom item has no real serviceId to write
  // projectTemplates against yet.
  const renderComboCustomItemTaskEditor = (item) =>
    React.createElement(
      "div",
      {
        style: {
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          background: C.bgSection,
          padding: 10,
          marginTop: 8,
        },
      },
      React.createElement(
        "div",
        { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 } },
        React.createElement(
          "span",
          { style: { fontSize: 12.5, fontWeight: 600, color: C.text, fontFamily: FONT } },
          tr("Sample tasks"),
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () => addComboCustomItemTask(item._id),
            style: {
              border: `1px dashed ${C.primary}`,
              background: "#fff",
              color: C.primary,
              borderRadius: 6,
              padding: "4px 9px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              fontFamily: FONT,
            },
          },
          tr("+ Add task"),
        ),
      ),
      React.createElement(
        "div",
        { style: { fontSize: 11, color: "#9ca3af", fontStyle: "italic", marginBottom: 8 } },
        comboSaveToCatalog && !svcOpts.some((s) => serviceNameKey(s.serviceName) === serviceNameKey(item.serviceName))
          ? tr("These tasks will be created for this service, and copied into the catalog too since \"Also save this combo to the shared catalog\" is checked below.")
          : tr("These tasks will be created for this service on this case only."),
      ),
      (item.taskTemplates || []).length === 0
        ? React.createElement(
          "div",
          {
            style: {
              padding: "10px 12px",
              color: C.textSub,
              fontSize: 12,
              background: "#fff",
              border: `1px dashed ${C.border}`,
              borderRadius: 6,
            },
          },
          tr("No tasks yet for this service."),
        )
        : React.createElement(
          "div",
          { style: { display: "grid", gap: 8 } },
          (item.taskTemplates || []).map((task) =>
            React.createElement(
              "div",
              {
                key: task._id,
                style: {
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  background: "#fff",
                  padding: 8,
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 30px",
                  gap: 8,
                  alignItems: "start",
                },
              },
              React.createElement(
                "div",
                { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 6 } },
                React.createElement("input", {
                  value: task.title || "",
                  onChange: (e) => updateComboItemTask(item._id, task._id, "title", e.target.value),
                  placeholder: tr("Task name"),
                  style: inp({ fontSize: 12.5, padding: "5px 8px" }),
                  onFocus,
                  onBlur,
                }),
                React.createElement("input", {
                  value: task.description || "",
                  onChange: (e) => updateComboItemTask(item._id, task._id, "description", e.target.value),
                  placeholder: tr("Description"),
                  style: inp({ fontSize: 12.5, padding: "5px 8px" }),
                  onFocus,
                  onBlur,
                }),
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => removeComboCustomItemTask(item._id, task._id),
                  title: tr("Remove task"),
                  style: {
                    width: 26,
                    height: 26,
                    borderRadius: 5,
                    border: `1px solid ${C.border}`,
                    background: "#fff",
                    color: C.danger,
                    cursor: "pointer",
                    fontSize: 14,
                    lineHeight: 1,
                  },
                },
                "x",
              ),
            ),
          ),
        ),
    );

  const comboTh = (extra = {}) => ({ padding: "8px 10px", fontSize: 11, fontWeight: 600, color: C.textSub, background: C.bgSection, borderBottom: `1px solid ${C.border}`, textAlign: "left", fontFamily: FONT, ...extra });
  const comboTd = (extra = {}) => ({ padding: "6px 10px", fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle", fontFamily: FONT, ...extra });

  const renderComboItemRows = (item, index) => {
    const isCustom = item.source === "custom";
    const isNameAlreadyInCatalog =
      isCustom &&
      !!(item.serviceName || "").trim() &&
      svcOpts.some((s) => serviceNameKey(s.serviceName) === serviceNameKey(item.serviceName));
    const taskCount = (item.taskTemplates || []).length;
    const expanded = comboExpandedTaskItemId === item._id;
    const mainRow = React.createElement(
      "tr",
      { key: item._id, style: { background: isCustom ? "#fffbe6" : "#fff" } },
      React.createElement("td", { style: comboTd({ textAlign: "center", color: C.textSub, fontFamily: FONT_MONO, fontSize: 11.5 }) }, index + 1),
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
              style: inp({ fontSize: 13, padding: "5px 8px" }),
              onFocus,
              onBlur,
            }),
            isNameAlreadyInCatalog &&
              React.createElement("div", { style: { fontSize: 11, color: C.textSub, marginTop: 3 } }, tr("Already in the standardized catalog")),
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
            style: inp({ fontSize: 12.5, padding: "5px 8px" }),
            onFocus,
            onBlur,
          })
          : React.createElement("span", { style: { color: C.textSub, fontSize: 12.5 } }, item.serviceType || "—"),
      ),
      React.createElement(
        "td",
        { style: comboTd({ textAlign: "right" }) },
        isCustom
          ? React.createElement(PriceInput, {
            value: item.basePrice || 0,
            onChange: (v) => updateComboItem(item._id, "basePrice", v),
            currency: selectedComboCurrency,
            size: "small",
          })
          : React.createElement("span", { style: { color: C.text, fontSize: 12.5, fontFamily: FONT_MONO } }, formatMoney(item.basePrice || 0, selectedComboCurrency)),
      ),
      React.createElement(
        "td",
        { style: comboTd() },
        isCustom
          ? React.createElement("input", {
            value: item.description || "",
            onChange: (e) => updateComboItem(item._id, "description", e.target.value),
            placeholder: tr("Description (optional)..."),
            style: inp({ fontSize: 12.5, padding: "5px 8px" }),
            onFocus,
            onBlur,
          })
          : React.createElement("span", { style: { color: C.textSub, fontSize: 12.5 } }, item.description || "—"),
      ),
      React.createElement(
        "td",
        { style: comboTd({ width: 118 }) },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () => setComboExpandedTaskItemId(expanded ? null : item._id),
            style: {
              border: `1px solid ${taskCount ? C.primary : C.border}`,
              background: taskCount ? "#eff6ff" : "#fff",
              color: taskCount ? C.primary : C.textSub,
              borderRadius: 6,
              padding: "4px 8px",
              cursor: "pointer",
              fontSize: 11.5,
              fontWeight: 600,
              fontFamily: FONT,
              whiteSpace: "nowrap",
            },
          },
          `${expanded ? tr("Hide") : tr("Manage")} (${taskCount})`,
        ),
      ),
      React.createElement(
        "td",
        { style: comboTd({ width: 32, textAlign: "center" }) },
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
    if (!expanded) return [mainRow];
    const taskRow = React.createElement(
      "tr",
      { key: `${item._id}-tasks` },
      React.createElement(
        "td",
        { colSpan: 7, style: { padding: "0 10px 10px", borderBottom: `1px solid ${C.border}`, background: isCustom ? "#fffbe6" : "#fff" } },
        isCustom ? renderComboCustomItemTaskEditor(item) : renderComboItemTaskPanel(item),
      ),
    );
    return [mainRow, taskRow];
  };

  const renderComboItemsTable = () =>
    React.createElement(
      "div",
      { style: { overflowX: "auto", marginBottom: 10, border: `1px solid ${C.border}`, borderRadius: 8 } },
      React.createElement(
        "table",
        { style: { width: "100%", minWidth: 780, borderCollapse: "collapse", tableLayout: "fixed" } },
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
            React.createElement("th", { style: comboTh({ width: 118 }) }, tr("Tasks")),
            React.createElement("th", { style: comboTh({ width: 32 }) }, ""),
          ),
        ),
        React.createElement(
          "tbody",
          null,
          comboItems.flatMap((item, idx) => renderComboItemRows(item, idx)),
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
            padding: "12px 20px",
            borderBottom: `1px solid #f3f4f6`,
            flexShrink: 0,
            display: "flex",
            gap: 10,
            alignItems: "center",
          },
        },
        React.createElement(
          "div",
          { style: { position: "relative", flex: 1 } },
          React.createElement(
            "span",
            {
              style: {
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 13,
                color: C.textSub,
                pointerEvents: "none",
                display: "inline-flex",
                alignItems: "center",
              },
            },
            SearchIcon,
          ),
          React.createElement("input", {
            autoFocus: true,
            value: comboSearch,
            onChange: (e) => setComboSearch(e.target.value),
            placeholder: tr("Search combo..."),
            style: inp({ paddingLeft: 36 }),
            onFocus,
            onBlur,
          }),
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () => setComboTab("create"),
            style: {
              border: `1px dashed ${C.primary}`,
              background: "#fff",
              color: C.primary,
              borderRadius: 6,
              padding: "0 14px",
              height: 32,
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: FONT,
              whiteSpace: "nowrap",
              flexShrink: 0,
            },
          },
          tr("+ New combo"),
        ),
      ),
      React.createElement(
        "div",
        { style: { overflow: "auto", flex: 1 } },
        React.createElement(
          "table",
          { style: { width: "100%", minWidth: 760, borderCollapse: "collapse" } },
          React.createElement(
            "thead",
            null,
            React.createElement(
              "tr",
              null,
              React.createElement("th", { style: thS({ width: 36, textAlign: "center" }) }, "#"),
              React.createElement("th", { style: thS({ minWidth: 260 }) }, tr("Combo")),
              React.createElement("th", { style: thS({ width: 160, textAlign: "right" }) }, tr("Combo Price")),
              React.createElement("th", { style: thS({ width: 100, textAlign: "center" }) }, tr("Services")),
              React.createElement("th", { style: thS({ width: 90, textAlign: "center" }) }, ""),
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
                  { colSpan: 5, style: tdS({ textAlign: "center", color: "#9ca3af", padding: "40px 0" }) },
                  React.createElement(
                    "div",
                    { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 } },
                    React.createElement("span", { style: { color: C.textSub, display: "inline-flex" } }, ClipboardIcon),
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
                const comboCurrencyIdFallback = extractCurrencyId(currencyFromRecord(c, currencies, vndCurrency));
                // Illustrative only — sums each service's own standalone
                // basePrice × quantity so the user can see, at a glance, how
                // much cheaper the package is vs. buying the lines
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
                  const converted = convertComboAmountToVndSync
                    ? convertComboAmountToVndSync(price * qty, itemCurrencyId)
                    : { value: price * qty };
                  return sum + converted.value;
                }, 0);
                const packagePrice = convertComboAmountToVndSync
                  ? convertComboAmountToVndSync(parseNum(c.packageSubTotal), comboCurrencyIdFallback).value
                  : parseNum(c.packageSubTotal);
                const comboSavings = individualTotal - packagePrice;
                const comboSavingsPct = individualTotal > 0 ? Math.round((comboSavings / individualTotal) * 100) : 0;
                return React.createElement(
                  "tr",
                  {
                    key: c.id,
                    style: { background: i % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" },
                    onClick: () => onApplyCombo?.(c.id),
                  },
                  React.createElement(
                    "td",
                    { style: tdS({ textAlign: "center", color: C.textSub, fontSize: 12, paddingTop: 13 }) },
                    i + 1,
                  ),
                  React.createElement(
                    "td",
                    { style: tdS({ paddingTop: 12 }) },
                    React.createElement(
                      "div",
                      { style: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5, minWidth: 0 } },
                      React.createElement(
                        "span",
                        { style: { fontWeight: 700, color: C.text, lineHeight: "20px", overflowWrap: "anywhere" } },
                        c.comboName || tr("Combo #{0}", { 0: c.id }),
                      ),
                      c.serviceComboType &&
                        React.createElement(
                          "span",
                          {
                            style: {
                              fontSize: 11,
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              padding: "2px 8px",
                              borderRadius: 10,
                              lineHeight: "16px",
                            },
                          },
                          c.serviceComboType,
                        ),
                    ),
                  ),
                  React.createElement(
                    "td",
                    { style: tdS({ textAlign: "right", paddingTop: 12 }) },
                    React.createElement(
                      "div",
                      { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 } },
                      comboSavings !== 0 &&
                        React.createElement(
                          "span",
                          { style: { fontSize: 11, color: C.textSub, textDecoration: "line-through" } },
                          formatMoney(individualTotal, vndCurrency),
                        ),
                      React.createElement(
                        "span",
                        { style: { fontFamily: FONT_MONO, fontWeight: 700, color: C.text } },
                        formatMoney(c.packageSubTotal, currencyFromRecord(c, currencies, defaultCurrencyObject())),
                      ),
                      React.createElement(
                        "span",
                        { style: { fontSize: 10.5, color: C.textSub } },
                        tr("VAT {0}%", { 0: parseNum(c.packageVatRate) }),
                      ),
                      comboSavings > 0 &&
                        React.createElement(
                          "span",
                          { style: { fontSize: 10.5, color: C.success, fontWeight: 600 } },
                          tr("Save {0} ({1}%)", { 0: formatMoney(comboSavings, vndCurrency), 1: comboSavingsPct }),
                        ),
                    ),
                  ),
                  React.createElement(
                    "td",
                    { style: tdS({ textAlign: "center", paddingTop: 12, color: C.textSub, fontSize: 12.5 }) },
                    itemCount,
                  ),
                  React.createElement(
                    "td",
                    { style: tdS({ textAlign: "center", paddingTop: 10 }) },
                    React.createElement(
                      "div",
                      {
                        style: {
                          display: "inline-block",
                          padding: "3px 14px",
                          borderRadius: 4,
                          background: C.primary,
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 600,
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
        { style: { padding: "12px 20px", borderTop: `1px solid ${C.border}`, textAlign: "right", flexShrink: 0 } },
        React.createElement(
          "div",
          {
            onClick: requestClosePicker,
            style: {
              display: "inline-block",
              padding: "7px 20px",
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              cursor: "pointer",
              fontSize: 13,
              color: C.textSub,
              fontFamily: FONT,
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
        { style: { overflowY: "auto", flex: 1, padding: "20px 24px" } },
        !internalCompanyId &&
          React.createElement(
            "div",
            {
              style: {
                padding: "10px 14px",
                background: "#fefce8",
                border: `1px solid #fde68a`,
                borderRadius: 8,
                marginBottom: 18,
                fontSize: 13,
                color: C.warning,
                fontWeight: 500,
              },
            },
            tr("Please select an Internal Company in the main form before creating a service"),
          ),
        React.createElement(
          "div",
          { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 16 } },
          React.createElement(
            "div",
            { style: { minWidth: 0 } },
            renderNewSvcFieldLabel(tr("Combo Name"), true, null),
            React.createElement("input", {
              value: comboName,
              onChange: (e) => {
                setComboName(e.target.value);
                setComboErrors((p) => ({ ...p, comboName: "" }));
              },
              placeholder: tr("E.g. Business incorporation consulting combo..."),
              style: { ...inp(), ...(comboErrors.comboName ? { borderColor: C.danger } : {}) },
              onFocus,
              onBlur,
            }),
            comboErrors.comboName &&
              React.createElement("div", { style: { color: C.danger, fontSize: 11.5, marginTop: 4 } }, comboErrors.comboName),
          ),
          React.createElement(
            "div",
            { style: { minWidth: 0 } },
            renderNewSvcFieldLabel(tr("Combo Type"), false, "optional"),
            React.createElement("input", {
              value: comboType,
              onChange: (e) => setComboType(e.target.value),
              placeholder: tr("E.g. Business, Education..."),
              style: inp(),
              onFocus,
              onBlur,
            }),
          ),
        ),
        React.createElement(
          "div",
          { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 20 } },
          React.createElement(
            "div",
            { style: { gridColumn: "span 2" } },
            renderNewSvcFieldLabel(tr("Combo Subtotal"), false, null),
            React.createElement(
              "div",
              { style: { display: "flex", gap: 8 } },
              React.createElement(
                "div",
                { style: { flex: 1, minWidth: 0 } },
                React.createElement(PriceInput, {
                  value: comboSubTotal,
                  onChange: setComboSubTotal,
                  currency: selectedComboCurrency,
                }),
              ),
              React.createElement(
                "div",
                { style: { width: 130, flexShrink: 0 } },
                Select
                  ? React.createElement(Select, {
                    showSearch: true,
                    allowClear: false,
                    value: comboCurrencyId || undefined,
                    placeholder: currencies.length ? tr("Currency") : tr("No currencies configured"),
                    optionFilterProp: "label",
                    style: { width: "100%" },
                    onChange: (value) => setComboCurrencyId(value || ""),
                    options: currencies.map((item) => ({
                      value: String(item.id),
                      label: currencySelectLabel(item),
                    })),
                    disabled: !currencies.length,
                  })
                  : React.createElement(
                    "select",
                    {
                      value: comboCurrencyId || "",
                      onChange: (e) => setComboCurrencyId(e.target.value || ""),
                      style: inp(),
                      disabled: !currencies.length,
                    },
                    React.createElement("option", { value: "" }, tr("Select currency")),
                    ...currencies.map((item) =>
                      React.createElement(
                        "option",
                        { key: item.id, value: item.id },
                        currencySelectLabel(item),
                      ),
                    ),
                  ),
              ),
            ),
            comboErrors.comboCurrencyId &&
              React.createElement(
                "div",
                { style: { color: C.danger, fontSize: 11.5, marginTop: 4 } },
                comboErrors.comboCurrencyId,
              ),
            comboItems.length > 0 &&
              (() => {
                const originalTotal = comboItems.reduce(
                  (sum, it) => sum + parseNum(it.basePrice) * Math.max(1, parseInt(it.quantity, 10) || 1),
                  0,
                );
                const delta = parseNum(comboSubTotal) - originalTotal;
                return React.createElement(
                  "div",
                  { style: { marginTop: 6, fontSize: 11.5, color: C.textSub, display: "flex", flexWrap: "wrap", gap: 6 } },
                  React.createElement("span", null, tr("Individual price: {0}", { 0: formatMoney(originalTotal, selectedComboCurrency) })),
                  delta < 0 &&
                    React.createElement("span", { style: { color: C.success, fontWeight: 600 } }, tr("Discount {0}", { 0: formatMoney(-delta, selectedComboCurrency) })),
                  delta > 0 &&
                    React.createElement("span", { style: { color: C.warning, fontWeight: 600 } }, tr("Increase {0}", { 0: formatMoney(delta, selectedComboCurrency) })),
                );
              })(),
          ),
          React.createElement(
            "div",
            null,
            renderNewSvcFieldLabel(tr("VAT %"), false, null),
            React.createElement("input", {
              type: "number",
              min: 0,
              max: 100,
              step: 0.1,
              value: comboVatRate,
              onChange: (e) => setComboVatRate(parseFloat(e.target.value) || 0),
              style: inp(),
              onFocus,
              onBlur,
            }),
          ),
        ),
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 10 } },
          React.createElement(
            "span",
            { style: { fontSize: 13, fontWeight: 700, color: C.text, fontFamily: FONT } },
            tr("Services in combo ({0})", { 0: comboItems.length }),
          ),
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            Select
              ? React.createElement(Select, {
                showSearch: true,
                allowClear: false,
                value: comboItemPick,
                placeholder: tr("+ Add existing service..."),
                optionFilterProp: "label",
                style: { width: 240 },
                onSelect: (value) => {
                  const svc = comboAvailableCatalogItems.find((s) => String(s.id) === String(value));
                  if (svc) addComboCatalogItem(svc);
                },
                options: comboAvailableCatalogItems.map((s) => ({
                  value: String(s.id),
                  label: s.serviceName || tr("Service #{0}", { 0: s.id }),
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
          React.createElement("div", { style: { color: C.danger, fontSize: 12, marginBottom: 10 } }, comboErrors.items),
        comboItems.length === 0
          ? React.createElement(
            "div",
            {
              style: {
                border: `1px dashed ${C.border}`,
                background: C.bgSection,
                borderRadius: 8,
                padding: "20px 14px",
                textAlign: "center",
                color: C.textSub,
                fontSize: 12.5,
                fontFamily: FONT,
              },
            },
            tr("No services yet — add one from the list or create a new one."),
          )
          : renderComboItemsTable(),
      ),
      React.createElement(
        "div",
        { style: { padding: "0 24px 14px" } },
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
            checked: comboSaveToCatalog,
            onChange: (e) => setComboSaveToCatalog(e.target.checked),
            style: { marginTop: 2, cursor: "pointer" },
          }),
          React.createElement(
            "span",
            null,
            tr("Also save this combo to the shared catalog (created only if you finish creating this case). All custom services in it are saved too — services already in the catalog are simply reused."),
          ),
        ),
      ),
      React.createElement(
        "div",
        {
          style: {
            padding: "14px 24px",
            borderTop: `1px solid #f3f4f6`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            background: C.bgSection,
            flexShrink: 0,
          },
        },
        React.createElement(
          "button",
          {
            onClick: () => setComboTab("select"),
            style: {
              padding: "8px 20px",
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              background: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: FONT,
              color: C.text,
            },
          },
          tr("Back"),
        ),
        React.createElement(
          "button",
          {
            onClick: handleApplyAdhocCombo,
            disabled: comboApplying,
            style: {
              padding: "8px 24px",
              borderRadius: 6,
              background: comboApplying ? "#f3f4f6" : C.primary,
              color: comboApplying ? "#9ca3af" : "#fff",
              border: "none",
              fontWeight: 600,
              fontSize: 13,
              cursor: comboApplying ? "not-allowed" : "pointer",
              fontFamily: FONT,
            },
          },
          comboApplying ? tr("Applying...") : tr("Submit"),
        ),
      ),
    );

  // Guards every way this modal can close (backdrop click, X button, the
  // tab-level Close/Cancel links) behind the same "Discard changes?"
  // confirm the rest of this form already uses (showDiscardConfirm) —
  // only when there's actually something typed that closing would lose.
  // The post-success onClose() calls inside handleCreate/applyAdhocCombo
  // etc. are untouched (nothing to discard once the action already saved).
  const hasUnsavedPickerInput = () => {
    if (
      tab === "create" &&
      (newSvc.name.trim() ||
        newSvc.serviceType.trim() ||
        newSvc.description.trim() ||
        (newSvc.taskTemplates || []).length > 0)
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
      showDiscardConfirm(() => onClose());
    } else {
      onClose();
    }
  };

  return React.createElement(
    "div",
    {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        boxSizing: "border-box",
        zIndex: 10000,
        // Rendered as a plain fixed-position div (no portal), so it stays a
        // DOM descendant of the services-section wrapper that sets
        // pointerEvents:"none" while no Internal Company is picked yet
        // (see that wrapper's style a few hundred lines up) — CSS
        // pointer-events inherits through fixed positioning, so without
        // resetting it here the whole modal, including an already-open
        // combo picker, silently stops accepting clicks.
        pointerEvents: "auto",
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
          maxWidth: 1240,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
        },
        onClick: (e) => e.stopPropagation(),
      },
      React.createElement(
        "div",
        {
          style: {
            padding: "15px 20px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          },
        },
        React.createElement(
          "span",
          {
            style: {
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 15,
              color: C.text,
            },
          },
          mode === "combo"
            ? comboTab === "create"
              ? tr("New Combo")
              : tr("Select Combo")
            : tab === "create"
              ? tr("Create New Service")
              : tr("Select Service"),
        ),
        React.createElement(
          "button",
          {
            onClick: requestClosePicker,
            type: "button",
            title: tr("Close"),
            style: {
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: C.textSub,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              padding: 0,
            },
          },
          XIcon,
        ),
      ),
      !comboScopeId &&
      React.createElement(
        "div",
        {
          style: {
            padding: "10px 20px",
            borderBottom: `1px solid ${C.border}`,
            background: "#fff",
            flexShrink: 0,
          },
        },
        Segmented
          ? React.createElement(Segmented, {
            block: true,
            value: mode,
            onChange: (value) => setMode(value),
            options: [
              { value: "individual", label: tr("Line pricing") },
              { value: "combo", label: tr("Combo pricing") },
            ],
            style: { width: "100%", maxWidth: 360 },
          })
          : React.createElement(
            "div",
            {
              style: {
                display: "flex",
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                overflow: "hidden",
                width: "100%",
                maxWidth: 360,
              },
            },
            [
              ["individual", tr("Line pricing")],
              ["combo", tr("Combo pricing")],
            ].map(([m, label]) =>
              React.createElement(
                "button",
                {
                  key: m,
                  type: "button",
                  onClick: () => setMode(m),
                  style: {
                    border: "none",
                    borderRight: m === "individual" ? `1px solid ${C.border}` : "none",
                    background: mode === m ? C.primary : "#fff",
                    color: mode === m ? "#fff" : C.text,
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: FONT,
                    flex: "1 1 0",
                  },
                },
                label,
              ),
            ),
          ),
      ),
      !comboScopeId &&
      mode === "individual" &&
      comboTarget &&
      comboTargets.length > 0 &&
      React.createElement(
        "div",
        {
          style: {
            padding: "10px 20px",
            borderBottom: `1px solid ${C.border}`,
            background: C.bgSection,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            flexShrink: 0,
          },
        },
        React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: C.text } }, tr("Add to combo:")),
        React.createElement(
          "select",
          {
            value: comboTarget,
            onChange: (e) => onComboTargetChange?.(e.target.value),
            style: {
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 13,
              fontFamily: FONT,
              minWidth: 220,
              maxWidth: "100%",
              background: "#fff",
            },
          },
          comboTargets.map((target) =>
            React.createElement("option", { key: target.key, value: target.key }, target.name),
          ),
        ),
        React.createElement(
          "span",
          { style: { fontSize: 12, color: C.textSub } },
          tr("Combo pricing keeps every service inside a combo."),
        ),
      ),
      mode === "individual" &&
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              borderBottom: `1px solid ${C.border}`,
              flexShrink: 0,
              background: C.bgSection,
            },
          },
          ["list", "create"].map((t) =>
          React.createElement(
            "div",
            {
              key: t,
              onClick: () => setTab(t),
              style: {
                padding: "10px 24px",
                cursor: "pointer",
                fontSize: 13.5,
                fontWeight: tab === t ? 700 : 400,
                color: tab === t ? C.primary : C.textSub,
                borderBottom:
                  tab === t
                    ? `2px solid ${C.primary}`
                    : "2px solid transparent",
                background: "transparent",
                fontFamily: FONT,
                userSelect: "none",
              },
            },
            t === "list" ? tr("Select from list") : tr("Create new service"),
          ),
        ),
      ),
      tab === "list" &&
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "div",
          {
            style: {
              padding: "12px 20px",
              borderBottom: `1px solid #f3f4f6`,
              flexShrink: 0,
            },
          },
          React.createElement(
            "div",
            { style: { position: "relative" } },
            React.createElement(
              "span",
              {
                style: {
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 13,
                  color: C.textSub,
                  pointerEvents: "none",
                  display: "inline-flex",
                  alignItems: "center",
                },
              },
              SearchIcon,
            ),
            React.createElement("input", {
              autoFocus: true,
              value: search,
              onChange: (e) => setSearch(e.target.value),
              placeholder: tr("Search service, type, currency..."),
              style: inp({ paddingLeft: 36 }),
              onFocus,
              onBlur,
            }),
          ),
        ),
        React.createElement(
          "div",
          { style: { overflow: "auto", flex: 1 } },
          React.createElement(
            "table",
            { style: { width: "100%", minWidth: 980, borderCollapse: "collapse" } },
            React.createElement(
              "thead",
              null,
              React.createElement(
                "tr",
                null,
                React.createElement(
                  "th",
                  { style: thS({ width: 36, textAlign: "center" }) },
                  "#",
                ),
                React.createElement(
                  "th",
                  { style: thS({ minWidth: 250 }) },
                  tr("Service"),
                ),
                React.createElement(
                  "th",
                  { style: thS({ minWidth: 180 }) },
                  tr("Description"),
                ),
                React.createElement(
                  "th",
                  { style: thS({ minWidth: 240 }) },
                  tr("Task Templates"),
                ),
                React.createElement(
                  "th",
                  { style: thS({ width: 180, textAlign: "right" }) },
                  tr("Unit Price"),
                ),
                React.createElement(
                  "th",
                  { style: thS({ width: 80, textAlign: "center" }) },
                  "",
                ),
              ),
            ),
            React.createElement(
              "tbody",
              null,
              filtered.length === 0
                ? React.createElement(
                  "tr",
                  null,
                  React.createElement(
                    "td",
                    {
                      colSpan: 6,
                      style: tdS({
                        textAlign: "center",
                        color: "#9ca3af",
                        padding: "40px 0",
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
                        "span",
                        { style: { color: C.textSub, display: "inline-flex" } },
                        ClipboardIcon,
                      ),
                      React.createElement("div", null, tr("No services found")),
                      React.createElement(
                        "span",
                        {
                          onClick: () => setTab("create"),
                          style: {
                            color: C.primary,
                            cursor: "pointer",
                            fontSize: 12,
                            textDecoration: "underline",
                          },
                        },
                        tr("Create new service"),
                      ),
                    ),
                  ),
                )
                : filtered.map((s, i) => {
                  const isUsed = selectedIds.includes(String(s.id));
                  const sampleTasks = getServiceTaskTemplates(taskTemplates, s);
                  const fallbackCurrency = extractCurrencyId(currency) ? currency : null;
                  const serviceCurrency = currencyFromRecordOptional(s, currencies, fallbackCurrency);
                  const currencySourceLabel =
                    s.currencySource === "companyService"
                      ? tr("Company service currency")
                      : s.currencySource === "service"
                        ? tr("Service default currency")
                        : serviceCurrency
                          ? tr("Case currency")
                          : tr("No currency");
                  const currencyChipTone =
                    s.currencySource === "companyService"
                      ? { bg: "#ecfdf5", border: "#bbf7d0", color: "#047857" }
                      : s.currencySource === "service"
                        ? { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" }
                        : { bg: "#f8fafc", border: C.border, color: C.textSub };
                  return React.createElement(
                    "tr",
                    {
                      key: s.id,
                      style: {
                        background: isUsed
                          ? "#f9fafb"
                          : i % 2 === 0
                            ? "#fff"
                            : "#fafafa",
                        cursor: isUsed ? "not-allowed" : "pointer",
                        opacity: isUsed ? 0.5 : 1,
                      },
                      onClick: () => {
                        if (!isUsed)
                          onSelect({
                            ...s,
                            currencyId: getRecordCurrencyId(s) || extractCurrencyId(serviceCurrency),
                            currency: serviceCurrency,
                          });
                      },
                    },
                    React.createElement(
                      "td",
                      {
                        style: tdS({
                          textAlign: "center",
                          color: C.textSub,
                          fontSize: 12,
                          paddingTop: 13,
                        }),
                      },
                      i + 1,
                    ),
                    React.createElement(
                      "td",
                      { style: tdS({ paddingTop: 12 }) },
                      React.createElement(
                        "div",
                        {
                          style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: 5,
                            minWidth: 0,
                          },
                        },
                        React.createElement(
                          "span",
                          {
                            style: {
                              fontWeight: 700,
                              color: C.text,
                              lineHeight: "20px",
                              overflowWrap: "anywhere",
                            },
                          },
                          s.serviceName || tr("Service #{0}", { 0: s.id }),
                        ),
                        s.serviceType &&
                        React.createElement(
                          "span",
                          {
                            style: {
                              fontSize: 11,
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              padding: "2px 8px",
                              borderRadius: 10,
                              lineHeight: "16px",
                            },
                          },
                          s.serviceType,
                        ),
                      ),
                    ),
                    React.createElement(
                      "td",
                      { style: tdS({ paddingTop: 10 }) },
                      React.createElement(ExpandableText, {
                        text: s.description || "",
                        limit: 80,
                      }),
                    ),
                    React.createElement(
                      "td",
                      { style: tdS({ paddingTop: 10, minWidth: 240 }) },
                      React.createElement(TaskTemplatePreview, {
                        tasks: sampleTasks,
                        compact: true,
                        max: 2,
                        emptyText: tr("No sample tasks"),
                      }),
                    ),
                    React.createElement(
                      "td",
                      {
                        style: tdS({
                          textAlign: "right",
                          paddingTop: 12,
                        }),
                      },
                      s.basePrice
                        ? React.createElement(
                          "div",
                          {
                            style: {
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "center",
                              gap: 8,
                              whiteSpace: "nowrap",
                            },
                          },
                          React.createElement(
                            "span",
                            {
                              style: {
                                fontFamily: FONT_MONO,
                                fontWeight: 700,
                                color: C.text,
                              },
                            },
                            serviceCurrency
                              ? React.createElement("div", null, formatMoneyAmount(s.basePrice, serviceCurrency), catalogVndText(s, serviceCurrency) && React.createElement("div", { style: { fontSize: 11, color: "rgba(0, 0, 0, 0.45)", fontWeight: 400 } }, catalogVndText(s, serviceCurrency)))
                              : formatMoneyDraft(s.basePrice, neutralCurrencyObject()),
                          ),
                          React.createElement(
                            "span",
                            {
                              title: serviceCurrency
                                ? `${currencySelectLabel(serviceCurrency)} · ${currencySourceLabel}`
                                : currencySourceLabel,
                              style: {
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minWidth: 50,
                                padding: "3px 7px",
                                borderRadius: 5,
                                background: currencyChipTone.bg,
                                border: `1px solid ${currencyChipTone.border}`,
                                color: currencyChipTone.color,
                                fontSize: 11.5,
                                fontWeight: 700,
                                fontFamily: FONT,
                              },
                            },
                            serviceCurrency ? getCurrencyCode(serviceCurrency) : "—",
                          ),
                        )
                        : React.createElement(
                          "span",
                          { style: { color: "#d1d5db" } },
                          "—",
                        ),
                    ),
                    React.createElement(
                      "td",
                      {
                        style: tdS({ textAlign: "center", paddingTop: 10 }),
                      },
                      isUsed
                        ? React.createElement(
                          "span",
                          {
                            style: {
                              color: C.success,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            },
                          },
                          CheckIcon,
                        )
                        : React.createElement(
                          "div",
                          {
                            style: {
                              display: "inline-block",
                              padding: "3px 14px",
                              borderRadius: 4,
                              background: C.primary,
                              color: "#fff",
                              fontSize: 12,
                              fontWeight: 600,
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
          {
            style: {
              padding: "12px 20px",
              borderTop: `1px solid ${C.border}`,
              textAlign: "right",
              flexShrink: 0,
            },
          },
          React.createElement(
            "div",
            {
              onClick: requestClosePicker,
              style: {
                display: "inline-block",
                padding: "7px 20px",
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                cursor: "pointer",
                fontSize: 13,
                color: C.textSub,
                fontFamily: FONT,
              },
            },
            tr("Close"),
          ),
        ),
      ),
      tab === "create" &&
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "div",
          { style: { overflowY: "auto", flex: 1, padding: "20px 24px" } },
          !internalCompanyId &&
          React.createElement(
            "div",
            {
              style: {
                padding: "10px 14px",
                background: "#fefce8",
                border: `1px solid #fde68a`,
                borderRadius: 8,
                marginBottom: 18,
                fontSize: 13,
                color: C.warning,
                fontWeight: 500,
              },
            },
            tr("Please select an Internal Company in the main form before creating a service"),
          ),
          React.createElement(
            "div",
            { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 16 } },
            React.createElement(
              "div",
              { style: { minWidth: 0 } },
              renderNewSvcFieldLabel(tr("Service Name"), true, null),
              React.createElement("input", {
                value: newSvc.name,
                onChange: (e) => {
                  setNewSvc({ ...newSvc, name: e.target.value });
                  setErrors((p) => ({ ...p, name: "" }));
                },
                placeholder: tr("E.g. Employment contract consultation..."),
                style: { ...inp(), ...(errors.name ? { borderColor: C.danger } : {}) },
                onFocus,
                onBlur,
              }),
              renderNewSvcFieldError("name"),
            ),
            React.createElement(
              "div",
              { style: { minWidth: 0 } },
              renderNewSvcFieldLabel(tr("Service Type"), false, "optional"),
              React.createElement("input", {
                value: newSvc.serviceType,
                onChange: (e) => setNewSvc({ ...newSvc, serviceType: e.target.value }),
                placeholder: tr("E.g. Consultation, Legal..."),
                style: inp(),
                onFocus,
                onBlur,
              }),
            ),
          ),
          React.createElement(
            "div",
            { style: { marginBottom: 16 } },
            renderNewSvcFieldLabel(tr("Description"), false, "optional"),
            React.createElement(AutoTextarea, {
              value: newSvc.description,
              onChange: (v) => setNewSvc({ ...newSvc, description: v }),
              placeholder: tr("Scope of work, notes..."),
              minRows: 3,
            }),
          ),
          React.createElement(
            "div",
            { style: { marginBottom: 16 } },
            renderNewSvcFieldLabel(tr("Unit Price"), false, "optional"),
            React.createElement(
              "div",
              { style: { display: "flex", gap: 8 } },
              React.createElement(
                "div",
                { style: { flex: 1, minWidth: 0 } },
                React.createElement(PriceInput, {
                  value: newSvc.basePrice,
                  onChange: (v) => setNewSvc({ ...newSvc, basePrice: v }),
                  currency: selectedNewSvcCurrency,
                  disabled: currencies.length && !selectedNewSvcCurrency,
                }),
              ),
              React.createElement(
                "div",
                { style: { width: 130, flexShrink: 0 } },
                Select
                  ? React.createElement(Select, {
                    showSearch: true,
                    allowClear: false,
                    value: newSvc.currencyId || undefined,
                    placeholder: currencies.length ? tr("Currency") : tr("No currencies configured"),
                    optionFilterProp: "label",
                    style: { width: "100%" },
                    onChange: (value) => setNewSvc({ ...newSvc, currencyId: value || "" }),
                    options: currencies.map((item) => ({
                      value: String(item.id),
                      label: currencySelectLabel(item),
                    })),
                    disabled: !currencies.length,
                  })
                  : React.createElement(
                    "select",
                    {
                      value: newSvc.currencyId || "",
                      onChange: (e) => setNewSvc({ ...newSvc, currencyId: e.target.value || "" }),
                      style: inp(),
                      disabled: !currencies.length,
                    },
                    React.createElement("option", { value: "" }, tr("Select currency")),
                    ...currencies.map((item) =>
                      React.createElement(
                        "option",
                        { key: item.id, value: item.id },
                        currencySelectLabel(item),
                      ),
                    ),
                  ),
              ),
            ),
            renderNewSvcFieldError("currencyId"),
          ),
          renderCustomTaskEditor(),
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 6,
                background: isNameAlreadyInCatalog ? C.bgSection : "#e6f4ff",
                border: `1px solid ${isNameAlreadyInCatalog ? C.border : "#91caff"}`,
              },
            },
            isNameAlreadyInCatalog
              ? React.createElement("div", { style: { width: 15, flexShrink: 0 } })
              : React.createElement("input", {
                type: "checkbox",
                id: "newSvcSaveToCatalog",
                checked: newSvc.saveToCatalog,
                onChange: (e) => setNewSvc({ ...newSvc, saveToCatalog: e.target.checked }),
                style: { marginTop: 2, cursor: "pointer", flexShrink: 0 },
              }),
            React.createElement(
              "label",
              {
                htmlFor: "newSvcSaveToCatalog",
                style: { fontSize: 12.5, color: C.textLabel, cursor: isNameAlreadyInCatalog ? "default" : "pointer", lineHeight: 1.5 },
              },
              isNameAlreadyInCatalog
                ? tr("This name already exists in the standardized catalog — pick it from the list instead of creating a duplicate.")
                : tr("Also save to the shared catalog (created only if you finish creating this case)."),
            ),
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              padding: "14px 24px",
              borderTop: `1px solid #f3f4f6`,
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              background: C.bgSection,
              flexShrink: 0,
            },
          },
          React.createElement(
            "button",
            {
              onClick: () => setTab("list"),
              style: {
                padding: "8px 20px",
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: "#fff",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: FONT,
                color: C.text,
              },
            },
            tr("Back"),
          ),
          React.createElement(
            "button",
            {
              onClick: handleCreate,
              disabled: creating || !internalCompanyId,
              style: {
                padding: "8px 24px",
                borderRadius: 6,
                background:
                  !internalCompanyId || creating ? "#f3f4f6" : C.primary,
                color: !internalCompanyId || creating ? "#9ca3af" : "#fff",
                border: "none",
                fontWeight: 600,
                fontSize: 13,
                cursor:
                  !internalCompanyId || creating ? "not-allowed" : "pointer",
                fontFamily: FONT,
              },
            },
            creating ? tr("Creating...") : tr("Save & Select"),
          ),
        ),
      ),
      ),
      mode === "combo" &&
      React.createElement(
        React.Fragment,
        null,
        comboTab === "select" && renderComboSelectTab(),
        comboTab === "create" && renderComboCreateTab(),
      ),
    ),
  );
};

const ProjectServicesTable = ({
  rows,
  svcOpts,
  onUpdate,
  onDelete,
  onAddFromService,
  internalCompanyId,
  quotationId,
  pricingMode,
  financialSourceType,
  packageSummary,
  onPricingModeChange,
  onPackageChange,
  onCurrencyChange,
  taskTemplates,
  setTaskTemplates,
  currency,
  currencies = [],
  pricingDate,
  // the source contract's Signed date / quotation's creation date: a synced
  // row converts on it, as the database does (rowRateBasis)
  sourceRateDate = null,
  combos = [],
  onApplyCombo,
  onApplyAdhocCombo,
  appliedCombos = [],
  onRemoveCombo,
  onUpdateComboAmount,
  onAddServiceToCombo,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  // When set, the picker was opened via a specific combo section's own
  // "+ Add service" action rather than the top-level "Add service" button —
  // the picked/created service is tagged into that combo's section instead
  // of landing as an untagged row, and the picker's Individual/Combo mode
  // toggle is hidden (adding INTO an existing combo, not creating another).
  const [comboAddInstanceId, setComboAddInstanceId] = useState(null);
  // Line/Combo sync (2026-09-25): in Combo pricing with combos present, a
  // service added from the top-level "New service" goes into a combo the
  // lawyer picks (default: the last one) instead of a loose line.
  const [addToComboTarget, setAddToComboTarget] = useState(null);
  const closePicker = () => {
    setPickerOpen(false);
    setComboAddInstanceId(null);
    setAddToComboTarget(null);
  };
  const [editingRows, setEditingRows] = useState({});
  const [taskOverviewRowId, setTaskOverviewRowId] = useState(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [exchangeRatesLoading, setExchangeRatesLoading] = useState(false);
  // Separate from `exchangeRates` above (which is cleared to [] while in
  // package mode — see its own effect's `if (packageMode ...)` guard, since
  // it exists only to convert LINE-mode rows across currencies). Combo
  // pricing comparisons ("Giá lẻ" vs "Giá combo") need rates regardless of
  // pricing mode, and a combo's own serviceComboItems can each be
  // snapshotted in a different currency than the combo itself — this keeps
  // rates for every such currency, always converting to VND (the universal
  // settlement currency for combo pricing throughout this form).
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
  // Synchronous VND conversion for combo price comparisons, using whatever
  // rates are already cached — no network round-trip per render.
  const convertComboAmountToVndSync = (amount, currencyId) => {
    const amt = parseNum(amount);
    if (!amt) return { value: 0, ok: true };
    const cur = findCurrencyById(currencies, currencyId) || vndCurrency;
    const curId = extractCurrencyId(cur);
    if (!curId || curId === vndCurrencyId) return { value: amt, ok: true };
    const matched = pickConversionRate(comboRatesVnd, cur, vndCurrency, pricingDate);
    return matched?.rate > 0 ? { value: amt * matched.rate, ok: true } : { value: 0, ok: false };
  };
  const selectedIds = useMemo(
    () => rows.map((r) => r.serviceId).filter(Boolean).map(String),
    [rows],
  );
  const currencyOptions = useMemo(
    () =>
      currencies.map((item) => ({
        value: String(item.id),
        label: currencySelectLabel(item),
      })),
    [currencies],
  );
  const getRowCurrency = useCallback(
    (row) => currencyFromRecord(row, currencies, currency),
    [currencies, currency],
  );
  const serviceTaskPreviewRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        _sampleTasks: getRowTaskTemplates(taskTemplates, row),
      })),
    [rows, taskTemplates],
  );
  const th = (ex = {}) => ({
    padding: "9px 12px",
    fontSize: 11.5,
    fontWeight: 600,
    color: C.textSub,
    background: C.bgSection,
    borderBottom: `2px solid ${C.border}`,
    textAlign: "left",
    whiteSpace: "nowrap",
    fontFamily: FONT,
    ...ex,
  });
  const td = (ex = {}) => ({
    padding: "8px 10px",
    borderBottom: `1px solid #f3f4f6`,
    verticalAlign: "top",
    fontFamily: FONT,
    ...ex,
  });

  const fromQuotationCount = useMemo(
    () => rows.filter((r) => r._fromQuotation).length,
    [rows],
  );
  const fromContractCount = useMemo(
    () => rows.filter((r) => r._fromContract).length,
    [rows],
  );
  const packageMode = isPackagePricing(pricingMode);
  const comboTargets = [];
  rows.forEach((row) => {
    const key = row._comboInstanceId;
    if (!key || comboTargets.some((target) => target.key === key)) return;
    comboTargets.push({ key, name: row._comboName || row.comboName || "Combo" });
  });
  const openTopLevelPicker = () => {
    setAddToComboTarget(packageMode && comboTargets.length ? comboTargets[comboTargets.length - 1].key : null);
    setPickerOpen(true);
  };
  const packageIncludedCount = useMemo(
    () => rows.filter((r) => r.billingMode === BILLING_PACKAGE_INCLUDED).length,
    [rows],
  );
  const hasFinancialSource = financialSourceType && financialSourceType !== SOURCE_NONE;
  const billingOptions = packageMode
    ? [
      { value: BILLING_PACKAGE_INCLUDED, label: tr("Included in combo") },
      { value: BILLING_SEPARATE, label: tr("Bill separately") },
      { value: BILLING_SCOPE, label: tr("Scope only") },
    ]
    : hasFinancialSource
      ? [
        { value: BILLING_LINE, label: tr("Line billable") },
        { value: BILLING_SCOPE, label: tr("Scope only") },
      ]
      : [
        { value: BILLING_SCOPE, label: tr("Scope only") },
        { value: BILLING_SEPARATE, label: tr("Bill separately") },
      ];
  const isMoneyEditable = (mode) =>
    mode === BILLING_LINE || mode === BILLING_SEPARATE;
  const setBillingMode = (rowId, mode) => {
    onUpdate(rowId, "billingMode", mode);
    if (!isMoneyEditable(mode)) {
      onUpdate(rowId, "basePrice", 0);
      onUpdate(rowId, "vat", 0);
    }
  };
  const toggleRowEdit = (rowId) => {
    setEditingRows((p) => ({ ...p, [rowId]: !p[rowId] }));
  };
  const billingLabelFor = (mode) =>
    (billingOptions.find((opt) => opt.value === mode) || {}).label ||
    mode ||
    "-";
  const readOnlyText = (extra = {}) => ({
    color: C.text,
    fontSize: 13.5,
    lineHeight: "20px",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    ...extra,
  });
  const lineTotals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          const rowBillingMode =
            row.billingMode ||
            billingModeForContext({
              fromQuotation: !!row._fromQuotation,
              packageMode,
              hasFinancialSource,
            });
          if (!isMoneyEditable(rowBillingMode) || packageMode) return acc;
          const rowCurrency = getRowCurrency(row);
          const amounts = calcLineAmounts(row.basePrice, row.vat, rowCurrency);
          // a row synced to a contract / quotation line converts at that
          // line's rate or on its document's date, so it forms its own group
          const basis = rowRateBasis(row, { extractCurrencyId, synced: rowBillingMode === BILLING_LINE, sourceRateDate });
          const key =
            `${extractCurrencyId(row.currencyId) ||
            extractCurrencyId(rowCurrency) ||
            getCurrencyCode(rowCurrency)}${basis.rate ? `@${basis.rate}` : basis.date ? `#${basis.date}` : ""}`;
          if (!acc.byCurrency[key]) {
            acc.byCurrency[key] = {
              rateBasis: basis,
              currency: rowCurrency,
              subTotal: 0,
              vatAmount: 0,
              totalAmount: 0,
              lines: [],
            };
          }
          acc.byCurrency[key].subTotal += amounts.subTotal;
          acc.byCurrency[key].vatAmount += amounts.vatAmount;
          acc.byCurrency[key].totalAmount += amounts.totalAmount;
          acc.byCurrency[key].lines.push(amounts);
          return {
            subTotal: acc.subTotal + amounts.subTotal,
            vatAmount: acc.vatAmount + amounts.vatAmount,
            totalAmount: acc.totalAmount + amounts.totalAmount,
            byCurrency: acc.byCurrency,
          };
        },
        { subTotal: 0, vatAmount: 0, totalAmount: 0, byCurrency: {} },
      ),
    [getRowCurrency, hasFinancialSource, packageMode, rows, sourceRateDate],
  );
  const lineTotalsByCurrency = useMemo(
    () => Object.values(lineTotals.byCurrency || {}),
    [lineTotals],
  );
  const hasMixedLineCurrencies = !packageMode && lineTotalsByCurrency.length > 1;
  const displayTotals = packageMode
    ? {
      subTotal: packageSummary?.subTotal || 0,
      vatAmount: packageSummary?.vatAmount || 0,
      totalAmount: packageSummary?.totalAmount || 0,
    }
    : lineTotals;
  const totalsCurrency =
    !packageMode && lineTotalsByCurrency[0]?.currency
      ? lineTotalsByCurrency[0].currency
      : currency;
  const baseCurrency = currency || findDefaultCurrency(currencies);
  const baseCurrencyId = extractCurrencyId(baseCurrency);
  const baseCurrencyCode = getCurrencyCode(baseCurrency);
  const sortedLineTotalsByCurrency = useMemo(
    () =>
      [...lineTotalsByCurrency].sort((a, b) =>
        getCurrencyCode(a.currency).localeCompare(getCurrencyCode(b.currency)),
      ),
    [lineTotalsByCurrency],
  );
  const needsCaseCurrencyConversion = useMemo(
    () =>
      !packageMode &&
      sortedLineTotalsByCurrency.some((group) => {
        const groupCurrency = group.currency || baseCurrency;
        const groupCurrencyId = extractCurrencyId(groupCurrency);
        const groupCurrencyCode = getCurrencyCode(groupCurrency);
        return !(
          (groupCurrencyId && baseCurrencyId && groupCurrencyId === baseCurrencyId) ||
          groupCurrencyCode === baseCurrencyCode
        );
      }),
    [baseCurrency, baseCurrencyCode, baseCurrencyId, packageMode, sortedLineTotalsByCurrency],
  );
  const shouldRenderCurrencySummary =
    !packageMode && sortedLineTotalsByCurrency.length > 0 && (hasMixedLineCurrencies || needsCaseCurrencyConversion);
  const exchangeSourceCurrencyIds = useMemo(
    () =>
      sortedLineTotalsByCurrency
        .map((group) => extractCurrencyId(group.currency))
        .filter((id) => id && id !== baseCurrencyId),
    [baseCurrencyId, sortedLineTotalsByCurrency],
  );
  const exchangeSourceCurrencyKey = useMemo(
    () => exchangeSourceCurrencyIds.slice().sort((a, b) => a - b).join(","),
    [exchangeSourceCurrencyIds],
  );
  useEffect(() => {
    let alive = true;
    if (packageMode || !baseCurrencyId || !exchangeSourceCurrencyIds.length) {
      setExchangeRates([]);
      setExchangeRatesLoading(false);
      return () => {
        alive = false;
      };
    }
    setExchangeRatesLoading(true);
    fetchExchangeRatesForConversion(exchangeSourceCurrencyIds, baseCurrencyId)
      .then((rows) => {
        if (alive) setExchangeRates(rows || []);
      })
      .catch(() => {
        if (alive) setExchangeRates([]);
      })
      .finally(() => {
        if (alive) setExchangeRatesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [baseCurrencyId, exchangeSourceCurrencyKey, packageMode]);
  const exchangeBreakdown = useMemo(
    () =>
      sortedLineTotalsByCurrency.map((group) => {
        const groupCurrency = group.currency || baseCurrency;
        const groupCurrencyId = extractCurrencyId(groupCurrency);
        const groupCurrencyCode = getCurrencyCode(groupCurrency);
        const sameBase =
          (groupCurrencyId && baseCurrencyId && groupCurrencyId === baseCurrencyId) ||
          groupCurrencyCode === baseCurrencyCode;
        const matched = sameBase
          ? null
          : group.rateBasis?.rate
            ? {
                rate: group.rateBasis.rate,
                record: { effectiveDate: group.rateBasis.date, source: tr("Linked line") },
                direction: "direct",
              }
            : pickConversionRate(exchangeRates, groupCurrency, baseCurrency, group.rateBasis?.date || pricingDate);
        const rateValue = sameBase ? 1 : matched?.rate || 0;
        const canConvert = sameBase || rateValue > 0;
        const converted = canConvert ? convertLinesToBase(group.lines, rateValue) : null;
        const convertedSubTotal = converted ? converted.subTotal : null;
        const convertedVatAmount = converted ? converted.vatAmount : null;
        return {
          // a group on a source line's rate / document date: its rows convert
          // through rowRateBasis, not the per-currency Open-date lookup
          frozen: !!(group.rateBasis?.rate || group.rateBasis?.date),
          currency: groupCurrency,
          currencyCode: groupCurrencyCode,
          subTotal: group.subTotal,
          vatAmount: group.vatAmount,
          totalAmount: group.totalAmount,
          rate: canConvert ? rateValue : null,
          rateRecord: matched?.record || null,
          rateDirection: matched?.direction || "base",
          status: sameBase ? "base" : canConvert ? "converted" : "missing",
          convertedSubTotal,
          convertedVatAmount,
          convertedTotalAmount: canConvert ? convertedSubTotal + convertedVatAmount : null,
        };
      }),
    [
      baseCurrency,
      baseCurrencyCode,
      baseCurrencyId,
      exchangeRates,
      pricingDate,
      sortedLineTotalsByCurrency,
    ],
  );
  const convertedSummary = useMemo(() => {
    if (packageMode || !exchangeBreakdown.length) return null;
    const missing = exchangeBreakdown.filter((item) => item.status === "missing");
    if (missing.length) {
      return {
        canConvert: false,
        missing,
      };
    }
    return exchangeBreakdown.reduce(
      (acc, item) => ({
        canConvert: true,
        subTotal: acc.subTotal + parseNum(item.convertedSubTotal),
        vatAmount: acc.vatAmount + parseNum(item.convertedVatAmount),
        totalAmount: acc.totalAmount + parseNum(item.convertedTotalAmount),
        missing: [],
      }),
      { canConvert: true, subTotal: 0, vatAmount: 0, totalAmount: 0, missing: [] },
    );
  }, [exchangeBreakdown, packageMode]);
  const conversionByCurrencyKey = useMemo(
    () =>
      exchangeBreakdown.reduce((acc, item) => {
        if (item.frozen) return acc; // its rows convert through rowRateBasis
        const idKey = extractCurrencyId(item.currency);
        const codeKey = getCurrencyCode(item.currency);
        if (idKey) acc[String(idKey)] = item;
        if (codeKey) acc[codeKey] = item;
        return acc;
      }, {}),
    [exchangeBreakdown],
  );
  const getConversionInfoForCurrency = (rowCurrency) =>
    conversionByCurrencyKey[String(extractCurrencyId(rowCurrency))] ||
    conversionByCurrencyKey[getCurrencyCode(rowCurrency)] ||
    null;
  // basis (rowRateBasis): a source line's rate, or a source document's date;
  // each part is rounded on its own, as money_line_amounts()
  const convertAmountsToBaseCurrency = (amounts, rowCurrency, basis = null) => {
    const frozen = basis?.rate ? basis : null;
    const sameCurrency =
      (extractCurrencyId(rowCurrency) && baseCurrencyId && extractCurrencyId(rowCurrency) === baseCurrencyId) ||
      getCurrencyCode(rowCurrency) === baseCurrencyCode;
    if (sameCurrency) {
      return {
        canConvert: true,
        sameCurrency: true,
        status: "base",
        rate: 1,
        subTotal: amounts.subTotal,
        vatAmount: amounts.vatAmount,
        totalAmount: amounts.totalAmount,
      };
    }
    if (frozen?.rate) {
      return {
        canConvert: true,
        sameCurrency: false,
        status: "converted",
        rate: frozen.rate,
        rateRecord: { effectiveDate: frozen.date, source: tr("Linked line") },
        ...convertLinesToBase([amounts], frozen.rate),
      };
    }
    if (basis?.date) {
      const matched = pickConversionRate(exchangeRates, rowCurrency, baseCurrency, basis.date);
      if (!matched?.rate) {
        return { canConvert: false, sameCurrency: false, status: "missing", rate: null, subTotal: null, vatAmount: null, totalAmount: null };
      }
      return {
        canConvert: true,
        sameCurrency: false,
        status: "converted",
        rate: matched.rate,
        rateRecord: matched.record,
        ...convertLinesToBase([amounts], matched.rate),
      };
    }
    const info = getConversionInfoForCurrency(rowCurrency);
    if (!info || info.status === "missing" || !info.rate) {
      return {
        canConvert: false,
        sameCurrency: false,
        status: "missing",
        rate: null,
        subTotal: null,
        vatAmount: null,
        totalAmount: null,
      };
    }
    return {
      canConvert: true,
      sameCurrency: false,
      status: info.status,
      rate: info.rate,
      rateRecord: info.rateRecord,
      ...convertLinesToBase([amounts], info.rate),
    };
  };
  // Converts every existing LINE-priced row into a package-included row the
  // moment the case's very first combo is applied (line mode -> package
  // mode), folding each row's own VND-converted subtotal into the starting
  // packageSubTotal instead of discarding it — combo/line pricing still
  // don't mix within one case, but a service that already had a real price
  // shouldn't just vanish when the case switches pricing modes.
  const foldLineRowsIntoPackage = (existingRows) => {
    let contributionVnd = 0;
    const convertedRows = existingRows.map((row) => {
      const rowBillingMode =
        row.billingMode ||
        billingModeForContext({ fromQuotation: !!row._fromQuotation, packageMode: false, hasFinancialSource });
      if (!isMoneyEditable(rowBillingMode)) {
        return { ...row, billingMode: BILLING_PACKAGE_INCLUDED, pricingMode: PRICING_MODE_PACKAGE, _packageBasePrice: 0 };
      }
      const rowCurrency = getRowCurrency(row);
      const amounts = calcLineAmounts(row.basePrice, row.vat, rowCurrency);
      const converted = convertAmountsToBaseCurrency(
        amounts,
        rowCurrency,
        rowRateBasis(row, { extractCurrencyId, synced: rowBillingMode === BILLING_LINE, sourceRateDate }),
      );
      const rowContributionVnd = converted.canConvert ? Math.round(converted.subTotal) : 0;
      contributionVnd += rowContributionVnd;
      return {
        ...row,
        basePrice: 0,
        vat: 0,
        billingMode: BILLING_PACKAGE_INCLUDED,
        pricingMode: PRICING_MODE_PACKAGE,
        _packageBasePrice: rowContributionVnd,
      };
    });
    return { rows: convertedRows, contributionVnd };
  };
  const RowEditIcon = ({ active }) =>
    React.createElement(
      "svg",
      {
        width: 15,
        height: 15,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": true,
      },
      active
        ? React.createElement("path", { d: "M20 6 9 17l-5-5" })
        : [
          React.createElement("path", {
            key: "p1",
            d: "M12 20h9",
          }),
          React.createElement("path", {
            key: "p2",
            d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
          }),
        ],
    );
  const TrashIcon = () =>
    React.createElement(
      "svg",
      {
        width: 15,
        height: 15,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": true,
      },
      React.createElement("path", { d: "M3 6h18" }),
      React.createElement("path", { d: "M8 6V4h8v2" }),
      React.createElement("path", { d: "M19 6l-1 14H6L5 6" }),
      React.createElement("path", { d: "M10 11v6" }),
      React.createElement("path", { d: "M14 11v6" }),
    );
  const TaskListIcon = () =>
    React.createElement(
      "svg",
      {
        width: 15,
        height: 15,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": true,
      },
      React.createElement("rect", { x: 3, y: 4, width: 18, height: 17, rx: 2 }),
      React.createElement("path", { d: "M7.5 11.5l1.5 1.5 3-3" }),
      React.createElement("path", { d: "M13 12h4" }),
      React.createElement("path", { d: "M7.5 16.5l1.5 1.5 3-3" }),
      React.createElement("path", { d: "M13 17h4" }),
    );
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
  // One header <tr> (colSpan across all 7 columns) rendered right before the
  // first row of each applied-combo section, so combo-derived rows are
  // visually grouped and identifiable — with an inline "Remove combo"
  // action instead of the old single free-floating conversion note.
  // A package row's own basePrice is always 0 — this looks up what that one
  // line would cost standalone, from the combo catalog snapshot (matched via
  // the row's own _comboCatalogId + serviceId), purely for display.
  const getComboLineIndividualPrice = (row) => {
    // Use the applied item's snapshot first (checked before the combo/id
    // lookups below, so this also covers ad-hoc combos, which have no
    // _comboCatalogId at all) — so later catalog edits don't rewrite what
    // the user saw when selecting this combo.
    if (row?._comboItemSnapshot) return row._comboItemSnapshot;
    const comboIdVal = runtimeExtractId(row?._comboCatalogId);
    if (!comboIdVal) return null;
    const catalogCombo = combos.find((c) => runtimeExtractId(c.id) === comboIdVal);
    if (!catalogCombo) return null;
    const svcIdVal = runtimeExtractId(row?.serviceId);
    const item = (catalogCombo.serviceComboItems || []).find((it) =>
      runtimeExtractId(it.serviceId || it.services) === svcIdVal ||
      runtimeExtractId(it.services?.id) === svcIdVal,
    );
    if (!item) return null;
    const svc = item.services || {};
    return {
      // Always use the child snapshot. The live service price is unrelated.
      price: parseNum(item.price),
      vat: parseNum(item.vat),
      currency: currencyFromRecord(
        item,
        currencies,
        currencyFromRecord(catalogCombo, currencies, defaultCurrencyObject()),
      ),
    };
  };

  // Reference-only comparison against the combo's catalog definition — the
  // same figures the "Apply Combo" picker shows before applying, resurfaced
  // here so they stay visible once the package is on the case. Doesn't
  // affect combo.originalAmount, the actual per-instance amount charged.
  const getComboHeaderPriceComparison = (combo) => {
    const comboIdVal = runtimeExtractId(combo?.comboId);
    if (!comboIdVal) return null;
    const catalogCombo = combos.find((c) => runtimeExtractId(c.id) === comboIdVal);
    if (!catalogCombo) return null;
    const comboCurrencyIdFallback = extractCurrencyId(currencyFromRecord(catalogCombo, currencies, vndCurrency));
    // Each item can be snapshotted in its own currency (item.currencyId),
    // independent of the combo's own currency — convert every item to VND
    // before summing, so a combo mixing currencies still totals correctly.
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

  const renderComboSectionHeader = (combo, instanceId) => {
    const priceComparison = getComboHeaderPriceComparison(combo);
    return React.createElement(
      "tr",
      { key: `combo-header-${instanceId}` },
      React.createElement(
        "td",
        {
          colSpan: 7,
          style: {
            padding: "10px 12px",
            background: "#f0f5ff",
            borderTop: "2px solid #91caff",
            borderBottom: "1px solid #91caff",
          },
        },
        React.createElement(
          "div",
          {
            style: {
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
            combo &&
              React.createElement(
                "div",
                { style: { display: "flex", alignItems: "center", gap: 6 } },
                combo.wasConverted &&
                  React.createElement(
                    "span",
                    { style: { fontSize: 11, color: C.textSub, fontFamily: FONT_MONO } },
                    `${combo.originalAmount.toLocaleString("vi-VN")} ${combo.currencyCode} →`,
                  ),
                React.createElement(
                  "div",
                  { style: { width: 150 } },
                  React.createElement(PriceInput, {
                    value: combo.convertedAmount,
                    currency: defaultCurrencyObject(),
                    onChange: (v) => onUpdateComboAmount?.(instanceId, v),
                  }),
                ),
              ),
            priceComparison &&
              React.createElement(
                "span",
                { style: { fontSize: 11.5, color: C.textSub } },
                tr("Individual price: {0}", { 0: formatMoney(priceComparison.individualTotal, priceComparison.currency) }),
              ),
            priceComparison && priceComparison.savings > 0 &&
              React.createElement(
                "span",
                { style: { fontSize: 11.5, color: C.success, fontWeight: 600 } },
                tr("Save {0} ({1}%)", { 0: formatMoney(priceComparison.savings, priceComparison.currency), 1: priceComparison.savingsPct }),
              ),
            onAddServiceToCombo &&
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    setComboAddInstanceId(instanceId);
                    setPickerOpen(true);
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
        ),
      ),
    );
  };
  const taskFieldForRow = (row) => (row?.serviceId ? "_templateTasks" : "_customTaskTemplates");
  const editableTasksForRow = (row) =>
    getRowTaskTemplates(taskTemplates, row).map((task, index) => ({
      ...task,
      _id: task?._id || task?.id || `${row?._id || "row"}-${index}`,
      templateName: getTaskTemplateRawTitle(task),
      title: getTaskTemplateRawTitle(task),
      description: getTaskTemplateDescription(task),
      sortOrder: getTaskTemplateSortOrder(task, index + 1),
      // Payment trigger — carried from the template's catalog default
      // (projectTemplates.isPaymentTrigger) or the contract's saved
      // selection; no longer editable here (2026-09-25), change it per task
      // in Task Management.
      // See docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md.
      isPaymentTrigger: !!task?.isPaymentTrigger,
    }));
  const setEditableTasksForRow = (row, tasks) => {
    onUpdate(
      row._id,
      taskFieldForRow(row),
      tasks.map((task, index) => ({
        ...task,
        templateName: normalizeTaskText(task.templateName || task.title),
        title: normalizeTaskText(task.title || task.templateName),
        description: normalizeTaskText(task.description),
        sortOrder: getTaskTemplateSortOrder(task, index + 1),
        _customDraft: !row.serviceId || task._customDraft,
      })),
    );
  };
  const updateEditableTask = (row, taskIndex, field, value) => {
    const tasks = editableTasksForRow(row);
    const next = tasks.map((task, index) => {
      if (index !== taskIndex) return task;
      if (field === "title") {
        return { ...task, title: value, templateName: value };
      }
      return { ...task, [field]: value };
    });
    setEditableTasksForRow(row, next);
  };
  const addEditableTask = (row) => {
    const tasks = editableTasksForRow(row);
    setEditableTasksForRow(row, [
      ...tasks,
      {
        _id: Date.now() + Math.random(),
        title: "",
        templateName: "",
        description: "",
        sortOrder: tasks.length + 1,
        _customDraft: !row.serviceId,
      },
    ]);
  };
  const removeEditableTask = (row, taskIndex) => {
    const tasks = editableTasksForRow(row).filter((_, index) => index !== taskIndex);
    setEditableTasksForRow(row, tasks);
  };
  // Renders the editable task-name/description table for ONE service row —
  // shown inside the "View task" Modal (renderTaskOverviewModal below)
  // instead of always-expanded for every row at once.
  const renderTaskCard = (row) => {
    const tasks = editableTasksForRow(row);
    // No "Trigger" column (removed 2026-09-25, user request): each task keeps
    // its template's isPaymentTrigger default (or the contract's saved
    // selection); payment triggers are set in Task Management.
    return React.createElement(
      "div",
      { style: { display: "grid", gap: 12 } },
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", justifyContent: "flex-end" } },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () => addEditableTask(row),
            style: {
              border: `1px dashed ${C.primary}`,
              background: "#fff",
              color: C.primary,
              borderRadius: 6,
              padding: "5px 10px",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 500,
              fontFamily: FONT,
            },
          },
          tr("+ Add task"),
        ),
      ),
      tasks.length === 0
        ? React.createElement(
          "div",
          {
            style: {
              padding: "16px 12px",
              color: C.textSub,
              fontSize: 13,
              background: "#fff",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
            },
          },
          tr("No sample tasks. Add a task if this service needs work items."),
        )
        : React.createElement(
          "div",
          { style: { overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 8 } },
          React.createElement(
            "table",
            {
              style: {
                width: "100%",
                minWidth: 640,
                borderCollapse: "collapse",
              },
            },
            React.createElement(
              "thead",
              null,
              React.createElement(
                "tr",
                null,
                React.createElement("th", { style: th({ width: 48, textAlign: "center" }) }, "#"),
                React.createElement("th", { style: th({ minWidth: 200 }) }, tr("Task name")),
                React.createElement("th", { style: th({ minWidth: 260 }) }, tr("Description")),
                React.createElement("th", { style: th({ width: 64, textAlign: "center" }) }, ""),
              ),
            ),
            React.createElement(
              "tbody",
              null,
              tasks.map((task, taskIndex) =>
                React.createElement(
                  "tr",
                  { key: task._id || taskIndex },
                  React.createElement(
                    "td",
                    { style: td({ textAlign: "center", color: C.textSub, fontSize: 12 }) },
                    taskIndex + 1,
                  ),
                  React.createElement(
                    "td",
                    { style: td({ verticalAlign: "top" }) },
                    React.createElement("input", {
                      value: task.title || task.templateName || "",
                      onChange: (event) =>
                        updateEditableTask(row, taskIndex, "title", event.target.value),
                      placeholder: tr("Task name"),
                      style: inp({ fontSize: 13, padding: "6px 9px" }),
                      onFocus,
                      onBlur,
                    }),
                  ),
                  React.createElement(
                    "td",
                    { style: td({ verticalAlign: "top" }) },
                    React.createElement("textarea", {
                      value: task.description || "",
                      onChange: (event) =>
                        updateEditableTask(row, taskIndex, "description", event.target.value),
                      placeholder: tr("Task description..."),
                      rows: 2,
                      style: {
                        ...inp({
                          minHeight: 48,
                          resize: "vertical",
                          fontSize: 13,
                          lineHeight: "18px",
                        }),
                      },
                      onFocus,
                      onBlur,
                    }),
                  ),
                  React.createElement(
                    "td",
                    { style: td({ textAlign: "center", verticalAlign: "top" }) },
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        title: tr("Remove task"),
                        onClick: () => removeEditableTask(row, taskIndex),
                        style: iconButtonStyle(C.danger),
                      },
                      React.createElement(TrashIcon),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
    );
  };

  const renderTaskOverviewModal = () => {
    const activeRow = serviceTaskPreviewRows.find((row) => row._id === taskOverviewRowId);
    if (!activeRow) return null;
    return Modal
      ? React.createElement(
        Modal,
        {
          open: true,
          title: tr("Sample tasks — {0}", { 0: activeRow.serviceName || tr("Custom service") }),
          onCancel: () => setTaskOverviewRowId(null),
          footer: null,
          width: 720,
          destroyOnClose: true,
        },
        renderTaskCard(activeRow),
      )
      : null;
  };

  const formatRateValue = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    });
  };

  const renderViewBreakdownButton = () =>
    React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setBreakdownOpen(true),
        style: {
          border: `1px solid ${C.border}`,
          background: "#fff",
          color: C.primary,
          borderRadius: 6,
          padding: "5px 10px",
          cursor: "pointer",
          fontSize: 12.5,
          fontWeight: 600,
          fontFamily: FONT,
          whiteSpace: "nowrap",
        },
      },
      tr("View currency breakdown ({0} currencies)", { 0: new Set(sortedLineTotalsByCurrency.map((group) => getCurrencyCode(group.currency))).size }),
    );

  const renderCompactCurrencyRow = (group) =>
    React.createElement(
      "div",
      {
        key: getCurrencyCode(group.currency),
        style: {
          display: "grid",
          gridTemplateColumns: "72px minmax(0, 1fr)",
          alignItems: "baseline",
          gap: 12,
          padding: "5px 0",
          borderBottom: `1px dashed ${C.border}`,
        },
      },
      React.createElement(
        "span",
        {
          style: {
            color: C.textSub,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: FONT,
          },
        },
        getCurrencyCode(group.currency),
      ),
      React.createElement(
        "span",
        {
          title: formatMoney(group.totalAmount, group.currency),
          style: {
            color: C.text,
            fontSize: 13.5,
            fontWeight: 700,
            fontFamily: FONT_MONO,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textAlign: "right",
          },
        },
        formatMoney(group.totalAmount, group.currency),
      ),
    );

  const renderMixedTotalsSummary = () => {
    const visibleGroups = sortedLineTotalsByCurrency.slice(0, 3);
    const hiddenCount = Math.max(sortedLineTotalsByCurrency.length - visibleGroups.length, 0);
    const currencyCount = sortedLineTotalsByCurrency.length;
    const currencyWord = currencyCount === 1 ? "currency" : "currencies";
    const missing = convertedSummary?.missing || [];
    const missingLabel = missing
      .slice(0, 3)
      .map((item) => `${item.currencyCode} → ${baseCurrencyCode}`)
      .join(", ");

    return React.createElement(
      "div",
      {
        style: {
          width: "min(100%, 520px)",
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          background: "#fff",
          padding: "12px 14px",
          boxSizing: "border-box",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 8,
          },
        },
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            { style: { fontSize: 14, fontWeight: 700, color: C.text, fontFamily: FONT } },
            tr("Totals"),
          ),
          React.createElement(
            "div",
            { style: { fontSize: 12, color: C.textSub, marginTop: 2, fontFamily: FONT } },
            tr("{0} {1} used", { 0: currencyCount, 1: currencyWord }),
          ),
        ),
        renderViewBreakdownButton(),
      ),
      React.createElement(
        "div",
        null,
        visibleGroups.map(renderCompactCurrencyRow),
        hiddenCount > 0 &&
          React.createElement(
            "button",
            {
              type: "button",
              onClick: () => setBreakdownOpen(true),
              style: {
                border: "none",
                background: "transparent",
                padding: "6px 0 0",
                color: C.primary,
                cursor: "pointer",
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: FONT,
              },
            },
            tr("+{0} more currencies", { 0: hiddenCount }),
          ),
      ),
      React.createElement(
        "div",
        {
          style: {
            marginTop: 10,
            paddingTop: 10,
            borderTop: `1px solid ${C.border}`,
            display: "grid",
            gap: 5,
          },
        },
        exchangeRatesLoading
          ? React.createElement(
            "div",
            { style: { color: C.textSub, fontSize: 12.5, fontFamily: FONT } },
            tr("Checking exchange rates..."),
          )
          : convertedSummary?.canConvert
            ? React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 14,
                  alignItems: "baseline",
                },
              },
              React.createElement(
                "span",
                { style: { color: C.textSub, fontSize: 12.5, fontFamily: FONT } },
                tr("Converted total in {0}", { 0: baseCurrencyCode }),
              ),
              React.createElement(
                "span",
                {
                  style: {
                    color: C.success,
                    fontSize: 16,
                    fontWeight: 800,
                    fontFamily: FONT_MONO,
                    whiteSpace: "nowrap",
                  },
                },
                formatMoney(convertedSummary.totalAmount, baseCurrency),
              ),
            )
            : React.createElement(
              "div",
              { style: { color: C.warning, fontSize: 12.5, fontFamily: FONT, lineHeight: "18px" } },
              missing.length
                ? tr("Missing rates: {0}{1}", { 0: missingLabel, 1: missing.length > 3 ? tr(" +{0} more", { 0: missing.length - 3 }) : "" })
                : tr("Conversion not available"),
            ),
      ),
    );
  };

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
    color: bold ? C.text : C.textSub,
    fontWeight: bold ? 700 : 400,
    fontFamily: FONT,
    whiteSpace: "nowrap",
    flexShrink: 0,
  });
  const summaryValueStyle = (color, bold) => ({
    fontSize: bold ? 18 : 13.5,
    color,
    fontWeight: bold ? 700 : 600,
    fontFamily: FONT_MONO,
    whiteSpace: "nowrap",
  });

  const renderSingleTotalsSummary = () =>
    React.createElement(
      "div",
      { style: { minWidth: 420 } },
      packageMode
        ? [
          React.createElement(
            "div",
            { key: "packageSubTotal", style: { padding: "5px 0", borderBottom: `1px dashed ${C.border}` } },
            React.createElement(
              "div",
              { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24 } },
              React.createElement("span", { style: summaryLabelStyle(false) }, tr("Combo subtotal:")),
              React.createElement(PriceInput, {
                value: packageSummary?.subTotal || 0,
                onChange: (value) => onPackageChange?.("packageSubTotal", value),
                currency: totalsCurrency,
              }),
            ),
          ),
          React.createElement(
            "div",
            { key: "packageVatRate", style: summaryRowStyle(true) },
            React.createElement("span", { style: summaryLabelStyle(false) }, tr("VAT (%):")),
            InputNumber
              ? React.createElement(InputNumber, {
                min: 0,
                max: 100,
                step: 0.1,
                value: packageSummary?.vatRate || 0,
                onChange: (value) => onPackageChange?.("packageVatRate", parseFloat(value) || 0),
                addonAfter: "%",
                style: { width: 140 },
              })
              : React.createElement("input", {
                type: "number",
                min: 0,
                max: 100,
                step: 0.1,
                value: packageSummary?.vatRate || 0,
                onChange: (e) =>
                  onPackageChange?.("packageVatRate", parseFloat(e.target.value) || 0),
                style: inp({ textAlign: "right", fontWeight: 700, width: 100 }),
              }),
          ),
          React.createElement(
            "div",
            { key: "vatAmount", style: summaryRowStyle(true) },
            React.createElement("span", { style: summaryLabelStyle(false) }, tr("VAT amount:")),
            React.createElement(
              "span",
              { style: summaryValueStyle(C.warning, false) },
              formatMoney(displayTotals.vatAmount, totalsCurrency),
            ),
          ),
          React.createElement(
            "div",
            { key: "packageTotal", style: summaryRowStyle(false) },
            React.createElement("span", { style: summaryLabelStyle(true) }, tr("Combo total:")),
            React.createElement(
              "span",
              { style: summaryValueStyle(C.success, true) },
              formatMoney(displayTotals.totalAmount, totalsCurrency),
            ),
          ),
        ]
        : [
          [tr("Subtotal (excl. VAT)"), formatMoney(displayTotals.subTotal, totalsCurrency), C.textSub, false],
          [tr("VAT amount"), formatMoney(displayTotals.vatAmount, totalsCurrency), C.warning, false],
          [tr("Total"), formatMoney(displayTotals.totalAmount, totalsCurrency), C.success, true],
        ].map(([label, val, color, bold], i) =>
          React.createElement(
            "div",
            { key: label, style: summaryRowStyle(i < 2) },
            React.createElement("span", { style: summaryLabelStyle(bold) }, label + ":"),
            React.createElement("span", { style: summaryValueStyle(color, bold) }, val),
          ),
        ),
    );

  const renderExchangeBreakdownModal = () =>
    Modal &&
    React.createElement(
      Modal,
      {
        title: tr("Currency breakdown"),
        open: breakdownOpen,
        visible: breakdownOpen,
        onCancel: () => setBreakdownOpen(false),
        footer: null,
        width: 900,
        destroyOnClose: true,
      },
      React.createElement(
        "div",
        { style: { fontFamily: FONT } },
        React.createElement(
          "div",
          {
            style: {
              marginBottom: 12,
              color: C.textSub,
              fontSize: 12.5,
              lineHeight: "18px",
            },
          },
          tr("Base currency: {0}. Only currencies used in this case are listed here.", { 0: baseCurrencyCode }),
        ),
        React.createElement(
          "div",
          { style: { overflowX: "auto" } },
          React.createElement(
            "table",
            {
              style: {
                width: "100%",
                minWidth: 760,
                borderCollapse: "collapse",
              },
            },
            React.createElement(
              "thead",
              null,
              React.createElement(
                "tr",
                null,
                [tr("Currency"), tr("Original total"), tr("Rate to {0}", { 0: baseCurrencyCode }), tr("Converted total"), tr("Effective date"), tr("Source")].map((label, i) =>
                  React.createElement(
                    "th",
                    {
                      key: label,
                      style: th({
                        // Original total, Rate, Converted total are numbers
                        textAlign: i >= 1 && i <= 3 ? "right" : "left",
                      }),
                    },
                    label,
                  ),
                ),
              ),
            ),
            React.createElement(
              "tbody",
              null,
              exchangeBreakdown.map((item, itemIndex) => {
                const isMissing = item.status === "missing";
                const source =
                  item.status === "base"
                    ? tr("Base currency")
                    : `${item.rateRecord?.source || item.rateRecord?.status || tr("Manual")}${item.rateDirection === "inverse" ? " (inverse)" : ""}`;
                return React.createElement(
                  "tr",
                  { key: `${item.currencyCode}-${itemIndex}` },
                  React.createElement(
                    "td",
                    { style: td({ fontWeight: 700, color: C.text }) },
                    item.currencyCode,
                  ),
                  React.createElement(
                    "td",
                    { style: td({ textAlign: "right", fontFamily: FONT_MONO, fontWeight: 700 }) },
                    formatMoney(item.totalAmount, item.currency),
                  ),
                  React.createElement(
                    "td",
                    {
                      style: td({
                        textAlign: "right",
                        fontFamily: FONT_MONO,
                        color: isMissing ? C.warning : C.text,
                        fontWeight: 700,
                      }),
                    },
                    isMissing ? tr("Missing") : formatRateValue(item.rate),
                  ),
                  React.createElement(
                    "td",
                    {
                      style: td({
                        textAlign: "right",
                        fontFamily: FONT_MONO,
                        color: isMissing ? C.textSub : C.success,
                        fontWeight: 800,
                      }),
                    },
                    isMissing ? "-" : formatMoney(item.convertedTotalAmount, baseCurrency),
                  ),
                  React.createElement(
                    "td",
                    { style: td({ color: C.textSub, fontSize: 12.5 }) },
                    item.rateRecord?.effectiveDate
                      ? fmtDateTime(item.rateRecord.effectiveDate).split(",")[0]
                      : item.status === "base"
                        ? "-"
                        : tr("No rate"),
                  ),
                  React.createElement(
                    "td",
                    { style: td({ color: C.textSub, fontSize: 12.5 }) },
                    source,
                  ),
                );
              }),
            ),
          ),
        ),
        convertedSummary?.canConvert &&
          React.createElement(
            "div",
            {
              style: {
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 7,
                background: "#f6ffed",
                border: "1px solid #b7eb8f",
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
              },
            },
            React.createElement(
              "span",
              { style: { fontWeight: 700, color: C.text } },
              tr("Converted total in {0}", { 0: baseCurrencyCode }),
            ),
            React.createElement(
              "span",
              { style: { fontWeight: 800, color: C.success, fontFamily: FONT_MONO } },
              formatMoney(convertedSummary.totalAmount, baseCurrency),
            ),
          ),
      ),
    );

  return React.createElement(
    "div",
    {
      style: {
        position: "relative",
        opacity: internalCompanyId ? 1 : 0.55,
        pointerEvents: internalCompanyId ? "auto" : "none",
      },
    },
    !internalCompanyId &&
    React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          inset: 0,
          zIndex: 10,
          background: "rgba(255,255,255,0.65)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            background: "#fefce8",
            border: `1px solid #fde68a`,
            padding: "10px 20px",
            borderRadius: 8,
            color: C.warning,
            fontWeight: 600,
            fontSize: 14,
            fontFamily: FONT,
          },
        },
        tr("Please select an Internal Company first"),
      ),
    ),
    pickerOpen &&
    React.createElement(ServicePickerModal, {
      svcOpts,
      selectedIds,
      internalCompanyId,
      taskTemplates,
      setTaskTemplates,
      currency,
      currencies,
      combos,
      comboScopeId: comboAddInstanceId,
      comboTargets: packageMode ? comboTargets : [],
      comboTarget: addToComboTarget,
      onComboTargetChange: setAddToComboTarget,
      convertComboAmountToVndSync,
      vndCurrency,
      onSelect: (svc) => {
        if (comboAddInstanceId) {
          onAddServiceToCombo?.(comboAddInstanceId, svc);
        } else if (addToComboTarget && packageMode) {
          onAddServiceToCombo?.(addToComboTarget, svc);
        } else {
          onAddFromService(svc);
        }
        closePicker();
      },
      onClose: closePicker,
      onCreateAndSelect: async (data) => {
        if (comboAddInstanceId) {
          onAddServiceToCombo?.(comboAddInstanceId, data);
        } else if (addToComboTarget && packageMode) {
          onAddServiceToCombo?.(addToComboTarget, data);
        } else {
          await onAddFromService(data, true);
        }
      },
      onApplyCombo: (comboId) => {
        onApplyCombo?.(comboId);
        closePicker();
      },
      onApplyAdhocCombo: (payload) => {
        onApplyAdhocCombo?.(payload);
        closePicker();
      },
    }),
    React.createElement(
      "div",
      {
        style: {
          padding: "12px 16px",
          background: C.bgSection,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        },
      },
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8 } },
        React.createElement(
          "span",
          {
            style: {
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 13,
              color: C.text,
            },
          },
          tr("Service List"),
        ),
        React.createElement(
          "span",
          {
            style: {
              fontSize: 12,
              color: C.textSub,
            },
          },
          tr("{0} services", { 0: rows.length }),
        ),
        fromQuotationCount > 0 &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 11.5,
              color: C.textSub,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 4,
            },
          },
          React.createElement(
            React.Fragment,
            null,
            FileTextIcon,
            tr("{0} from quotation", { 0: fromQuotationCount }),
          ),
        ),
        fromContractCount > 0 &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 11.5,
              color: C.textSub,
              fontWeight: 500,
            },
          },
          tr("{0} from contract", { 0: fromContractCount }),
        ),
        packageMode &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 11.5,
              color: C.textSub,
              fontWeight: 500,
            },
          },
          tr("{0} included in combo", { 0: packageIncludedCount }),
        ),
      ),
      Button
        ? React.createElement(
          Button,
          {
            type: "dashed",
            icon: PlusIcon,
            onClick: openTopLevelPicker,
          },
          tr("New service"),
        )
        : React.createElement(
          "div",
          {
            onClick: openTopLevelPicker,
            style: {
              padding: "5px 14px",
              borderRadius: 6,
              border: `1px dashed ${C.primary}`,
              background: "#fff",
              color: C.primary,
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: FONT,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            },
          },
          React.createElement(React.Fragment, null, PlusIcon, tr("New service")),
        ),
    ),
    React.createElement(
      "div",
      {
        style: {
          padding: "14px 16px",
          borderBottom: `1px solid ${C.border}`,
          background: "#fff",
        },
      },
      React.createElement(
        "div",
        { style: { minWidth: 0, maxWidth: 330 } },
        React.createElement(
          "div",
          {
            style: {
              fontSize: 11.5,
              fontWeight: 700,
              color: C.textSub,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0,
              fontFamily: FONT,
            },
          },
          tr("Pricing Mode"),
        ),
        React.createElement(
          React.Fragment,
          null,
          Segmented
            ? React.createElement(Segmented, {
              block: true,
              value: pricingMode,
              onChange: (value) => onPricingModeChange?.(value),
              options: [
                { value: PRICING_MODE_LINE, label: tr("Line pricing") },
                { value: PRICING_MODE_PACKAGE, label: tr("Combo pricing") },
              ],
              style: { width: "100%", maxWidth: 330 },
            })
            : React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  border: `1px solid ${C.border}`,
                  borderRadius: 7,
                  overflow: "hidden",
                  width: "100%",
                  maxWidth: 330,
                },
              },
              [
                [PRICING_MODE_LINE, tr("Line pricing")],
                [PRICING_MODE_PACKAGE, tr("Combo pricing")],
              ].map(([mode, label]) =>
                React.createElement(
                  "button",
                  {
                    key: mode,
                    type: "button",
                    onClick: () => onPricingModeChange?.(mode),
                    style: {
                      border: "none",
                      borderRight: mode === PRICING_MODE_LINE ? `1px solid ${C.border}` : "none",
                      background: pricingMode === mode ? C.primary : "#fff",
                      color: pricingMode === mode ? "#fff" : C.text,
                      padding: "9px 14px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: FONT,
                      flex: "1 1 0",
                      whiteSpace: "nowrap",
                    },
                  },
                  label,
                ),
              ),
            ),
        ),
      ),
    ),
    React.createElement(
      "div",
      { style: { overflowX: "auto" } },
      React.createElement(
        "table",
        {
          style: {
            width: "100%",
            borderCollapse: "collapse",
            minWidth: packageMode ? 820 : 930,
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
              { style: th({ width: 36, textAlign: "center" }) },
              "#",
            ),
            React.createElement(
              "th",
              { style: th({ minWidth: 280 }) },
              tr("Service Name & Type"),
            ),
            React.createElement(
              "th",
              { style: th({ minWidth: 320 }) },
              tr("Description"),
            ),
            React.createElement(
              "th",
              { style: th({ width: 180, textAlign: "right" }) },
              tr("Unit Price"),
            ),
            React.createElement(
              "th",
              { style: th({ width: 80, textAlign: "center" }) },
              tr("VAT (%)"),
            ),
            React.createElement(
              "th",
              { style: th({ width: 160, textAlign: "right", color: "#1d4ed8" }) },
              tr("Total"),
            ),
            React.createElement("th", { style: th({ width: 84 }) }, ""),
          ),
        ),
        React.createElement(
          "tbody",
          null,
          rows.length === 0
            ? React.createElement(
              "tr",
              null,
              React.createElement(
                "td",
                {
                  colSpan: 7,
                  style: {
                    ...td(),
                    textAlign: "center",
                    color: "#9ca3af",
                    padding: "36px 0",
                    fontSize: 13,
                  },
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
                    "span",
                    { style: { color: C.textSub } },
                    ClipboardIcon,
                  ),
                  React.createElement(
                    "span",
                    null,
                    tr("No services yet - click \"New service\""),
                  ),
                ),
              ),
            )
            : rows.map((r, i) => {
              const rowSampleTasks = getRowTaskTemplates(taskTemplates, r);
              const isRowEdit = !!editingRows[r._id];
              const isEditDesc = isRowEdit;
              const isFromQuotation = !!r._fromQuotation;
              const rowBillingMode =
                r.billingMode ||
                billingModeForContext({
                  fromQuotation: isFromQuotation,
                  packageMode,
                  hasFinancialSource,
                });
              const moneyEditable = isMoneyEditable(rowBillingMode);
              const rowCurrency = getRowCurrency(r);
              const lineAmount =
                !packageMode && moneyEditable
                  ? calcLineAmounts(r.basePrice, r.vat, rowCurrency)
                  : null;
              const convertedLineAmount = lineAmount
                ? convertAmountsToBaseCurrency(
                    lineAmount,
                    rowCurrency,
                    rowRateBasis(r, { extractCurrencyId, synced: rowBillingMode === BILLING_LINE, sourceRateDate }),
                  )
                : null;
              // The "#" column numbers rows per section (combo instance, or
              // the contiguous run of non-combo rows) instead of across the
              // whole table — walk backward while the previous row shares
              // the same _comboInstanceId (or is also non-combo) so each
              // combo's own services read as 1, 2, 3... A combo section
              // header renders right before the first row of that section.
              let sectionRowIndex = 1;
              for (let j = i - 1; j >= 0; j--) {
                if ((rows[j]._comboInstanceId || null) !== (r._comboInstanceId || null)) break;
                sectionRowIndex++;
              }
              const isComboSectionStart = !!r._comboInstanceId && sectionRowIndex === 1;
              const comboSectionHeader = isComboSectionStart
                ? renderComboSectionHeader(
                  appliedCombos.find((c) => c.instanceId === r._comboInstanceId),
                  r._comboInstanceId,
                )
                : null;
              // Section grouping is adjacency-based (no closing marker), so a
              // plain row landing right after a combo's last row would
              // otherwise render with no visual boundary at all, reading as
              // if it were still part of that combo above. A top border on
              // exactly this transition (combo row -> non-combo row) makes
              // the section's actual end visible without touching the
              // grouping/counting logic itself.
              const isLeavingComboSection = !r._comboInstanceId && i > 0 && !!rows[i - 1]._comboInstanceId;
              return [
                comboSectionHeader,
                React.createElement(
                "tr",
                {
                  key: r._id,
                  style: {
                    background: isFromQuotation
                      ? i % 2 === 0
                        ? "#f0f9ff"
                        : "#e8f4fd"
                      : i % 2 === 0
                        ? "#fff"
                        : "#fafafa",
                    ...(isLeavingComboSection ? { borderTop: "2px solid #91caff" } : {}),
                  },
                },
                React.createElement(
                  "td",
                  {
                    style: {
                      ...td(),
                      textAlign: "center",
                      color: C.textSub,
                      fontSize: 12,
                      fontWeight: 600,
                      paddingTop: 13,
                    },
                  },
                  isFromQuotation
                    ? React.createElement(
                      "span",
                      { title: tr("From quotation"), style: { display: "inline-flex", color: C.primary } },
                      FileTextIcon,
                    )
                    : sectionRowIndex,
                ),
                React.createElement(
                  "td",
                  { style: { ...td(), paddingTop: 11 } },
                  isRowEdit
                    ? React.createElement(
                      "div",
                      { style: { display: "grid", gap: 6 } },
                      React.createElement("input", {
                        value: r.serviceName || "",
                        onChange: (e) =>
                          onUpdate(r._id, "serviceName", e.target.value),
                        placeholder: tr("Service name..."),
                        style: inp({ fontSize: 13.5, padding: "6px 9px" }),
                        onFocus,
                        onBlur,
                      }),
                      React.createElement("input", {
                        value: r.serviceType || "",
                        onChange: (e) =>
                          onUpdate(r._id, "serviceType", e.target.value),
                        placeholder: tr("Service type..."),
                        style: inp({ fontSize: 12.5, padding: "5px 9px" }),
                        onFocus,
                        onBlur,
                      }),
                    )
                    : React.createElement(
                      "div",
                        {
                          title: r.serviceName || "",
                        style: {
                          ...readOnlyText({ fontWeight: 600 }),
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        },
                      },
                      React.createElement(
                        "span",
                        {
                          style: {
                            whiteSpace: "normal",
                            overflowWrap: "anywhere",
                          },
                        },
                        r.serviceName || "-",
                      ),
                      r.serviceType &&
                      React.createElement(
                        "span",
                        {
                          style: {
                            alignSelf: "flex-start",
                            fontSize: 10.5,
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            padding: "1px 6px",
                            borderRadius: 4,
                            fontWeight: 500,
                            lineHeight: "15px",
                          },
                        },
                        r.serviceType,
                      ),
                      React.createElement(
                        "span",
                        {
                          style: {
                            alignSelf: "flex-start",
                            fontSize: 10.5,
                            background: rowSampleTasks.length ? "#f0fdf4" : C.bgSection,
                            color: rowSampleTasks.length ? C.success : C.textSub,
                            padding: "1px 6px",
                            borderRadius: 4,
                            fontWeight: 600,
                            lineHeight: "15px",
                          },
                        },
                        tr("{0} sample tasks", { 0: rowSampleTasks.length }),
                      ),
                    ),
                ),
                React.createElement(
                  "td",
                  { style: { ...td(), paddingTop: 8, minWidth: 320 } },
                  isEditDesc
                    ? React.createElement("textarea", {
                      autoFocus: true,
                      value: r.description || "",
                      onChange: (e) =>
                        onUpdate(r._id, "description", e.target.value),
                      placeholder: tr("Enter description..."),
                      rows: 3,
                      style: {
                        ...inp({
                          fontSize: 12.5,
                          padding: "6px 9px",
                          lineHeight: "18px",
                          resize: "vertical",
                          minHeight: 64,
                        }),
                      },
                      onFocus,
                      onBlur,
                    })
                    : React.createElement(
                      "div",
                      {
                        style: {
                          minHeight: 34,
                          padding: "4px 6px",
                          borderRadius: 5,
                          border: `1px dashed ${C.border}`,
                          background: "#fafafa",
                          lineHeight: "18px",
                        },
                      },
                      r.description
                        ? React.createElement(ExpandableText, {
                          text: r.description,
                          limit: 100,
                        })
                        : React.createElement(
                          "span",
                          {
                            style: {
                              fontSize: 12,
                              color: "#d1d5db",
                              fontStyle: "italic",
                            },
                          },
                          tr("No description"),
                        ),
                    ),
                ),
                React.createElement(
                  "td",
                  { style: { ...td(), paddingTop: 10, textAlign: "right" } },
                  isRowEdit && moneyEditable && !packageMode
                    ? React.createElement(
                      "div",
                      { style: { display: "grid", gap: 6 } },
                      React.createElement(PriceInput, {
                        value: r.basePrice || 0,
                        onChange: (v) => onUpdate(r._id, "basePrice", v),
                        currency: rowCurrency,
                      }),
                      currencies.length
                        ? Select
                          ? React.createElement(Select, {
                            showSearch: true,
                            allowClear: false,
                            value:
                              r.currencyId ||
                              (extractCurrencyId(rowCurrency)
                                ? String(extractCurrencyId(rowCurrency))
                                : undefined),
                            placeholder: tr("Currency"),
                            optionFilterProp: "label",
                            style: { width: "100%" },
                            onChange: (value) => onUpdate(r._id, "currencyId", value || null),
                            options: currencyOptions,
                          })
                          : React.createElement(
                            "select",
                            {
                              value:
                                r.currencyId ||
                                (extractCurrencyId(rowCurrency)
                                  ? String(extractCurrencyId(rowCurrency))
                                  : ""),
                              onChange: (e) =>
                                onUpdate(r._id, "currencyId", e.target.value || null),
                              style: inp({ fontSize: 12.5, padding: "6px 8px" }),
                            },
                            React.createElement("option", { value: "" }, tr("Currency")),
                            ...currencies.map((item) =>
                              React.createElement(
                                "option",
                                { key: item.id, value: item.id },
                                currencySelectLabel(item),
                              ),
                            ),
                          )
                        : null,
                    )
                    : (() => {
                      const isPackageRow = packageMode || rowBillingMode === BILLING_PACKAGE_INCLUDED;
                      // Same standalone-price lookup used by the Service Combo
                      // config screen's own Base Price column — shown here
                      // instead of the "Included in combo" label so the
                      // per-line discount is visible at a glance.
                      const individual = isPackageRow ? getComboLineIndividualPrice(r) : null;
                      return React.createElement(
                        "div",
                        {
                          style: {
                            color:
                              moneyEditable
                                ? C.text
                                : rowBillingMode === BILLING_PACKAGE_INCLUDED
                                  ? C.primary
                                  : C.textSub,
                            fontSize: 12.5,
                            fontWeight:
                              moneyEditable ||
                                rowBillingMode === BILLING_PACKAGE_INCLUDED
                                ? 700
                                : 500,
                            lineHeight: "20px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 2,
                          },
                        },
                        React.createElement(
                          "span",
                          { style: individual ? { color: C.text } : {} },
                          moneyEditable && !packageMode
                            ? formatMoney(r.basePrice || 0, rowCurrency)
                            : isPackageRow
                              ? individual
                                ? formatMoney(individual.price, individual.currency)
                                : tr("Included in combo")
                              : tr("Scope only"),
                        ),
                        isPackageRow && individual &&
                          React.createElement(
                            "span",
                            { style: { fontSize: 10.5, color: C.primary, fontWeight: 600 } },
                            tr("Included in combo"),
                          ),
                      moneyEditable &&
                        !packageMode &&
                        r._sourceCurrencyId &&
                        r.currencyId &&
                        String(r._sourceCurrencyId) !== String(r.currencyId) &&
                        React.createElement(
                          "span",
                          {
                            title: tr("Snapshot currency edited"),
                            style: {
                              color: C.textSub,
                              fontSize: 10.5,
                              fontWeight: 600,
                              fontFamily: FONT,
                            },
                          },
                          tr("Edited currency"),
                        ),
                      );
                    })(),
                ),
                React.createElement(
                  "td",
                  { style: { ...td(), paddingTop: 11, textAlign: "center" } },
                  isRowEdit && moneyEditable && !packageMode
                    ? React.createElement("input", {
                      type: "number",
                      min: 0,
                      max: 100,
                      step: 1,
                      value: r.vat || 0,
                      onChange: (e) =>
                        onUpdate(r._id, "vat", parseFloat(e.target.value) || 0),
                      style: inp({
                        fontSize: 13,
                        padding: "6px 9px",
                        textAlign: "center",
                        width: "100%",
                      }),
                      onFocus,
                      onBlur,
                    })
                    : React.createElement(
                      "span",
                      {
                        style: {
                          color: moneyEditable ? C.text : C.textSub,
                          fontSize: 12.5,
                          fontWeight: moneyEditable ? 700 : 500,
                          lineHeight: "20px",
                        },
                      },
                      moneyEditable && !packageMode ? `${r.vat || 0}%` : "0%",
                    ),
                ),
                React.createElement(
                  "td",
                  {
                    style: {
                      ...td(),
                      paddingTop: 11,
                      textAlign: "right",
                      color: convertedLineAmount?.canConvert ? "#1d4ed8" : C.warning,
                      fontWeight: 700,
                      fontSize: 13.5,
                      fontFamily: FONT_MONO,
                    },
                  },
                  lineAmount
                    ? React.createElement(
                      "div",
                      {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: 2,
                        },
                      },
                      React.createElement(
                        "span",
                        null,
                        convertedLineAmount?.canConvert
                          ? formatMoney(convertedLineAmount.totalAmount, baseCurrency)
                          : formatMoney(lineAmount.totalAmount, rowCurrency),
                      ),
                      convertedLineAmount?.canConvert &&
                        !convertedLineAmount.sameCurrency &&
                        React.createElement(
                          "span",
                          {
                            style: {
                              color: C.textSub,
                              fontSize: 10.5,
                              fontWeight: 600,
                              fontFamily: FONT,
                            },
                          },
                          tr("Original: {0}", { 0: formatMoney(lineAmount.totalAmount, rowCurrency) }),
                        ),
                      convertedLineAmount &&
                        !convertedLineAmount.canConvert &&
                        !convertedLineAmount.sameCurrency &&
                        React.createElement(
                          "span",
                          {
                            style: {
                              color: C.warning,
                              fontSize: 10.5,
                              fontWeight: 700,
                              fontFamily: FONT,
                            },
                          },
                          tr("Missing rate to {0}", { 0: baseCurrencyCode }),
                        ),
                    )
                    : "-",
                ),
                React.createElement(
                  "td",
                  { style: { ...td(), textAlign: "center", paddingTop: 8 } },
                  React.createElement(
                    "div",
                    {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      },
                    },
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        title: isRowEdit ? tr("Done editing") : tr("Edit service"),
                        onClick: () => toggleRowEdit(r._id),
                        style: iconButtonStyle(C.primary, isRowEdit),
                      },
                      React.createElement(RowEditIcon, { active: isRowEdit }),
                    ),
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        title: tr("View task"),
                        onClick: () => setTaskOverviewRowId(r._id),
                        style: iconButtonStyle(C.textSub),
                      },
                      React.createElement(TaskListIcon),
                    ),
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        title: tr("Delete service"),
                        onClick: () => onDelete(r._id),
                        style: iconButtonStyle(C.danger),
                      },
                      React.createElement(TrashIcon),
                    ),
                  ),
                ),
                ),
              ].filter(Boolean);
            }),
        ),
      ),
    ),
    rows.length > 0 &&
    React.createElement(
      "div",
      {
        style: {
          borderTop: `2px solid ${C.border}`,
          padding: "14px 20px",
          background: C.bgSection,
          display: "flex",
          justifyContent: "flex-end",
        },
      },
      shouldRenderCurrencySummary ? renderMixedTotalsSummary() : renderSingleTotalsSummary(),
    ),
    renderExchangeBreakdownModal(),
    renderTaskOverviewModal(),
  );
};

const Card = ({ children, style = {} }) =>
  AntCard
    ? React.createElement(
      AntCard,
      {
        size: "small",
        bodyStyle: { padding: 0 },
        style: {
          marginBottom: 16,
          overflow: "visible",
          ...style,
        },
      },
      children,
    )
    : React.createElement(
    "div",
    {
      style: {
        background: C.bgCard,
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        marginBottom: 16,
        overflow: "visible",
        ...style,
      },
    },
    children,
  );
const CardHeader = ({ title, subtitle }) =>
  React.createElement(
    "div",
    {
      style: {
        padding: "12px 16px",
        borderBottom: `1px solid ${C.border}`,
        background: C.bgSection,
        display: "flex",
        alignItems: "baseline",
        gap: 10,
      },
    },
    React.createElement(
      "span",
      {
        style: {
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 14,
          color: C.text,
        },
      },
      title,
    ),
    subtitle &&
    React.createElement(
      "span",
      { style: { fontSize: 12, color: C.textSub } },
      subtitle,
    ),
  );
const Field = ({ label, required, hint, children, mb = 0 }) =>
  Form?.Item
    ? React.createElement(
      Form.Item,
      {
        label: React.createElement(
          "span",
          null,
          label,
          hint
            ? React.createElement(
              "span",
              { style: { color: C.textSub, fontSize: 12, marginLeft: 6, fontStyle: "normal" } },
              hint,
            )
            : null,
        ),
        required,
        colon: false,
        layout: "vertical",
        style: { marginBottom: mb, width: "100%" },
      },
      React.createElement("div", { style: { width: "100%" } }, children),
    )
    : React.createElement(
    "div",
    { style: { marginBottom: mb, width: "100%" } },
    React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", marginBottom: 5 } },
      React.createElement(
        "span",
        {
          style: {
            fontFamily: FONT,
            fontSize: 11.5,
            fontWeight: 600,
            color: C.textLabel,
          },
        },
        label,
      ),
      required &&
      React.createElement(
        "span",
        { style: { color: C.danger, marginLeft: 3, fontSize: 12 } },
        "*",
      ),
      hint &&
      React.createElement(
        "span",
        {
          style: {
            fontSize: 11,
            color: "#9ca3af",
            fontStyle: "italic",
            marginLeft: 6,
          },
        },
        hint,
      ),
    ),
    children,
  );
const Grid = ({ cols = 2, gap = 16, mb = 16, children }) =>
  React.createElement(
    "div",
    {
      style: {
        display: "grid",
        gridTemplateColumns:
          cols <= 1
            ? "1fr"
            : `repeat(auto-fit, minmax(${cols >= 3 ? 240 : 280}px, 1fr))`,
        gap,
        marginBottom: mb,
      },
    },
    children,
  );

// ─── MAIN FORM ────────────────────────────────────────────────
const ProjectCreateForm = () => {
  const [form, setForm] = useState({
    internalCompanyId: null,
    customerId: null,
    projectName: "",
    date: nowISO(),
    deadline: "",
    priority: "medium",
    projectManagerId: null,
    managerId: null,
    lawyerIds: [],
    description: "",
    contractId: null,
    quotationId: null,
    currencyId: null,
    caseCode: "",
    pricingMode: PRICING_MODE_LINE,
    financialSourceType: SOURCE_MANUAL,
    packageSubTotal: 0,
    packageVatRate: 0,
    packageVatAmount: 0,
    packageTotalAmount: 0,
  });

  const [rows, setRows] = useState([]);
  const [internalCompanies, setInternalCompanies] = useState([]);
  const [combos, setCombos] = useState([]);
  // Mirrors `combos` for the mount-only effect below (deps=[]) that maps
  // an existing Contract's services into rows: that effect's closure is
  // created once at mount, so reading `combos` directly there would always
  // see the initial empty array even after the fetch below resolves. A ref
  // is a stable mutable box the same closure can read fresh from.
  const combosRef = useRef([]);
  const [appliedCombos, setAppliedCombos] = useState([]);
  // Ad-hoc combos whose "Also save this combo to the shared catalog"
  // checkbox was checked — the actual serviceCombos/serviceComboItems
  // writes are deferred to handleSubmit's tail, same reasoning as the
  // per-row _saveToCatalog flag.
  const [pendingComboCatalogSaves, setPendingComboCatalogSaves] = useState([]);

  useEffect(() => {
    ctx.api
      .request({
        url: "serviceCombos:list",
        params: {
          filter: JSON.stringify({ isActive: { $eq: true } }),
          appends: ["serviceComboItems.services", "serviceComboItems.currency"],
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
        const filtered = list.filter((c) => (c.serviceComboItems || []).length > 0);
        setCombos(filtered);
        combosRef.current = filtered;
      })
      .catch((error) => {
        console.warn("[CaseCreateForm] Could not fetch service combos:", error);
      });
  }, []);

  const [customers, setCustomers] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [svcOpts, setSvcOpts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [taskTemplates, setTaskTemplates] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState("");
  const [caseCodePreview, setCaseCodePreview] = useState(null);
  const lastAutoCaseCodeRef = useRef("");
  const caseCodeRequestRef = useRef(0);
  // Snapshot rows ban đầu từ quotation để so sánh khi submit
  const initialRowsRef = useRef([]);
  const isDirtyRef = useRef(false);
  const submittingRef = useRef(false);
  // Parked rows/appliedCombos/package totals for the pricing mode NOT
  // currently active, keyed by PRICING_MODE_LINE / PRICING_MODE_PACKAGE —
  // see handleServicePricingModeChange.
  const modeStateParkRef = useRef({ [PRICING_MODE_LINE]: null, [PRICING_MODE_PACKAGE]: null });
  const setSubmittingState = useCallback((value) => {
    submittingRef.current = value;
    setSubmitting(value);
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
    if (!closeCurrentPopup()) {
      message.warning(tr("Cannot close this popup from the current runtime."));
    }
  }, []);
  const requestClose = useCallback((nativeClose) => {
    if (submittingRef.current) return;
    if (!isDirtyRef.current) {
      forceClose(nativeClose);
      return;
    }
    showDiscardConfirm(() => {
      forceClose(nativeClose);
    });
  }, [forceClose]);
  // The header is VND (INV-1): foreign-currency services are converted to it
  // for the services footer and the totals. There is no header currency
  // picker; it used to follow the source Contract / Quotation.
  const selectedCurrency = useMemo(() => findDefaultCurrency(currencies), [currencies]);
  // the source document's pricing day for rows synced to it (rowRateBasis)
  const sourceRateDate = useMemo(
    () =>
      sourceDocumentRateDate(
        form.contractId ? contracts.find((c) => String(c.id) === String(form.contractId)) : null,
        !form.contractId && form.quotationId
          ? quotations.find((q) => String(q.id) === String(form.quotationId))
          : null,
        moneyDateKey,
      ),
    [contracts, quotations, form.contractId, form.quotationId],
  );
  const defaultCurrencyId = useMemo(
    () => extractCurrencyId(findDefaultCurrency(currencies)?.id),
    [currencies],
  );
  // The Currency field has been removed from the Services section (no more
  // manual override) — auto-populate form.currencyId with the default
  // currency (VND) once currencies load, so the "select a Case Currency"
  // submit validation is satisfied without a picker.
  useEffect(() => {
    if (!form.currencyId && defaultCurrencyId) {
      setForm((p) => ({ ...p, currencyId: String(defaultCurrencyId) }));
    }
  }, [defaultCurrencyId]);
  const currencyOptions = useMemo(
    () =>
      currencies.map((currency) => ({
        value: String(currency.id),
        label: currencySelectLabel(currency),
      })),
    [currencies],
  );

  useEffect(() => {
    return configureGuardedModalClose(requestClose);
  }, [requestClose]);

  useEffect(() => {
    Promise.all([
      fetchAll("internalCompany:list"),
      fetchAll("customers:list"),
      fetchAll("lawyers:list", { appends: ["user"] }),
      fetchAll("contracts:list"),
      fetchAll("quotations:list", { sort: ["-createdAt"] }),
      fetchCompanyServices(),
      fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES),
      fetchProjectTemplates(),
      fetchAll("projects:list"),
      getCurrentUser(),
    ])
      .then(([comps, custs, laws, conts, quots, svcs, currs, taskTpls, projs, user]) => {
        const selectableLawyers = filterSelectableLawyers(laws);
        const normalizedCurrencies = Array.isArray(currs) ? currs : [];
        const initialCurrencyId = extractCurrencyId(findDefaultCurrency(normalizedCurrencies)?.id);
        setInternalCompanies(comps);
        setCustomers(custs);
        setLawyers(selectableLawyers);
        setContracts(conts);
        setQuotations(quots);
        setProjects(projs || []);
        setCurrencies(normalizedCurrencies);
        setTaskTemplates(taskTpls || []);

        setSvcOpts(
          svcs.map((s) => {
            const serviceRecord = Array.isArray(s.service)
              ? s.service[0]
              : Array.isArray(s.services)
                ? s.services[0]
                : s.service || s.services || {};
            const companyServiceCurrency = currencyFromRecordOptional(s, normalizedCurrencies, null);
            const serviceCurrency = currencyFromRecordOptional(serviceRecord, normalizedCurrencies, null);
            const resolvedCurrency = companyServiceCurrency || serviceCurrency || null;
            const resolvedCurrencyId = extractCurrencyId(resolvedCurrency) || getRecordCurrencyId(s) || getRecordCurrencyId(serviceRecord);
            return {
              id: s.serviceId || serviceRecord.id || s.id,
              companyServiceId: s.id,
              serviceId: s.serviceId || serviceRecord.id || null,
              internalCompanyId: getInternalCompanyId(s),
              serviceName: serviceRecord.serviceName || s.serviceName || "",
              serviceType: serviceRecord.serviceType || s.serviceType || "",
              description: serviceRecord.description || s.description || "",
              basePrice: s.price ?? s.basePrice ?? serviceRecord.basePrice ?? 0,
              currencyId: resolvedCurrencyId,
              currency: resolvedCurrency,
              currencyCode: extractCurrencyCode(resolvedCurrency),
              currencySource: companyServiceCurrency
                ? "companyService"
                : serviceCurrency
                  ? "service"
                  : null,
            };
          }),
        );

        setCurrentUser(user);
        if (user?.id && !isSystemUserId(user.id)) {
          setForm((p) => ({ ...p, projectManagerId: String(user.id) }));
          // managerId (lawyers FK) is now the source of truth for Manager;
          // projectManagerId (users FK) is kept in sync for backward compat
          // until existing data/code fully migrates to managerId.
          const ownLawyer = selectableLawyers.find(
            (l) => String(getLawyerLinkedUserId(l) || "") === String(user.id),
          );
          if (ownLawyer)
            setForm((p) => ({ ...p, managerId: String(ownLawyer.id) }));
        }
        if (initialCurrencyId)
          setForm((p) => ({ ...p, currencyId: p.currencyId || String(initialCurrencyId) }));

        const popupParams = getRuntimeInput();
        const recordCustomerId =
          ctx?.record?.customerId ||
          (ctx?.record?.customerType ? ctx?.record?.id : null);
        const usedQIds = new Set(
          (projs || [])
            .filter((p) => p.quotationId)
            .map((p) => String(p.quotationId)),
        );
        const availableQuots = quots.filter(
          (q) => !usedQIds.has(String(q.id)),
        );
        const match = window.location.pathname.match(/\/filterbytk\/(\d+)/i);
        const urlId = match
          ? match[1]
          : ctx?.filterByTk ||
          popupParams.customerId ||
          recordCustomerId ||
          null;

        if (urlId) {
          const foundContract = conts.find(
            (c) => String(c.id) === String(urlId),
          );
          if (foundContract) {
            const custId =
              foundContract.customerId || foundContract.customer?.id;
            const foundCust = custs.find(
              (c) => String(c.id) === String(custId),
            );
            const foundQuot = availableQuots.find(
              (q) =>
                String(q.customerId) === String(custId) ||
                String(q.customer?.id) === String(custId),
            );

            if (foundCust) setCurrentCustomer(foundCust);

            setForm((p) => ({
              ...p,
              ...financialStateFromRecord(
                foundContract || foundQuot,
                foundContract ? SOURCE_CONTRACT : SOURCE_QUOTATION,
              ),
              internalCompanyId:
                foundContract.internalCompanyId ||
                foundQuot?.internalCompanyId ||
                p.internalCompanyId,
              contractId: String(foundContract.id),
              customerId: foundCust ? String(foundCust.id) : null,
              quotationId: foundQuot ? String(foundQuot.id) : null,
            }));

            if (foundContract) {
              fetchContractServices(foundContract.id)
                .then((csvcs) => {
                  if (csvcs.length > 0)
                    setRows(mapContractServicesToRows(csvcs, foundContract, taskTpls, combosRef.current));
                })
                .catch(() => { });
            } else if (foundQuot) {
              fetchQuotationServices(foundQuot.id)
                .then((qsvcs) => {
                  if (qsvcs.length > 0)
                    setRows(mapQuotationServicesToRows(qsvcs, foundQuot, taskTpls));
                })
                .catch(() => { });
            }
          } else {
            const foundCust = custs.find((c) => String(c.id) === String(urlId));
            if (foundCust) {
              setCurrentCustomer(foundCust);
              const cc = conts.find(
                (c) =>
                  String(c.customerId) === String(foundCust.id) ||
                  String(c.customer?.id) === String(foundCust.id),
              );
              const cq = availableQuots.find(
                (q) =>
                  String(q.customerId) === String(foundCust.id) ||
                  String(q.customer?.id) === String(foundCust.id),
              );
              setForm((p) => ({
                ...p,
                ...financialStateFromRecord(
                  cc || cq,
                  cc ? SOURCE_CONTRACT : cq ? SOURCE_QUOTATION : SOURCE_NONE,
                ),
                internalCompanyId:
                  cc?.internalCompanyId ||
                  cq?.internalCompanyId ||
                  p.internalCompanyId,
                customerId: String(foundCust.id),
                contractId: cc ? String(cc.id) : null,
                quotationId: cq ? String(cq.id) : null,
              }));
              if (cc) {
                fetchContractServices(cc.id)
                  .then((csvcs) => {
                    if (csvcs.length > 0)
                      setRows(mapContractServicesToRows(csvcs, cc, taskTpls, combosRef.current));
                  })
                  .catch(() => { });
              } else if (cq) {
                fetchQuotationServices(cq.id)
                  .then((qsvcs) => {
                    if (qsvcs.length > 0)
                      setRows(mapQuotationServicesToRows(qsvcs, cq, taskTpls));
                  })
                  .catch(() => { });
              }
            }
          }
        }
        setLoading(false);
      })
      .catch((error) => {
        console.warn("[CaseCreateForm] initial load failed", error);
        message.error(tr("Could not load case form data."));
        setLoading(false);
      });
  }, []);

  const setF = useCallback((k, v) => {
    markDirty();
    setForm((p) => ({ ...p, [k]: v }));
  }, [markDirty]);

  // Manager is a direct lawyers-FK select now, so it must not also be
  // selectable/shown as a Member.
  const membersLawyers = useMemo(
    () =>
      form.managerId
        ? lawyers.filter((l) => String(l.id) !== String(form.managerId))
        : lawyers,
    [lawyers, form.managerId],
  );

  // If the lawyer just picked as Manager was already selected as a Member,
  // drop it from Members so the same person isn't listed twice on the case.
  useEffect(() => {
    if (!form.managerId) return;
    setForm((p) => {
      if (!p.lawyerIds?.includes(p.managerId)) return p;
      return {
        ...p,
        lawyerIds: p.lawyerIds.filter((id) => id !== p.managerId),
      };
    });
  }, [form.managerId]);

  const applyFinancialSource = useCallback((record, sourceType) => {
    setForm((p) => ({
      ...p,
      ...financialStateFromRecord(record, sourceType),
    }));
  }, []);

  const refreshCustomers = useCallback(async () => {
    const list = await fetchAll("customers:list");
    setCustomers(list);
    return list;
  }, []);

  const refreshContracts = useCallback(async () => {
    const list = await fetchAll("contracts:list");
    setContracts(list);
    return list;
  }, []);

  const refreshQuotations = useCallback(async () => {
    const list = await fetchAll("quotations:list", { sort: ["-createdAt"] });
    setQuotations(list);
    return list;
  }, []);

  const openCreatePopup = useCallback(
    async (viewKey, refreshFn, params = {}, options = {}) => {
      const { beforeIds, onCreated } = options;
      const beforeIdSet = beforeIds ? new Set(beforeIds.map(String)) : null;
      const targetRefreshBlockUid = QUICK_CREATE_REFRESH_BLOCK_UID_BY_VIEW[viewKey];
      const expectedCollection = QUICK_CREATE_COLLECTION_BY_VIEW[viewKey];
      const quickCreateRequestId =
        params.quickCreateRequestId ||
        `${viewKey}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      const sourceInput = getRuntimeInput();
      const popupParams = {
        ...params,
        quickCreateRequestId,
        quickCreateViewKey: viewKey,
        quickCreateSource: "CaseCreateForm",
        quickCreateTargetCollection: expectedCollection,
        sourceBlockUid: params.sourceBlockUid || sourceInput.blockUid || sourceInput.dataBlockUid,
        targetBlockUid: params.targetBlockUid || targetRefreshBlockUid,
        dataBlockUid: params.dataBlockUid || targetRefreshBlockUid,
        refreshBlockUids: runtimeCompact([
          params.refreshBlockUid,
          ...(Array.isArray(params.refreshBlockUids) ? params.refreshBlockUids : []),
          targetRefreshBlockUid,
        ]),
      };
      let selectedCreatedId = null;
      const cleanupFns = [];
      let cleanupQuickCreateListener = () => {
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
      const runRefreshAndSelect = async (forcedId = null, forcedRecord = null) => {
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
            const createdCandidates = updated.filter((item) => !beforeIdSet.has(String(item.id)));
            // If more than one record is new (e.g. another user created something
            // concurrently), prefer the most recently created one.
            const created = createdCandidates.length > 1
              ? createdCandidates.reduce((latest, item) =>
                  new Date(item.createdAt || 0) > new Date(latest.createdAt || 0) ? item : latest,
                )
              : createdCandidates[0];
            if (created) selectCreated(created.id, created, updated);
          }
        } catch (error) {
          console.warn("[CaseCreateForm] quick-create refresh failed", error);
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
          const createdId = runtimeExtractId(detail.id || detail.record?.id);
          if (!createdId) return;
          runRefreshAndSelect(String(createdId), detail.record || null);
        };
        window.addEventListener(QUICK_CREATE_CREATED_EVENT, handleQuickCreateCreated);
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
            const createdId = runtimeExtractId(detail.id || detail.record?.id);
            if (!createdId) return;
            runRefreshAndSelect(String(createdId), detail.record || null);
          }),
        );
      }

      const opened = await openPopupViewByUid(viewKey, popupParams);
      if (opened && refreshFn) {
        setTimeout(runRefreshAndSelect, 1200);
        setTimeout(runRefreshAndSelect, 3500);
        setTimeout(runRefreshAndSelect, 7000);
        setTimeout(cleanupQuickCreateListener, 10000);
      } else {
        cleanupQuickCreateListener();
      }
    },
    [],
  );

  // ── Helper: load services from quotationId and set rows ──
  const loadServicesFromQuotation = useCallback(
    async (quotationId, showToast = true, quotationOverride = null) => {
      if (!quotationId) return 0;
      setLoadingServices(true);
      try {
        const selectedQuotation = quotationOverride || quotations.find(
          (q) => String(q.id) === String(quotationId),
        );
        applyFinancialSource(selectedQuotation, SOURCE_QUOTATION);
        const qsvcs = await fetchQuotationServices(quotationId);
        if (qsvcs.length > 0) {
          const mapped = mapQuotationServicesToRows(qsvcs, selectedQuotation, taskTemplates);
          // Lưu snapshot ban đầu kèm quotationServiceId để so sánh khi submit
          initialRowsRef.current = qsvcs.map((s) => ({
            _qServiceId: s.id,
            serviceId: s.serviceId ? String(s.serviceId) : null,
            basePrice: isPackagePricing(selectedQuotation) ? 0 : s.price ?? s.basePrice ?? 0,
            vat: isPackagePricing(selectedQuotation) ? 0 : s.vat ?? 0,
            currencyId: getRecordCurrencyId(s) ? String(getRecordCurrencyId(s)) : null,
          }));
          setRows(mapped);
          setAppliedCombos(buildAppliedCombosFromRows(mapped));
          if (showToast)
            message.success(tr("Loaded {0} services from quotation", { 0: qsvcs.length }));
          return qsvcs.length;
        } else {
          initialRowsRef.current = [];
          setRows([]);
          if (showToast) message.info(tr("This quotation has no services yet"));
          return 0;
        }
      } catch {
        initialRowsRef.current = [];
        setRows([]);
        if (showToast) message.error(tr("Could not load services from quotation"));
        return 0;
      } finally {
        setLoadingServices(false);
      }
    },
    [applyFinancialSource, quotations, taskTemplates],
  );

  // ── Select customer: auto-select contract + quotation + load services ──
  const loadServicesFromContract = useCallback(
    async (contractId, showToast = true, contractOverride = null) => {
      if (!contractId) return 0;
      setLoadingServices(true);
      try {
        const selectedContract = contractOverride || contracts.find(
          (c) => String(c.id) === String(contractId),
        );
        applyFinancialSource(selectedContract, SOURCE_CONTRACT);
        const csvcs = await fetchContractServices(contractId);
        if (csvcs.length > 0) {
          const mapped = mapContractServicesToRows(csvcs, selectedContract, taskTemplates, combosRef.current);
          // Derived from `mapped` (not re-derived from the raw csvcs) so the
          // snapshot's serviceId always matches what the row itself actually
          // holds — mapContractServicesToRows resolves serviceId through a
          // wider fallback chain (see its own comment) than a naive re-read
          // of csvcs would, and a mismatch here would make the submit-time
          // "did this row still exist" diff (see the SOURCE_CONTRACT sync
          // block in handleSubmit) wrongly treat an untouched row as
          // removed/changed.
          initialRowsRef.current = mapped.map((row) => ({
            _contractServiceId: row._contractServiceId,
            serviceId: row.serviceId,
            basePrice: isPackagePricing(selectedContract) ? 0 : row.basePrice,
            vat: isPackagePricing(selectedContract) ? 0 : row.vat,
            currencyId: row.currencyId,
          }));
          setRows(mapped);
          setAppliedCombos(buildAppliedCombosFromRows(mapped));
          if (showToast)
            message.success(tr("Loaded {0} services from contract", { 0: csvcs.length }));
          return csvcs.length;
        }
        initialRowsRef.current = [];
        setRows([]);
        if (showToast) message.info(tr("This contract has no services yet"));
        return 0;
      } catch {
        initialRowsRef.current = [];
        setRows([]);
        if (showToast) message.error(tr("Could not load services from contract"));
        return 0;
      } finally {
        setLoadingServices(false);
      }
    },
    [applyFinancialSource, contracts, taskTemplates],
  );

  const handleCustomerChange = useCallback(
    async (customerId, customerOverride = null) => {
      if (!customerId) {
        setForm((p) => ({
          ...p,
          customerId: null,
          contractId: null,
          quotationId: null,
          ...financialStateFromRecord(null, SOURCE_NONE),
        }));
        setCurrentCustomer(null);
        setRows([]);
        return;
      }

      setCurrentCustomer(
        customerOverride ||
          customers.find((c) => String(c.id) === String(customerId)) ||
          null,
      );
      setForm((p) => ({ ...p, customerId }));
      const freshQuotations = await fetchCustomerQuotations(customerId);
      const quotationPool = freshQuotations.reduce((acc, row) => mergeRecordById(acc, row), quotations);
      if (freshQuotations.length) setQuotations(quotationPool);

      const cc = contracts.find(
        (c) =>
          (!form.internalCompanyId || isSameInternalCompany(c, form.internalCompanyId)) &&
          (String(c.customerId) === String(customerId) ||
            String(c.customer?.id) === String(customerId)),
      );
      const usedQIds = new Set(
        projects.filter((p) => p.quotationId).map((p) => String(p.quotationId)),
      );
      const availableQuots = quotationPool.filter(
        (q) =>
          (!form.internalCompanyId || isSameInternalCompany(q, form.internalCompanyId)) &&
          !usedQIds.has(String(q.id)),
      );

      const cq = availableQuots.find(
        (q) =>
          String(q.customerId) === String(customerId) ||
          String(q.customer?.id) === String(customerId),
      );

      setForm((p) => ({
        ...p,
        ...financialStateFromRecord(
          cc || cq,
          cc ? SOURCE_CONTRACT : cq ? SOURCE_QUOTATION : SOURCE_NONE,
        ),
        customerId,
        contractId: cc ? String(cc.id) : null,
        quotationId: cq ? String(cq.id) : null,
      }));

      if (cc) {
        const count = await loadServicesFromContract(cc.id, false);
        const parts = [cc && "contract", "quotation"]
          .filter(Boolean)
          .join(" and ");
        if (count > 0) {
          message.success(
            tr("Auto-selected {0} and loaded {1} services from contract", { 0: parts, 1: count }),
          );
        } else {
          message.info(tr("Auto-selected {0} for this customer", { 0: parts }));
        }
      } else if (cq) {
        const count = await loadServicesFromQuotation(cq.id, false);
        if (count > 0) {
          message.success(
            tr("Auto-selected quotation and loaded {0} services from quotation", { 0: count }),
          );
        } else {
          message.info(tr("Auto-selected quotation for this customer"));
        }
      } else {
        setRows([]);
      }
    },
    [contracts, customers, form.internalCompanyId, projects, quotations, loadServicesFromQuotation, loadServicesFromContract],
  );

  // ── Manual quotation selection: load services ──
  const handleQuotationChange = useCallback(
    async (quotationId, quotationOverride = null) => {
      setF("quotationId", quotationId);

      if (!quotationId) {
        const selectedContract = contracts.find(
          (c) => String(c.id) === String(form.contractId),
        );
        applyFinancialSource(
          selectedContract,
          selectedContract ? SOURCE_CONTRACT : SOURCE_NONE,
        );
        if (selectedContract) {
          await loadServicesFromContract(selectedContract.id, true);
        } else {
          setRows([]);
        }
        return;
      }

      const selectedContract = contracts.find(
        (c) => String(c.id) === String(form.contractId),
      );
      if (selectedContract) {
        applyFinancialSource(selectedContract, SOURCE_CONTRACT);
        await loadServicesFromContract(selectedContract.id, true);
        return;
      }

      await loadServicesFromQuotation(quotationId, true, quotationOverride);
    },
    [applyFinancialSource, contracts, form.contractId, loadServicesFromQuotation, loadServicesFromContract, setF],
  );

  const handleContractChange = useCallback(
    async (contractId, contractOverride = null) => {
      const selectedContract = contractOverride || contracts.find(
        (c) => String(c.id) === String(contractId),
      );
      setForm((p) => ({
        ...p,
        ...financialStateFromRecord(
          selectedContract,
          selectedContract ? SOURCE_CONTRACT : (p.quotationId ? SOURCE_QUOTATION : SOURCE_NONE),
        ),
        contractId,
      }));
      if (selectedContract) {
        await loadServicesFromContract(contractId, true, selectedContract);
        return;
      }
      if (form.quotationId) {
        await loadServicesFromQuotation(form.quotationId, true);
      } else {
        setRows([]);
      }
    },
    [contracts, form.quotationId, loadServicesFromContract, loadServicesFromQuotation],
  );

  const addRowFromService = useCallback(
    async (svc, isCreate = false) => {
      markDirty();
      const packageMode = isPackagePricing(form.pricingMode);
      const billingMode = packageMode
        ? BILLING_PACKAGE_INCLUDED
        : billingModeForContext({
          fromQuotation: false,
          packageMode,
          hasFinancialSource: form.financialSourceType !== SOURCE_NONE,
        });
      const shouldCarryPrice =
        billingMode === BILLING_LINE || billingMode === BILLING_SEPARATE;
      const serviceCurrencyId = getRecordCurrencyId(svc);
      const rowCurrencyId = serviceCurrencyId || form.currencyId || null;
      const addToPackageTotal = (amount) => {
        const lineAmount = parseNum(amount);
        if (!packageMode || !lineAmount) return;
        setForm((p) => {
          const subTotal = parseNum(p.packageSubTotal) + lineAmount;
          const vatRate = (p.packageVatRate === undefined || p.packageVatRate === null || p.packageVatRate === "")
            ? 8
            : parseNum(p.packageVatRate);
          const vatAmount = Math.round((subTotal * vatRate) / 100);
          return {
            ...p,
            pricingMode: PRICING_MODE_PACKAGE,
            financialSourceType:
              p.financialSourceType === SOURCE_NONE ? SOURCE_MANUAL : p.financialSourceType,
            packageSubTotal: subTotal,
            packageVatRate: vatRate,
            packageVatAmount: vatAmount,
            packageTotalAmount: subTotal + vatAmount,
          };
        });
      };
      if (isCreate) {
        const serviceName = String(svc.serviceName || "").trim();
        const customTaskTemplates = normalizeCustomTaskTemplates(svc.taskTemplates);
        if (findDuplicateServiceRow(rows, { serviceName })) {
          message.warning(tr("This service is already added in the case."));
          return;
        }
        setRows((p) => [
          ...p,
          {
            _id: Date.now() + Math.random(),
            serviceId: null,
            serviceName,
            serviceType: svc.serviceType || "",
            description: svc.description || "",
            currencyId: rowCurrencyId ? String(rowCurrencyId) : null,
            _sourceCurrencyId: serviceCurrencyId ? String(serviceCurrencyId) : null,
            basePrice: shouldCarryPrice ? svc.basePrice || 0 : 0,
            vat: shouldCarryPrice ? 0 : 0,
            billingMode,
            financialSourceType:
              billingMode === BILLING_SEPARATE
                ? SOURCE_MANUAL
                : billingMode === BILLING_SCOPE
                  ? SOURCE_NONE
                  : form.financialSourceType || SOURCE_NONE,
            pricingMode: form.pricingMode,
            _packageBasePrice: packageMode ? parseNum(svc.basePrice) : 0,
            _customTaskTemplates: customTaskTemplates,
            _saveToCatalog: !!svc.saveToCatalog,
          },
        ]);
        addToPackageTotal(svc.basePrice);
        message.success(tr("Service row added. It will be saved to project services on submit."));
      } else {
        if (findDuplicateServiceRow(rows, { serviceId: svc.id, serviceName: svc.serviceName })) {
          message.warning(tr("This service is already added in the case."));
          return;
        }
        setRows((p) => [
          ...p,
          {
            _id: Date.now(),
            serviceId: String(svc.id),
            serviceName: svc.serviceName || "",
            serviceType: svc.serviceType || "",
            description: svc.description || "",
            currencyId: rowCurrencyId ? String(rowCurrencyId) : null,
            _sourceCurrencyId: serviceCurrencyId ? String(serviceCurrencyId) : null,
            basePrice: shouldCarryPrice ? svc.basePrice || 0 : 0,
            vat: 0,
            billingMode,
            financialSourceType:
              billingMode === BILLING_SEPARATE
                ? SOURCE_MANUAL
                : billingMode === BILLING_SCOPE
                  ? SOURCE_NONE
                  : form.financialSourceType || SOURCE_NONE,
            pricingMode: form.pricingMode,
            _packageBasePrice: packageMode ? parseNum(svc.basePrice) : 0,
            _templateTasks: getServiceTaskTemplates(taskTemplates, svc),
          },
        ]);
        addToPackageTotal(svc.basePrice);
      }
    },
    [form.currencyId, form.financialSourceType, form.pricingMode, markDirty, rows, taskTemplates],
  );

  // Adds a service INTO an already-applied combo's section (triggered by
  // that section's own "+ Add service" action) rather than as an untagged
  // row. Always priced at 0 — "included in combo" — per user decision:
  // this service rides along on the combo's existing flat package price,
  // it does not add its own charge (mirrors how _comboInstanceId rows from
  // applyCombo/applyAdhocCombo are already priced).
  const onAddServiceToCombo = useCallback(
    (instanceId, svc) => {
      const isCreate = !svc?.id;
      const serviceName = String(svc?.serviceName || "").trim();
      if (findDuplicateServiceRow(rows, { serviceId: svc?.id, serviceName })) {
        message.warning(tr("This service is already added in the case."));
        return;
      }
      const siblingRow = rows.find((r) => r._comboInstanceId === instanceId);
      const comboEntry = appliedCombos.find((c) => c.instanceId === instanceId);
      const serviceCurrencyId = getRecordCurrencyId(svc);
      const rowCurrencyId = serviceCurrencyId || form.currencyId || null;
      const newRow = {
        _id: Date.now() + Math.random(),
        serviceId: isCreate ? null : String(svc.id),
        serviceName,
        serviceType: svc?.serviceType || "",
        description: svc?.description || "",
        currencyId: rowCurrencyId ? String(rowCurrencyId) : null,
        _sourceCurrencyId: serviceCurrencyId ? String(serviceCurrencyId) : null,
        basePrice: 0,
        vat: 0,
        billingMode: BILLING_PACKAGE_INCLUDED,
        financialSourceType: form.financialSourceType || SOURCE_NONE,
        pricingMode: PRICING_MODE_PACKAGE,
        _packageBasePrice: 0,
        _comboInstanceId: instanceId,
        _comboCatalogId: siblingRow?._comboCatalogId ?? null,
        _comboName: siblingRow?._comboName || comboEntry?.comboName || "",
        _comboSnapshot: siblingRow?._comboSnapshot || null,
        ...(isCreate
          ? { _customTaskTemplates: normalizeCustomTaskTemplates(svc?.taskTemplates) }
          : { _templateTasks: getServiceTaskTemplates(taskTemplates, svc) }),
      };
      markDirty();
      // Insert right after this combo's own last row, not at the end of
      // the whole list — appending unconditionally would land the new row
      // after a later-applied combo's rows, breaking that combo's section
      // contiguity (the row-map's isComboSectionStart groups purely by
      // adjacency) and rendering it as a stray second section instead of
      // inside the combo it was actually added to.
      setRows((p) => {
        let insertAt = p.length;
        for (let i = p.length - 1; i >= 0; i--) {
          if (p[i]._comboInstanceId === instanceId) {
            insertAt = i + 1;
            break;
          }
        }
        return [...p.slice(0, insertAt), newRow, ...p.slice(insertAt)];
      });
      if (isCreate) {
        message.success(tr("Service row added. It will be saved to project services on submit."));
      }
    },
    [appliedCombos, form.currencyId, form.financialSourceType, markDirty, rows, taskTemplates],
  );

  const deleteRow = (id) => {
    markDirty();
    const row = rows.find((r) => r._id === id);
    const packageBasePrice = parseNum(row?._packageBasePrice);
    if (isPackagePricing(form.pricingMode) && packageBasePrice) {
      setForm((p) => {
        const subTotal = Math.max(parseNum(p.packageSubTotal) - packageBasePrice, 0);
        const vatRate = (p.packageVatRate === undefined || p.packageVatRate === null || p.packageVatRate === "")
          ? 8
          : parseNum(p.packageVatRate);
        const vatAmount = Math.round((subTotal * vatRate) / 100);
        return {
          ...p,
          packageSubTotal: subTotal,
          packageVatRate: vatRate,
          packageVatAmount: vatAmount,
          packageTotalAmount: subTotal + vatAmount,
        };
      });
    }
    setRows((p) => p.filter((r) => r._id !== id));
  };
  // Editing a line-priced row's own price/VAT while the case is already in
  // package mode has to re-fold its contribution into packageSubTotal too —
  // otherwise only create/delete stayed in sync and an in-place price edit
  // silently drifted the displayed Total Amount away from the row data.
  const updateRow = (id, field, value) => {
    markDirty();
    setRows((p) => p.map((r) => (r._id !== id ? r : { ...r, [field]: value })));
    const isPriceField = field === "basePrice" || field === "vat";
    if (isPackagePricing(form.pricingMode) && isPriceField) {
      const row = rows.find((r) => r._id === id);
      const rowBillingMode = row?.billingMode || BILLING_LINE;
      // (getRowCurrency/isMoneyEditable/convertAmountsToBaseCurrency are
      // ProjectServicesTable-scoped helpers this component — ProjectCreateForm,
      // a separate top-level component — has no access to; see
      // foldLineRowsIntoPackage's comment for the same class of bug. Field
      // update above happens synchronously so typing stays responsive; the
      // package contribution re-fold below runs async after it, since
      // converting to VND may need a fresh exchange-rate lookup.)
      if (row && (rowBillingMode === BILLING_LINE || rowBillingMode === BILLING_SEPARATE)) {
        const updatedRow = { ...row, [field]: value };
        (async () => {
          const vndId = defaultCurrencyId;
          const targetCurrency = findCurrencyById(currencies, vndId) || defaultCurrencyObject();
          const rowCurrency = currencyFromRecord(updatedRow, currencies, targetCurrency);
          const amounts = calcLineAmounts(updatedRow.basePrice, updatedRow.vat, rowCurrency);
          let rate = 1;
          if (!isSameCurrency(rowCurrency, targetCurrency)) {
            const rates = await fetchExchangeRatesForConversion([extractCurrencyId(rowCurrency)], vndId);
            const matched = pickConversionRate(rates, rowCurrency, targetCurrency, form.date);
            rate = matched?.rate || 0;
          }
          const newContributionVnd = rate ? Math.round(amounts.subTotal * rate) : 0;
          const delta = newContributionVnd - parseNum(row._packageBasePrice);
          if (delta) {
            handlePackageSummaryChange(
              "packageSubTotal",
              Math.max(parseNum(form.packageSubTotal) + delta, 0),
            );
          }
          setRows((p) => p.map((r) => (r._id !== id ? r : { ...r, _packageBasePrice: newContributionVnd })));
        })();
      }
    }
  };

  const handlePackageSummaryChange = useCallback((field, value) => {
    markDirty();
    setForm((p) => {
      const nextSubTotal =
        field === "packageSubTotal"
          ? parseNum(value)
          : parseNum(p.packageSubTotal);
      const nextVatRate =
        field === "packageVatRate"
          ? parseNum(value)
          : parseNum(p.packageVatRate);
      const nextVatAmount = Math.round((nextSubTotal * nextVatRate) / 100);
      return {
        ...p,
        pricingMode: PRICING_MODE_PACKAGE,
        financialSourceType:
          p.financialSourceType === SOURCE_NONE ? SOURCE_MANUAL : p.financialSourceType,
        packageSubTotal: nextSubTotal,
        packageVatRate: nextVatRate,
        packageVatAmount: nextVatAmount,
        packageTotalAmount: nextSubTotal + nextVatAmount,
      };
    });
  }, [markDirty]);

  const applyCombo = useCallback(
    async (comboId) => {
      const combo = combos.find((c) => String(c.id) === String(comboId));
      if (!combo) return;
      const items = combo.serviceComboItems || [];
      if (!items.length) {
        message.warning(tr("This combo has no services yet."));
        return;
      }

      // Combo pricing on the Case is always VND — the manual Currency
      // picker is hidden while a combo is applied (see the Currency /
      // combo-picker toggle above), so auto-convert the combo's own
      // packageSubTotal into VND here if the combo carries a foreign
      // currency (serviceCombos.currencyId / currencies, when configured).
      const vndId = defaultCurrencyId;
      const comboCurrencyId = getRecordCurrencyId(combo);
      const { convertedSubTotal, wasConverted: comboWasConverted } = await convertComboSubTotalToVnd(
        parseNum(combo.packageSubTotal),
        comboCurrencyId,
        vndId,
        form.date,
      );

      // Full snapshot of the combo as it was at the moment it was applied —
      // stored on every row created from it (pricingSnapshot JSON column),
      // independent of both comboId/serviceCombo (FK, goes dangling if the
      // combo is later deleted) and comboName (readable label, but only the
      // name) so financial reports stay accurate even if the combo template
      // is later edited or removed entirely.
      const comboSnapshot = {
        comboId: runtimeExtractId(combo),
        comboName: combo.comboName || "",
        comboCode: combo.comboCode || "",
        serviceComboType: combo.serviceComboType || "",
        packageSubTotal: parseNum(combo.packageSubTotal),
        packageVatRate: parseNum(combo.packageVatRate),
        currencyCode: getCurrencyCode(currencyFromRecord(combo, currencies)),
        convertedPackageSubTotal: convertedSubTotal,
        convertedCurrencyCode: DEFAULT_CURRENCY_CODE,
        appliedAt: new Date().toISOString(),
        items: items.map((item) => ({
              serviceId: runtimeExtractId(item.serviceId || item.services),
              serviceName: item.serviceName || item.services?.serviceName || "",
          quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
          price: parseNum(item.price),
          vat: parseNum(item.vat),
          currencyId: getRecordCurrencyId(item),
          currencyCode: getCurrencyCode(
            currencyFromRecord(item, currencies, currencyFromRecord(combo, currencies)),
          ),
        })),
      };

      // Package-mode projectServices:create payloads in handleSubmit always
      // send quantity: 1 (both submit-loop branches), so a combo item with
      // quantity > 1 is represented as that many duplicate rows here.
      // Rows are built directly here (not via addRowFromService) so each one
      // can be tagged with _comboInstanceId — a per-apply client-side key
      // (distinct from _comboCatalogId, the real catalog FK) used below to
      // group this combo's rows for its section header / "Remove combo"
      // action, and to let the same catalog combo be applied more than once
      // without its instances colliding.
      // Applying a combo while already in package mode APPENDS its rows
      // alongside any previously-applied combos (each combo keeps its own
      // section, independently removable via _comboInstanceId — see
      // removeAppliedCombo). Applying a combo while still in line pricing
      // mode instead clears every existing row — a combo forces package
      // pricing, and mixing line-priced rows with package-priced rows in
      // the same document is exactly what pricing-mode switches are meant
      // to prevent (see handleServicePricingModeChange).
      const wasPackageMode = isPackagePricing(form.pricingMode);
      const comboInstanceId = `combo-${runtimeExtractId(combo)}-${Date.now()}`;
      const newRows = [];
      const skippedDuplicateNames = [];
      // Dedupe against whatever rows will actually still be on the case
      // after this apply (existing rows only survive if already in package
      // mode), plus every item accepted so far from this same combo, so two
      // services with the same name inside one combo don't both slip in.
      // Existing rows stay on the case either way (folded / merged into this
      // combo below), so a combo item duplicating one of them is skipped.
      const dedupeBaseline = [...rows];
      items.forEach((item) => {
        const svc = item.services || {};
        const itemServiceId = runtimeExtractId(item.serviceId || svc.id);
        const itemServiceName = item.serviceName || svc.serviceName || "";
        if (findDuplicateServiceRow(dedupeBaseline, { serviceId: itemServiceId, serviceName: itemServiceName })) {
          skippedDuplicateNames.push(itemServiceName || `#${itemServiceId}`);
          return;
        }
        dedupeBaseline.push({ serviceId: itemServiceId ? String(itemServiceId) : null, serviceName: itemServiceName });
        const unitCount = Math.max(1, parseInt(item.quantity, 10) || 1);
        for (let i = 0; i < unitCount; i++) {
          newRows.push({
            _id: Date.now() + Math.random(),
             serviceId: runtimeExtractId(item.serviceId || svc.id)
               ? String(runtimeExtractId(item.serviceId || svc.id))
               : null,
             serviceName: item.serviceName || svc.serviceName || "",
             serviceType: item.serviceType || svc.serviceType || "",
             description: item.description || svc.description || "",
            currencyId: vndId ? String(vndId) : null,
            _sourceCurrencyId: vndId ? String(vndId) : null,
            basePrice: 0,
            vat: 0,
            billingMode: BILLING_PACKAGE_INCLUDED,
            financialSourceType: form.financialSourceType || SOURCE_NONE,
            pricingMode: PRICING_MODE_PACKAGE,
            // Deliberately 0, not the catalog's own price: the combo's
            // packageSubTotal is a flat value from the combo template, not
            // a sum of its rows — deleteRow subtracts _packageBasePrice
            // from packageSubTotal when a row is removed, which would
            // incorrectly shrink a combo's flat price if this carried the
            // service's real catalog price.
            _packageBasePrice: 0,
            _comboInstanceId: comboInstanceId,
            _comboCatalogId: runtimeExtractId(combo),
            _comboName: combo.comboName || "",
            _comboSnapshot: comboSnapshot,
            // Keep each serviceComboItem's own immutable financial values.
            // `basePrice`/`vat` remain zero in package mode deliberately;
            // this object is the per-line standalone-price snapshot.
            _comboItemSnapshot: {
              // Never substitute services.basePrice for the combo snapshot.
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
        message.warning(tr("Skipped {0} service(s) already on this case: {1}", { 0: skippedDuplicateNames.length, 1: skippedDuplicateNames.join(", ") }));
      }
      if (!newRows.length) return;

      const { rows: foldedExistingRows, contributionVnd: existingLineContributionVnd } = wasPackageMode
        ? { rows, contributionVnd: 0 }
        : await foldLineRowsIntoPackage(rows, currencies, vndId, form.date);
      // This combo's own independently-tracked amount: its converted
      // catalog price, plus — only the very first combo applied to a
      // line-mode case — whatever pre-existing line rows just got folded
      // in (that fold has no combo of its own to attach to, so it rides
      // along with the first combo instead of vanishing into a blended
      // pool). Combos never merge past this point: each keeps this amount
      // on its own rows/appliedCombos entry, and the record's
      // packageSubTotal is simply their sum (see updateComboAmount).
      // Line/Combo sync: standalone services join this combo — their value
      // (_packageBasePrice: the folded VND line price, or the package share
      // they already added in Combo pricing) becomes part of its amount.
      const mergeResult = mergeStandaloneIntoCombo(
        foldedExistingRows,
        { instanceId: comboInstanceId, catalogId: runtimeExtractId(combo), name: combo.comboName || "", snapshot: comboSnapshot, currency: defaultCurrencyObject() },
        (row) => parseNum(row._packageBasePrice),
      );
      const comboOwnAmount = convertedSubTotal + mergeResult.contribution;
      const vatRateForRows = parseNum(form.packageVatRate) || parseNum(combo.packageVatRate) || 0;
      const comboOwnVatAmount = Math.round((comboOwnAmount * vatRateForRows) / 100);
      const newRowsWithOwnPricing = newRows.map((row) => ({
        ...row,
        packageSubTotal: comboOwnAmount,
        packageVatRate: vatRateForRows,
        packageVatAmount: comboOwnVatAmount,
        packageTotalAmount: comboOwnAmount + comboOwnVatAmount,
      }));
      const mergedRowIds = new Set(mergeResult.merged.map((row) => row._id));
      const existingRowsAfterMerge = mergeResult.rows.map((row) =>
        mergedRowIds.has(row._id)
          ? {
            ...row,
            packageSubTotal: comboOwnAmount,
            packageVatRate: vatRateForRows,
            packageVatAmount: comboOwnVatAmount,
            packageTotalAmount: comboOwnAmount + comboOwnVatAmount,
          }
          : row,
      );
      setRows([...existingRowsAfterMerge, ...newRowsWithOwnPricing]);
      // Rows left standalone (Contract/Quotation-sourced) keep their own
      // share; merged values moved into comboOwnAmount.
      handlePackageSummaryChange(
        "packageSubTotal",
        parseNum(wasPackageMode ? form.packageSubTotal : existingLineContributionVnd) -
          mergeResult.contribution +
          comboOwnAmount,
      );
      if (mergeResult.merged.length) {
        message.info(
          tr("Merged {0} standalone service(s) into combo \"{1}\": {2}", { 0: mergeResult.merged.length, 1: combo.comboName || "", 2: mergeResult.merged.map((row) => row.serviceName || tr("Service")).join(", ") }),
        );
      }
      // The flat VAT % field is shared across every combo on the case, so
      // only the first combo applied seeds it — later combos leave
      // whatever rate is already there untouched (it stays freely
      // hand-editable either way, per the multi-combo design).
      if (appliedCombos.length === 0) {
        handlePackageSummaryChange("packageVatRate", combo.packageVatRate || 0);
      }
      if (vndId) {
        setForm((p) => ({ ...p, currencyId: String(vndId) }));
      }
      // One entry per applied combo instance — drives the section header +
      // "Remove combo" action in ProjectServicesTable. Always recorded, in
      // whatever currency the combo template was actually configured with
      // (VND included), not only when a conversion to VND was needed.
      setAppliedCombos((prev) => [
        ...prev,
        {
          instanceId: comboInstanceId,
          comboId: runtimeExtractId(combo),
          comboName: combo.comboName || "",
          originalAmount: parseNum(combo.packageSubTotal),
          convertedAmount: comboOwnAmount,
          currencyCode: getCurrencyCode(currencyFromRecord(combo, currencies)),
          wasConverted: comboWasConverted,
        },
      ]);
      message.success(tr("Applied combo \"{0}\".", { 0: combo.comboName }));
    },
    [
      combos,
      handlePackageSummaryChange,
      defaultCurrencyId,
      form.date,
      form.financialSourceType,
      form.pricingMode,
      form.packageSubTotal,
      currencies,
      appliedCombos.length,
      rows,
    ],
  );

  // Ad-hoc combo — a one-off bundle of services grouped under a single flat
  // package price, built directly inside the Add Service modal (unlike
  // applyCombo above, this is NOT backed by a serviceCombos catalog record:
  // _comboCatalogId stays null, only comboName + pricingSnapshot carry the
  // traceability data). Mirrors applyCombo's row-building so ad-hoc rows
  // behave identically to real-combo rows everywhere else (deleteRow,
  // submit, task overview, its own section header / remove action via
  // _comboInstanceId).
  const applyAdhocCombo = useCallback(
    async (payload) => {
      const items = payload?.items || [];
      if (!items.length) return;
      const comboName = String(payload?.comboName || "").trim();
      const comboType = payload?.serviceComboType || null;
      const packageSubTotal = parseNum(payload?.packageSubTotal);
      const packageVatRate = parseNum(payload?.packageVatRate);
      const vndId = defaultCurrencyId;
      const adhocComboId = `adhoc-${Date.now()}`;

      const comboCurrencyId = extractCurrencyId(payload?.currencyId) || vndId;
      const comboCurrencyCode = getCurrencyCode(
        findCurrencyById(currencies, comboCurrencyId) || defaultCurrencyObject(),
      );
      const { convertedSubTotal, wasConverted: comboWasConverted } = await convertComboSubTotalToVnd(
        packageSubTotal,
        comboCurrencyId,
        vndId,
        form.date,
      );

      const comboSnapshot = {
        comboId: null,
        comboName,
        comboCode: null,
        serviceComboType: comboType,
        packageSubTotal,
        packageVatRate,
        currencyCode: comboCurrencyCode,
        convertedPackageSubTotal: convertedSubTotal,
        convertedCurrencyCode: DEFAULT_CURRENCY_CODE,
        appliedAt: new Date().toISOString(),
        source: "adhoc",
        items: items.map((item) => ({
          serviceId: item.serviceId ? runtimeExtractId(item.serviceId) : null,
          serviceName: item.serviceName || "",
          quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
        })),
      };

      // See applyCombo's comment above: appends alongside any previously
      // applied combos when already in package mode; clears all existing
      // rows when the form was still in line pricing mode, since an ad-hoc
      // combo forces package pricing too and must not mix with line-priced
      // rows.
      const wasPackageMode = isPackagePricing(form.pricingMode);
      const newRows = [];
      const skippedDuplicateNames = [];
      // Existing rows stay on the case either way (folded / merged into this
      // combo below), so a combo item duplicating one of them is skipped.
      const dedupeBaseline = [...rows];
      items.forEach((item) => {
        if (findDuplicateServiceRow(dedupeBaseline, { serviceId: item.serviceId, serviceName: item.serviceName })) {
          skippedDuplicateNames.push(item.serviceName || "");
          return;
        }
        dedupeBaseline.push({
          serviceId: item.serviceId ? String(item.serviceId) : null,
          serviceName: item.serviceName || "",
        });
        const unitCount = Math.max(1, parseInt(item.quantity, 10) || 1);
        const itemTaskTemplates = normalizeCustomTaskTemplates(item.taskTemplates);
        for (let i = 0; i < unitCount; i++) {
          newRows.push({
            _id: Date.now() + Math.random(),
            serviceId: item.serviceId ? String(item.serviceId) : null,
            serviceName: item.serviceName || "",
            serviceType: item.serviceType || "",
            description: item.description || "",
            currencyId: vndId ? String(vndId) : null,
            _sourceCurrencyId: vndId ? String(vndId) : null,
            basePrice: 0,
            vat: 0,
            billingMode: BILLING_PACKAGE_INCLUDED,
            financialSourceType: form.financialSourceType || SOURCE_NONE,
            pricingMode: PRICING_MODE_PACKAGE,
            _packageBasePrice: 0,
            _comboInstanceId: adhocComboId,
            _comboCatalogId: null,
            _comboName: comboName,
            _comboSnapshot: comboSnapshot,
            _comboItemSnapshot: {
              price: parseNum(item.price),
              vat: parseNum(item.vat),
              currency: findCurrencyById(currencies, extractCurrencyId(item.currencyId)) ||
                currencyFromRecord({ currencyId: comboCurrencyId }, currencies, defaultCurrencyObject()),
            },
            _customTaskTemplates: itemTaskTemplates,
            _saveToCatalog: !!item.saveToCatalog,
          });
        }
      });
      if (skippedDuplicateNames.length) {
        message.warning(tr("Skipped {0} service(s) already on this case: {1}", { 0: skippedDuplicateNames.length, 1: skippedDuplicateNames.join(", ") }));
      }
      if (!newRows.length) return;

      const { rows: foldedExistingRows, contributionVnd: existingLineContributionVnd } = wasPackageMode
        ? { rows, contributionVnd: 0 }
        : await foldLineRowsIntoPackage(rows, currencies, vndId, form.date);
      // See applyCombo's matching comment: combos never merge — this
      // combo's own amount (its converted total, plus any pre-existing
      // line rows folded in on the very first combo applied) is tracked
      // independently on its own rows/appliedCombos entry.
      // Line/Combo sync: standalone services join this combo — their value
      // (_packageBasePrice: the folded VND line price, or the package share
      // they already added in Combo pricing) becomes part of its amount.
      const mergeResult = mergeStandaloneIntoCombo(
        foldedExistingRows,
        { instanceId: adhocComboId, catalogId: null, name: comboName, snapshot: comboSnapshot, currency: defaultCurrencyObject() },
        (row) => parseNum(row._packageBasePrice),
      );
      const comboOwnAmount = convertedSubTotal + mergeResult.contribution;
      const vatRateForRows = parseNum(form.packageVatRate) || packageVatRate || 0;
      const comboOwnVatAmount = Math.round((comboOwnAmount * vatRateForRows) / 100);
      const newRowsWithOwnPricing = newRows.map((row) => ({
        ...row,
        packageSubTotal: comboOwnAmount,
        packageVatRate: vatRateForRows,
        packageVatAmount: comboOwnVatAmount,
        packageTotalAmount: comboOwnAmount + comboOwnVatAmount,
      }));
      const mergedRowIds = new Set(mergeResult.merged.map((row) => row._id));
      const existingRowsAfterMerge = mergeResult.rows.map((row) =>
        mergedRowIds.has(row._id)
          ? {
            ...row,
            packageSubTotal: comboOwnAmount,
            packageVatRate: vatRateForRows,
            packageVatAmount: comboOwnVatAmount,
            packageTotalAmount: comboOwnAmount + comboOwnVatAmount,
          }
          : row,
      );
      setRows([...existingRowsAfterMerge, ...newRowsWithOwnPricing]);
      // Rows left standalone (Contract/Quotation-sourced) keep their own
      // share; merged values moved into comboOwnAmount.
      handlePackageSummaryChange(
        "packageSubTotal",
        parseNum(wasPackageMode ? form.packageSubTotal : existingLineContributionVnd) -
          mergeResult.contribution +
          comboOwnAmount,
      );
      if (mergeResult.merged.length) {
        message.info(
          tr("Merged {0} standalone service(s) into combo \"{1}\": {2}", { 0: mergeResult.merged.length, 1: comboName, 2: mergeResult.merged.map((row) => row.serviceName || tr("Service")).join(", ") }),
        );
      }
      if (appliedCombos.length === 0) {
        handlePackageSummaryChange("packageVatRate", packageVatRate);
      }
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
          wasConverted: comboWasConverted,
        },
      ]);
      // Deferred, same as the per-service "save to catalog" checkbox: the
      // actual serviceCombos/serviceComboItems writes only happen once the
      // case is confirmed created (handleSubmit's tail), using whichever
      // rows from this combo instance still have a real serviceId then.
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
      message.success(tr("Applied combo \"{0}\".", { 0: comboName }));
    },
    [
      defaultCurrencyId,
      form.date,
      form.financialSourceType,
      form.pricingMode,
      form.packageSubTotal,
      handlePackageSummaryChange,
      currencies,
      appliedCombos.length,
      rows,
    ],
  );

  // Removes one applied combo instance entirely — its rows AND its own
  // price contribution (packageSubTotal is now a running sum across every
  // applied combo — see applyCombo/applyAdhocCombo — so removing one
  // subtracts back only the amount that combo itself added). Deleting an
  // individual row inside a combo's section (the existing per-row trash
  // icon) stays separate and does not touch the price, same as before.
  const removeAppliedCombo = useCallback(
    (instanceId) => {
      const entry = appliedCombos.find((c) => c.instanceId === instanceId);
      if (!entry) return;
      markDirty();
      // Services merged into this combo (Line/Combo sync) are part of it
      // and go with it; say so, since they were added separately.
      const mergedGoing = rows.filter((r) => r._comboInstanceId === instanceId && r._mergedIntoCombo);
      if (mergedGoing.length) {
        message.info(
          tr("Also removed {0} service(s) merged into this combo: {1}", { 0: mergedGoing.length, 1: mergedGoing.map((r) => r.serviceName || tr("Service")).join(", ") }),
        );
      }
      setRows((prev) => prev.filter((r) => r._comboInstanceId !== instanceId));
      handlePackageSummaryChange(
        "packageSubTotal",
        Math.max(parseNum(form.packageSubTotal) - entry.convertedAmount, 0),
      );
      setAppliedCombos((prev) => prev.filter((c) => c.instanceId !== instanceId));
    },
    [appliedCombos, form.packageSubTotal, handlePackageSummaryChange, markDirty, rows],
  );

  // Combos never merge into one blended pool — each applied combo keeps its
  // own independently-editable amount (appliedCombos[].convertedAmount +
  // the matching packageSubTotal stamped on that combo's own rows), and the
  // record's packageSubTotal is just the sum of all of them. Editing one
  // combo's amount here only ever touches that combo's own entry/rows, then
  // re-sums the total — it never rewrites another combo's amount.
  const updateComboAmount = (instanceId, nextAmount) => {
    const amount = Math.max(0, parseNum(nextAmount));
    markDirty();
    const vatRate = parseNum(form.packageVatRate) || 0;
    const rowVatAmount = Math.round((amount * vatRate) / 100);
    setAppliedCombos((prev) =>
      prev.map((c) => (c.instanceId === instanceId ? { ...c, convertedAmount: amount } : c)),
    );
    setRows((prev) =>
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
    const nextVatAmount = Math.round((nextSubTotal * vatRate) / 100);
    setForm((p) => ({
      ...p,
      packageSubTotal: nextSubTotal,
      packageVatAmount: nextVatAmount,
      packageTotalAmount: nextSubTotal + nextVatAmount,
    }));
  };

  // ── SUBMIT ────────────────────────────────────────────────────
  const handleServicePricingModeChange = useCallback(
    (mode) => {
      const nextMode = isPackagePricing(mode) ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE;
      if (nextMode === form.pricingMode) return;
      // Each mode keeps its own rows/appliedCombos/package totals, parked
      // in this ref while the other mode is active — switching still keeps
      // a Line-priced case from mixing with combo/package rows (each mode
      // only ever sees its own list), but a round trip (Line -> Combo ->
      // Line) now restores exactly what was there instead of losing it.
      modeStateParkRef.current[form.pricingMode] = {
        rows,
        appliedCombos,
        packageSubTotal: form.packageSubTotal,
        packageVatRate: form.packageVatRate,
        packageVatAmount: form.packageVatAmount,
        packageTotalAmount: form.packageTotalAmount,
      };
      const restored = modeStateParkRef.current[nextMode];
      setRows(restored?.rows || []);
      setAppliedCombos(restored?.appliedCombos || []);
      setForm((p) => ({
        ...p,
        pricingMode: nextMode,
        financialSourceType:
          p.financialSourceType === SOURCE_NONE ? SOURCE_MANUAL : p.financialSourceType,
        packageSubTotal: restored?.packageSubTotal || 0,
        packageVatRate: restored?.packageVatRate || 0,
        packageVatAmount: restored?.packageVatAmount || 0,
        packageTotalAmount: restored?.packageTotalAmount || 0,
      }));
    },
    [form.pricingMode, form.packageSubTotal, form.packageVatRate, form.packageVatAmount, form.packageTotalAmount, rows, appliedCombos],
  );

  const handleSubmit = async () => {
    if (!form.internalCompanyId) {
      message.warning(tr("Please select an Internal Company"));
      return;
    }
    if (!form.customerId) {
      message.warning(tr("Please select a Customer"));
      return;
    }
    if (!form.projectName.trim()) {
      message.warning(tr("Please enter a Case name"));
      return;
    }
    if (!form.date) {
      message.warning(tr("Please select an open date"));
      return;
    }
    if (currencies.length && !form.currencyId) {
      message.warning(tr("Please select a Case Currency"));
      return;
    }
    if (!rows.length) {
      message.warning(tr("Please add at least one service before creating the case."));
      return;
    }

    setSubmittingState(true);
    try {
      let activeQuotationId = form.quotationId
        ? parseInt(form.quotationId)
        : null;

      const selectedQuotation = activeQuotationId
        ? quotations.find((q) => String(q.id) === String(activeQuotationId))
        : null;
      const selectedContract = form.contractId
        ? contracts.find((c) => String(c.id) === String(form.contractId))
        : null;
      const submitSourceRateDate = sourceDocumentRateDate(
        selectedContract,
        selectedContract ? null : selectedQuotation,
        moneyDateKey,
      );
      const activePackageMode = isPackagePricing(form.pricingMode);
      const activeFinancialSourceType = selectedContract
        ? SOURCE_CONTRACT
        : selectedQuotation
          ? SOURCE_QUOTATION
          : form.financialSourceType || SOURCE_MANUAL;
      let quotationFinancialSummary = null;
      let contractFinancialSummary = null;
      if (activeQuotationId && activeFinancialSourceType === SOURCE_QUOTATION && !activePackageMode) {
        setSubmitStep(tr("Checking quotation exchange rates..."));
        const preliminaryQuotationSummary = buildServiceFinancialSummary({
          rows,
          currencies,
          baseCurrency: selectedCurrency,
          pricingDate: form.date,
          sourceRateDate: submitSourceRateDate,
          packageMode: activePackageMode,
          activeFinancialSourceType,
          includeBillingModes: [BILLING_LINE],
        });
        const rateCurrencyIds = getConversionSourceCurrencyIds(
          preliminaryQuotationSummary.groups,
          selectedCurrency,
        );
        const quotationExchangeRates = rateCurrencyIds.length
          ? await fetchExchangeRatesForConversion(
            rateCurrencyIds,
            extractCurrencyId(selectedCurrency),
          )
          : [];
        quotationFinancialSummary = buildServiceFinancialSummary({
          rows,
          currencies,
          baseCurrency: selectedCurrency,
          exchangeRates: quotationExchangeRates,
          pricingDate: form.date,
          sourceRateDate: submitSourceRateDate,
          packageMode: activePackageMode,
          activeFinancialSourceType,
          includeBillingModes: [BILLING_LINE],
        });
        if (!quotationFinancialSummary.converted.canConvert) {
          throw new Error(
            tr("Missing exchange rate for quotation total: {0}", { 0: formatMissingRatePairs(
              quotationFinancialSummary.missing,
              selectedCurrency,
            ) }),
          );
        }
      }
      if (selectedContract && activeFinancialSourceType === SOURCE_CONTRACT && !activePackageMode) {
        setSubmitStep(tr("Checking contract exchange rates..."));
        const preliminaryContractSummary = buildServiceFinancialSummary({
          rows,
          currencies,
          baseCurrency: selectedCurrency,
          pricingDate: form.date,
          sourceRateDate: submitSourceRateDate,
          packageMode: activePackageMode,
          activeFinancialSourceType,
          includeBillingModes: [BILLING_LINE],
        });
        const rateCurrencyIds = getConversionSourceCurrencyIds(
          preliminaryContractSummary.groups,
          selectedCurrency,
        );
        const contractExchangeRates = rateCurrencyIds.length
          ? await fetchExchangeRatesForConversion(
            rateCurrencyIds,
            extractCurrencyId(selectedCurrency),
          )
          : [];
        contractFinancialSummary = buildServiceFinancialSummary({
          rows,
          currencies,
          baseCurrency: selectedCurrency,
          exchangeRates: contractExchangeRates,
          pricingDate: form.date,
          sourceRateDate: submitSourceRateDate,
          packageMode: activePackageMode,
          activeFinancialSourceType,
          includeBillingModes: [BILLING_LINE],
        });
        if (!contractFinancialSummary.converted.canConvert) {
          throw new Error(
            tr("Missing exchange rate for contract total: {0}", { 0: formatMissingRatePairs(
              contractFinancialSummary.missing,
              selectedCurrency,
            ) }),
          );
        }
      }
      const packageFieldsForRow = (row = {}) => {
        if (!activePackageMode) {
          return {
            packageSubTotal: 0,
            packageVatRate: 0,
            packageVatAmount: 0,
            packageTotalAmount: 0,
          };
        }
        const subTotal = parseNum(row.packageSubTotal ?? form.packageSubTotal);
        const vatRate = parseNum(row.packageVatRate ?? form.packageVatRate);
        const rawPackageVatAmount = row.packageVatAmount ?? form.packageVatAmount;
        const vatAmount =
          (rawPackageVatAmount === undefined || rawPackageVatAmount === null || rawPackageVatAmount === "")
            ? Math.round((subTotal * vatRate) / 100)
            : parseNum(rawPackageVatAmount);
        const totalAmount =
          parseNum(row.packageTotalAmount ?? form.packageTotalAmount) ||
          subTotal + vatAmount;
        return {
          packageSubTotal: subTotal,
          packageVatRate: vatRate,
          packageVatAmount: vatAmount,
          packageTotalAmount: totalAmount,
        };
      };
      const projectPackageData = activePackageMode
        ? {
            pricingMode: PRICING_MODE_PACKAGE,
            financialSourceType: activeFinancialSourceType,
            packageSubTotal: Number(form.packageSubTotal) || 0,
            packageVatRate: Number(form.packageVatRate) || 0,
            packageVatAmount: Number(form.packageVatAmount) || 0,
            packageTotalAmount: Number(form.packageTotalAmount) || 0,
            subTotal: Number(form.packageSubTotal) || 0,
            vatAmount: Number(form.packageVatAmount) || 0,
            totalAmount: Number(form.packageTotalAmount) || 0,
          }
        : {
            pricingMode: PRICING_MODE_LINE,
            financialSourceType: activeFinancialSourceType,
          };
      const createProject = async (data) => {
        try {
          return await ctx.api.request({
            url: "projects:create",
            method: "POST",
            data,
          });
        } catch (error) {
          const fallback = { ...data };
          delete fallback.pricingMode;
          delete fallback.financialSourceType;
          delete fallback.packageSubTotal;
          delete fallback.packageVatRate;
          delete fallback.packageVatAmount;
          delete fallback.packageTotalAmount;
          delete fallback.subTotal;
          delete fallback.vatAmount;
          delete fallback.totalAmount;
          console.warn("Retrying project create without combo pricing fields:", error);
          try {
            return await ctx.api.request({
              url: "projects:create",
              method: "POST",
              data: fallback,
            });
          } catch (fallbackError) {
            const minimal = { ...fallback };
            delete minimal.currencyId;
            delete minimal.currency;
            delete minimal.currencies;
            console.warn("Retrying project create without currency fields:", fallbackError);
            message.warning(tr("Could not save the case currency — check it after the case is created."));
            return ctx.api.request({
              url: "projects:create",
              method: "POST",
              data: minimal,
            });
          }
        }
      };

      // 2. Create Case (Project)
      setSubmitStep(tr("Creating Case..."));
      // managerId (lawyers FK) is the source of truth for who picked the
      // Manager on this form. projectManagerId (users FK) is derived from it
      // and kept in sync only for backward compat with code/reports that
      // still read the old field — do not let the two drift independently.
      const selectedManagerLawyer = form.managerId
        ? (lawyers || []).find((l) => String(l.id) === String(form.managerId))
        : null;
      const derivedProjectManagerUserId = selectedManagerLawyer
        ? getLawyerLinkedUserId(selectedManagerLawyer)
        : null;
      const projRes = await createProject({
          internalCompanyId: parseInt(form.internalCompanyId),
          customerId: parseInt(form.customerId),
          projectName: form.projectName.trim(),
          date: form.date || null,
          deadline: form.deadline || null,
          priority: form.priority,
          // manager (belongsTo relation) + managerId (scalar FK) are set
          // together to the same lawyers.id — same pair Library.js's
          // legalReference/legalStudy creation writes for their own
          // Manager field. projectManagerId (users FK) is kept below only
          // for backward compat with old code/reports that still read it.
          manager: form.managerId ? parseInt(form.managerId) : null,
          managerId: form.managerId ? parseInt(form.managerId) : null,
          projectManagerId: derivedProjectManagerUserId
            ? parseInt(derivedProjectManagerUserId)
            : null,
          description: form.description || null,
          contractId: form.contractId ? parseInt(form.contractId) : null,
          quotationId: activeQuotationId,
          // The "Currency" field on the Cases collection is a belongsTo
          // association named "currencies" (see Cases > Configure fields),
          // not a plain "currencyId" scalar — Nocobase silently drops
          // unknown payload keys, so sending "currencyId" here left the
          // Case's Currency permanently unset. "currencyId" is kept too in
          // case a legacy raw column with that name also exists somewhere.
          currencies: form.currencyId ? parseInt(form.currencyId) : null,
          currencyId: form.currencyId ? parseInt(form.currencyId) : null,
          caseCode: form.caseCode || null,
          status: "toDo",
          createdById: currentUser?.id || null,
          updatedById: currentUser?.id || null,
          assignees: form.lawyerIds.map((id) => ({ id: parseInt(id) })),
          ...projectPackageData,
      });

      const rawProjId = projRes?.data?.data?.id || projRes?.data?.id;
      const projectId = rawProjId ? parseInt(rawProjId) : null;
      const generatedCaseCode =
        projRes?.data?.data?.caseCode ||
        projRes?.data?.caseCode ||
        form.caseCode;
      if (!projectId)
        throw new Error(tr("Could not retrieve projectId after creation"));

      // Derive status
      const quotationStatus = String(
        selectedQuotation?.status || "",
      ).toLowerCase();
      const ORDER_STATUSES = [
        "order",
        "ordered",
        "won",
        "done",
        "approved",
        "accepted",
      ];
      const deriveStatus = (row) => {
        const billingMode =
          row.billingMode ||
          billingModeForContext({
            fromQuotation: !!row._fromQuotation,
            packageMode: activePackageMode,
            hasFinancialSource: activeFinancialSourceType !== SOURCE_NONE,
          });
        if (activeFinancialSourceType === SOURCE_CONTRACT) return "ordered";
        if (billingMode === BILLING_SCOPE || billingMode === BILLING_SEPARATE)
          return "pending_quote";
        if (ORDER_STATUSES.includes(quotationStatus)) return "ordered";
        return "pending_quote";
      };
      const createProjectService = async (data) => {
        try {
          return await ctx.api.request({
            url: "projectServices:create",
            method: "POST",
            data,
          });
        } catch (error) {
          const fallback = { ...data };
          delete fallback.contractId;
          delete fallback.contractServiceId;
          delete fallback.quotationId;
          delete fallback.quotationServiceId;
          delete fallback.quantity;
          delete fallback.subTotal;
          delete fallback.vatAmount;
          delete fallback.totalAmount;
          console.warn(
            "Retrying projectService without relation/amount sync fields:",
            error,
          );
          try {
            return await ctx.api.request({
              url: "projectServices:create",
              method: "POST",
              data: fallback,
            });
          } catch (fallbackError) {
            const minimal = { ...fallback };
            delete minimal.currencyId;
            delete minimal.currency;
            delete minimal.pricingMode;
            delete minimal.billingMode;
            delete minimal.financialSourceType;
            delete minimal.packageSubTotal;
            delete minimal.packageVatRate;
            delete minimal.packageVatAmount;
            delete minimal.packageTotalAmount;
            delete minimal.comboId;
            delete minimal.serviceCombo;
            delete minimal.comboName;
            delete minimal.pricingSnapshot;
            console.warn(
              "Retrying projectService without pricing combo fields:",
              fallbackError,
            );
            message.warning(tr("Could not save the currency of service \"{0}\" — check it after the case is created.", { 0: data?.serviceName || "" }));
            return ctx.api.request({
              url: "projectServices:create",
              method: "POST",
              data: minimal,
            });
          }
        }
      };
      const cleanPayload = (payload = {}) => {
        const next = { ...(payload || {}) };
        Object.keys(next).forEach((key) => {
          if (next[key] === undefined) delete next[key];
        });
        return next;
      };
      const stripContractServiceFallbackFields = (payload = {}, minimal = false) => {
        const next = cleanPayload(payload);
        [
          "currencyId",
          "currency",
          "contracts",
          "services",
          "projectServices",
          "billingMode",
          "financialSourceType",
        ].forEach((key) => delete next[key]);
        if (minimal) {
          [
            "serviceType",
            "serviceId",
            "ServiceId",
            "pricingMode",
            "packageSubTotal",
            "packageVatRate",
            "packageVatAmount",
            "packageTotalAmount",
          ].forEach((key) => delete next[key]);
        }
        return next;
      };
      const requestContractService = async ({ action, id, data }) => {
        const isUpdate = action === "update";
        const request = (payload) => {
          const options = {
            url: isUpdate ? "contractServices:update" : "contractServices:create",
            method: "POST",
            data: cleanPayload(lineWritePayload(payload)),
          };
          if (isUpdate) options.params = { filterByTk: parseInt(id) };
          return ctx.api.request(options);
        };

        try {
          return await request(data);
        } catch (error) {
          try {
            return await request(stripContractServiceFallbackFields(data));
          } catch (fallbackError) {
            try {
              return await request(stripContractServiceFallbackFields(data, true));
            } catch (minimalError) {
              // the first error carries the real reason (e.g. a billed contract)
              message.warning(apiErrorText(error, tr("Could not {0} the contract line.", { 0: action })));
              console.warn(
                `Could not ${action} contractService:`,
                minimalError || fallbackError || error,
              );
              return null;
            }
          }
        }
      };
      const createCustomDraftTasksForService = async (row, createdProjectServiceId) => {
        const customTasks = normalizeCustomTaskTemplates(row?._customTaskTemplates);
        if (row?.serviceId || !createdProjectServiceId || !customTasks.length) return;
        setSubmitStep(tr("Creating tasks for {0}...", { 0: row.serviceName || tr("custom service") }));
        for (let taskIndex = 0; taskIndex < customTasks.length; taskIndex += 1) {
          const task = customTasks[taskIndex];
          try {
            const payload = {
              title: task.title,
              status: "toDo",
              projectId,
              serviceId: createdProjectServiceId,
              // Was missing entirely — without it, by_service_task_group_
              // done_creates_payment_request (unified_contract_payment_
              // schedule.sql) can never match this task to its service.
              projectServiceId: createdProjectServiceId,
              isPaymentTrigger: !!task.isPaymentTrigger,
            };
            if (task.description) payload.description = task.description;
            await ctx.api.request({
              url: "tasks:create",
              method: "POST",
              data: payload,
            });
          } catch (error) {
            console.warn("Could not create custom service task:", error);
          }
        }
      };

      // For catalog services, tasks are auto-cloned from projectTemplates by a DB
      // trigger (see pgsql/AutoCreateTaskFromTemplate.sql) when projectServices is
      // created. If the user edited/added/removed sample tasks in the "Sample Task
      // Overview" before submit, that trigger still clones the *original* template
      // text — so we diff the edited list against the pristine template list here
      // and patch the trigger-created tasks to match what the user actually saved.
      // By Case contract created before this Case: link the real tasks to the
      // installments whose trigger sample tasks were ticked in
      // ContractCreateForm.js (contractPaymentSchedules.triggerTemplateIds) —
      // see resolveTemplateTaskLinks. Runs after every service row (and its
      // task sync) is saved, so the tasks and their final titles exist.
      const linkInstallmentTemplateTasks = async () => {
        const linkedContractId = form.contractId ? parseInt(form.contractId) : null;
        if (!linkedContractId || !projectId) return;
        try {
          const scheduleRes = await ctx.api.request({
            url: "contractPaymentSchedules:list",
            params: {
              filter: JSON.stringify({ contractId: { $eq: linkedContractId } }),
              fields: ["id", "triggerTemplateIds"],
              pageSize: 200,
            },
          });
          const schedules = (scheduleRes?.data?.data || []).filter(
            (schedule) => Array.isArray(schedule.triggerTemplateIds) && schedule.triggerTemplateIds.length,
          );
          if (!schedules.length) return;
          // 2026-09-28 (spec docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md §3):
          // a By Service contract's combo / item rows get their request only
          // when all trigger tasks are Done, so there is no request to link
          // to — tick isPaymentTrigger on the matched tasks instead.
          const contractRes = await ctx.api.request({
            url: "contracts:get",
            params: { filterByTk: linkedContractId, fields: ["id", "contractType"] },
          });
          const isByServiceContract = contractRes?.data?.data?.contractType === "byService";
          const [prRes, taskRes] = await Promise.all([
            ctx.api.request({
              url: "paymentRequests:list",
              params: {
                filter: JSON.stringify({
                  contractPaymentScheduleId: { $in: schedules.map((schedule) => schedule.id) },
                }),
                fields: ["id", "contractPaymentScheduleId"],
                pageSize: 200,
              },
            }),
            ctx.api.request({
              url: "tasks:list",
              params: {
                filter: JSON.stringify({ projectId: { $eq: projectId } }),
                fields: ["id", "title", "serviceId", "status"],
                pageSize: 1000,
              },
            }),
          ]);
          const paymentRequestsList = prRes?.data?.data || [];
          const caseTasks = taskRes?.data?.data || [];
          let failedLinks = 0;
          for (const schedule of schedules) {
            if (isByServiceContract) {
              const { taskIds, unresolvedCount } = resolveTemplateTaskLinks({
                templateIds: schedule.triggerTemplateIds,
                rows,
                tasks: caseTasks,
              });
              failedLinks += unresolvedCount;
              for (const taskId of taskIds) {
                try {
                  await ctx.api.request({
                    url: `tasks:update?filterByTk=${taskId}`,
                    method: "POST",
                    data: { isPaymentTrigger: true },
                  });
                } catch (linkError) {
                  failedLinks += 1;
                  console.warn("Could not tick trigger task:", taskId, linkError);
                }
              }
              continue;
            }
            const pr = paymentRequestsList.find(
              (item) =>
                String(runtimeExtractId(item.contractPaymentScheduleId)) === String(schedule.id),
            );
            if (!pr) {
              failedLinks += schedule.triggerTemplateIds.length;
              continue;
            }
            const { taskIds, unresolvedCount } = resolveTemplateTaskLinks({
              templateIds: schedule.triggerTemplateIds,
              rows,
              tasks: caseTasks,
            });
            failedLinks += unresolvedCount;
            for (const taskId of taskIds) {
              try {
                await ctx.api.request({
                  url: `tasks:update?filterByTk=${taskId}`,
                  method: "POST",
                  data: { linkedPaymentRequestId: pr.id },
                });
              } catch (linkError) {
                failedLinks += 1;
                console.warn("Could not link task to installment:", taskId, linkError);
              }
            }
          }
          if (failedLinks) {
            message.warning(
              tr("Could not link {0} task(s) to their payment installment — link them in Task Management.", { 0: failedLinks }),
            );
          }
        } catch (error) {
          // Visible, not console-only: e.g. contractPaymentSchedules.
          // triggerTemplateIds not registered yet on this instance.
          console.warn("Could not link installment trigger tasks:", error);
          message.warning(
            tr("Could not link the contract's installment trigger tasks — link them in Task Management."),
          );
        }
      };

      const syncCatalogServiceTasks = async (row, createdProjectServiceId) => {
        if (!row?.serviceId || !projectId || !Array.isArray(row?._templateTasks))
          return;

        const originalTasks = getServiceTaskTemplates(taskTemplates, row);
        const originalById = new Map(
          originalTasks.map((task) => [String(task.id), task]),
        );
        const finalIds = new Set();
        const toUpdate = [];
        const toCreate = [];

        row._templateTasks.forEach((task) => {
          const key = String(task?._id ?? task?.id ?? "");
          const original = key && originalById.has(key) ? originalById.get(key) : null;
          const title = normalizeTaskText(getTaskTemplateRawTitle(task)) || tr("Untitled task");
          const description = normalizeTaskText(getTaskTemplateDescription(task));
          const isPaymentTrigger = !!task.isPaymentTrigger;
          if (original) {
            finalIds.add(key);
            const originalTitle =
              normalizeTaskText(getTaskTemplateRawTitle(original)) || tr("Untitled task");
            const originalDescription = normalizeTaskText(
              getTaskTemplateDescription(original),
            );
            const originalIsPaymentTrigger = !!original.isPaymentTrigger;
            if (
              title !== originalTitle ||
              description !== originalDescription ||
              isPaymentTrigger !== originalIsPaymentTrigger
            ) {
              toUpdate.push({ matchTitle: originalTitle, title, description, isPaymentTrigger });
            }
          } else {
            toCreate.push({ title, description, isPaymentTrigger });
          }
        });

        const toRemoveTitles = originalTasks
          .filter((task) => !finalIds.has(String(task.id)))
          .map((task) => normalizeTaskText(getTaskTemplateRawTitle(task)) || "Untitled task");

        if (!toUpdate.length && !toCreate.length && !toRemoveTitles.length) return;

        let autoCreatedTasks = [];
        try {
          const taskRes = await ctx.api.request({
            url: "tasks:list",
            params: {
              pageSize: 200,
              page: 1,
              fields: "id,title,description",
              filter: JSON.stringify({
                projectId: { $eq: projectId },
                serviceId: { $eq: parseInt(row.serviceId) },
              }),
            },
          });
          autoCreatedTasks = taskRes?.data?.data || [];
        } catch (error) {
          console.warn("Could not fetch auto-created template tasks for sync:", error);
          return;
        }

        const consumed = new Set();
        const findByTitle = (title) =>
          autoCreatedTasks.find(
            (task) =>
              !consumed.has(task.id) &&
              normalizeTaskLookup(task.title) === normalizeTaskLookup(title),
          );

        for (const upd of toUpdate) {
          const match = findByTitle(upd.matchTitle);
          if (!match) continue;
          consumed.add(match.id);
          try {
            await ctx.api.request({
              url: "tasks:update",
              method: "POST",
              params: { filterByTk: match.id },
              data: {
                title: upd.title,
                description: upd.description || null,
                isPaymentTrigger: upd.isPaymentTrigger,
              },
            });
          } catch (error) {
            console.warn("Could not sync edited template task:", error);
          }
        }

        for (const title of toRemoveTitles) {
          const match = findByTitle(title);
          if (!match) continue;
          consumed.add(match.id);
          try {
            await ctx.api.request({
              url: "tasks:destroy",
              method: "POST",
              params: { filterByTk: match.id },
            });
          } catch (error) {
            console.warn("Could not remove deselected template task:", error);
          }
        }

        for (const created of toCreate) {
          try {
            await ctx.api.request({
              url: "tasks:create",
              method: "POST",
              data: {
                title: created.title,
                description: created.description || null,
                status: "toDo",
                projectId,
                serviceId: parseInt(row.serviceId),
                projectServiceId: createdProjectServiceId,
                isPaymentTrigger: created.isPaymentTrigger,
              },
            });
          } catch (error) {
            console.warn("Could not create added template task:", error);
          }
        }
      };

      // 3. Process services. Contract values win over quotation when both are linked.
      // Collected across both branches below (with/without quotation) so step 4
      // (folder creation) can create 1 dedicated folder per service and stamp
      // it back onto the Case Services row (caseServices.folderId — see the
      // 2026-08-21 service-folder discussion). key mirrors TaskManagement.js's
      // getProjectServiceTaskKey/task.serviceId convention: catalog serviceId
      // when present, otherwise the projectService's own id (custom service),
      // so a task later resolves to the exact same key regardless of which
      // branch created its service.
      const createdServiceFolderCandidates = [];
      if (activeQuotationId && activeFinancialSourceType === SOURCE_QUOTATION) {
        setSubmitStep(tr("Syncing quotation services..."));
        const initialSnap = initialRowsRef.current || [];

        // 3a. Delete removed services (only for existing quotations)
        if (!activePackageMode) {
          for (const snap of initialSnap) {
            const stillExists = rows.some(
              (r) => String(r.serviceId) === String(snap.serviceId),
            );
            if (!stillExists && snap._qServiceId) {
              try {
                await ctx.api.request({
                  url: "quotationServices:destroy",
                  method: "POST",
                  params: { filterByTk: snap._qServiceId },
                });
              } catch (e) {
                console.warn("Could not delete quotationService:", e);
              }
            }
          }
        }

        // 3b. Update existing services or create new ones
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          if (!r.serviceName?.trim()) continue;

          let qSvcId = r._qServiceId;
          const rowBillingMode =
            r.billingMode ||
            billingModeForContext({
              fromQuotation: !!r._fromQuotation,
              packageMode: activePackageMode,
              hasFinancialSource: activeFinancialSourceType !== SOURCE_NONE,
            });
          const moneyEditable =
            rowBillingMode === BILLING_LINE || rowBillingMode === BILLING_SEPARATE;
          const rowFinancialSourceType =
            rowBillingMode === BILLING_SEPARATE
              ? SOURCE_MANUAL
              : rowBillingMode === BILLING_SCOPE
                ? SOURCE_NONE
                : activeFinancialSourceType;
          const rowPricingMode =
            rowBillingMode === BILLING_PACKAGE_INCLUDED
              ? PRICING_MODE_PACKAGE
              : moneyEditable
                ? PRICING_MODE_LINE
                : PRICING_MODE_SCOPE;
          const price = moneyEditable ? Number(r.basePrice) || 0 : 0;
          const vatPct = moneyEditable ? Number(r.vat) || 0 : 0;
          // priced in the line's own currency (cents for USD, whole đồng for VND)
          const amounts = calcLineAmounts(
            price,
            vatPct,
            findCurrencyById(currencies, extractCurrencyId(r.currencyId) || extractCurrencyId(form.currencyId)),
          );
          const vatAmount = amounts.vatAmount;
          const totalAmount = amounts.totalAmount;
          const rowPackageFields = packageFieldsForRow(r);
          const rowCurrencyId = extractCurrencyId(r.currencyId) || extractCurrencyId(form.currencyId);

          if (r._fromQuotation && qSvcId) {
            // Update existing
            const snap = initialSnap.find(
              (s) => String(s.serviceId) === String(r.serviceId),
            );
            if (
              activePackageMode ||
              !snap ||
              price !== Number(snap.basePrice) ||
              vatPct !== Number(snap.vat) ||
              String(rowCurrencyId || "") !== String(snap.currencyId || "")
            ) {
              try {
                await ctx.api.request({
                  url: "quotationServices:update",
                  method: "POST",
                  params: { filterByTk: qSvcId },
                  data: lineWritePayload({
                    caseId: projectId,
                    pricingMode: rowPricingMode,
                    basePrice: price,
                    quantity: 1,
                    vat: vatPct,
                    subTotal: amounts.subTotal,
                    vatAmount,
                    totalAmount,
                    currencyId: rowCurrencyId || null,
                    ...rowPackageFields,
                  }),
                });
              } catch (e) {
                message.warning(apiErrorText(e, tr("Could not save the quotation line.")));
                console.warn("Could not update quotationService:", e);
              }
            }
          } else if (
            (!activePackageMode && rowBillingMode === BILLING_LINE) ||
            rowBillingMode === BILLING_PACKAGE_INCLUDED
          ) {
            // Create new quotationService
            try {
              const qSvcRes = await ctx.api.request({
                url: "quotationServices:create",
                method: "POST",
                data: lineWritePayload({
                  quotationId: activeQuotationId,
                  caseId: projectId,
                  serviceId: r.serviceId ? parseInt(r.serviceId) : null,
                  serviceName: r.serviceName.trim(),
                  serviceType: r.serviceType?.trim() || null,
                  description: r.description?.trim() || null,
                  basePrice: price,
                  quantity: 1,
                  vat: vatPct,
                  subTotal: amounts.subTotal,
                  vatAmount,
                  totalAmount,
                  currencyId: rowCurrencyId || null,
                  pricingMode: rowPricingMode,
                  ...rowPackageFields,
                }),
              });
              const rawQSvcId = qSvcRes?.data?.data?.id || qSvcRes?.data?.id;
              qSvcId = rawQSvcId ? parseInt(rawQSvcId) : null;
            } catch (e) {
              message.warning(apiErrorText(e, tr("Could not save the quotation line.")));
              console.warn("Could not create quotationService:", e);
            }
          }

          // Create projectService and link it
          setSubmitStep(tr("Saving service {0}/{1}...", { 0: i + 1, 1: rows.length }));
          try {
            const psCreateRes = await createProjectService(lineWritePayload({
              projectId,
              quotationId:
                rowFinancialSourceType === SOURCE_QUOTATION
                  ? activeQuotationId
                  : null,
              contractId: form.contractId ? parseInt(form.contractId) : null,
              contractServiceId:
                rowFinancialSourceType === SOURCE_CONTRACT && r._contractServiceId
                  ? parseInt(r._contractServiceId)
                  : null,
              quotationServiceId:
                rowFinancialSourceType === SOURCE_QUOTATION ? qSvcId : null,
              serviceId: r.serviceId ? parseInt(r.serviceId) : null,
              serviceName: r.serviceName.trim(),
              serviceType: r.serviceType?.trim() || null,
              description: r.description?.trim() || null,
              quantity: 1,
              currencyId: rowCurrencyId || null,
              basePrice: price,
              vat: vatPct,
              subTotal: amounts.subTotal,
              vatAmount,
              totalAmount,
              pricingMode: rowPricingMode,
              ...rowPackageFields,
              billingMode: rowBillingMode,
              financialSourceType: rowFinancialSourceType,
              status: deriveStatus({ ...r, billingMode: rowBillingMode }),
              // Combo traceability — null for manually-added rows. Both
              // comboId (raw FK column, confirmed via Case Services >
              // Configure fields — NOT "serviceComboId") and serviceCombo
              // (the belongsTo relation field itself) are both sent for
              // compatibility, same as this file's serviceId/ServiceId/
              // services convention. comboName + pricingSnapshot are full
              // snapshots taken at apply time, so they stay correct even
              // if the combo template is later edited or deleted.
              comboId: r._comboCatalogId ? parseInt(r._comboCatalogId, 10) : null,
              serviceCombo: r._comboCatalogId ? parseInt(r._comboCatalogId, 10) : null,
              comboName: r._comboName || null,
              pricingSnapshot: r._comboSnapshot || null,
            }));
            const rawCreatedProjectServiceId =
              psCreateRes?.data?.data?.id || psCreateRes?.data?.id;
            const createdProjectServiceId = rawCreatedProjectServiceId
              ? parseInt(rawCreatedProjectServiceId)
              : null;
            if (createdProjectServiceId) {
              createdServiceFolderCandidates.push({
                key: r.serviceId
                  ? String(r.serviceId)
                  : String(createdProjectServiceId),
                serviceName: r.serviceName.trim(),
                projectServiceId: createdProjectServiceId,
              });
            }
            await createCustomDraftTasksForService(r, createdProjectServiceId);
            await syncCatalogServiceTasks(r, createdProjectServiceId);
            if (createdProjectServiceId && r._contractServiceId) {
              await ctx.api
                .request({
                  url: "contractServices:update",
                  method: "POST",
                  params: { filterByTk: parseInt(r._contractServiceId) },
                  data: {
                    projectId,
                    projectServiceId: createdProjectServiceId,
                    projectServices: createdProjectServiceId,
                  },
                })
                .catch((error) => {
                  message.warning(apiErrorText(error, tr("Could not link the contract line to the case.")));
                  console.warn("Could not link contractService to projectService:", error);
                });
            }
          } catch (e) {
            console.warn("Could not create projectService:", e);
          }
        }

        // 3c. The quotation's totals: its lines just changed, so the database
        // recomputes them (money_line_after -> trg_money_quotation_header).
      } else {
        // No quotation active (e.g. rows.length === 0 but user creates case anyway)
        const initialSnap = initialRowsRef.current || [];
        if (activeFinancialSourceType === SOURCE_CONTRACT && !activePackageMode) {
          for (const snap of initialSnap) {
            const stillExists = rows.some(
              (r) =>
                (snap._contractServiceId &&
                  String(r._contractServiceId) === String(snap._contractServiceId)) ||
                (snap.serviceId && String(r.serviceId) === String(snap.serviceId)),
            );
            if (!stillExists && snap._contractServiceId) {
              try {
                await ctx.api.request({
                  url: "contractServices:destroy",
                  method: "POST",
                  params: { filterByTk: snap._contractServiceId },
                });
              } catch (e) {
                console.warn("Could not delete contractService:", e);
              }
            }
          }
        }
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          if (!r.serviceName?.trim()) continue;
          const rowBillingMode =
            r.billingMode ||
            billingModeForContext({
              fromQuotation: false,
              packageMode: activePackageMode,
              hasFinancialSource: activeFinancialSourceType !== SOURCE_NONE,
            });
          const moneyEditable =
            rowBillingMode === BILLING_LINE || rowBillingMode === BILLING_SEPARATE;
          const rowFinancialSourceType =
            rowBillingMode === BILLING_SEPARATE
              ? SOURCE_MANUAL
              : rowBillingMode === BILLING_SCOPE
                ? SOURCE_NONE
                : activeFinancialSourceType;
          const rowPricingMode =
            rowBillingMode === BILLING_PACKAGE_INCLUDED
              ? PRICING_MODE_PACKAGE
              : moneyEditable
                ? PRICING_MODE_LINE
                : PRICING_MODE_SCOPE;
          const price = moneyEditable ? Number(r.basePrice) || 0 : 0;
          const vatPct = moneyEditable ? Number(r.vat) || 0 : 0;
          // priced in the line's own currency (cents for USD, whole đồng for VND)
          const amounts = calcLineAmounts(
            price,
            vatPct,
            findCurrencyById(currencies, extractCurrencyId(r.currencyId) || extractCurrencyId(form.currencyId)),
          );
          const rowPackageFields = packageFieldsForRow(r);
          const rowCurrencyId = extractCurrencyId(r.currencyId) || extractCurrencyId(form.currencyId);
          let contractSvcId = r._contractServiceId ? parseInt(r._contractServiceId) : null;
          const shouldSyncContractService =
            activeFinancialSourceType === SOURCE_CONTRACT &&
            form.contractId &&
            ((!activePackageMode && rowBillingMode === BILLING_LINE) ||
              rowBillingMode === BILLING_PACKAGE_INCLUDED);
          if (shouldSyncContractService) {
            const serviceId = r.serviceId ? parseInt(r.serviceId) : null;
            const contractServicePayload = {
              contractId: parseInt(form.contractId),
              contracts: parseInt(form.contractId),
              projectId,
              serviceId,
              ServiceId: serviceId,
              services: serviceId || undefined,
              serviceName: r.serviceName.trim(),
              serviceType: r.serviceType?.trim() || null,
              description: r.description?.trim() || null,
              quantity: 1,
              currencyId: rowCurrencyId || null,
              basePrice: price,
              vat: vatPct,
              subTotal: amounts.subTotal,
              vatAmount: amounts.vatAmount,
              totalAmount: amounts.totalAmount,
              pricingMode: rowPricingMode,
              ...rowPackageFields,
              billingMode: rowBillingMode,
              financialSourceType: rowFinancialSourceType,
              lineStatus: deriveStatus({ ...r, billingMode: rowBillingMode }),
            };
            setSubmitStep(tr("Syncing contract service {0}/{1}...", { 0: i + 1, 1: rows.length }));
            if (contractSvcId) {
              await requestContractService({
                action: "update",
                id: contractSvcId,
                data: contractServicePayload,
              });
            } else {
              const contractSvcRes = await requestContractService({
                action: "create",
                data: contractServicePayload,
              });
              const rawContractSvcId =
                contractSvcRes?.data?.data?.id ||
                contractSvcRes?.data?.id ||
                contractSvcRes?.id;
              contractSvcId = rawContractSvcId ? parseInt(rawContractSvcId) : null;
            }
          }
          setSubmitStep(tr("Saving service {0}/{1}...", { 0: i + 1, 1: rows.length }));
          try {
            const psCreateRes = await createProjectService(lineWritePayload({
              projectId,
              contractId: form.contractId ? parseInt(form.contractId) : null,
              contractServiceId:
                rowFinancialSourceType === SOURCE_CONTRACT && contractSvcId
                  ? parseInt(contractSvcId)
                  : null,
              serviceId: r.serviceId ? parseInt(r.serviceId) : null,
              serviceName: r.serviceName.trim(),
              serviceType: r.serviceType?.trim() || null,
              description: r.description?.trim() || null,
              quantity: 1,
              currencyId: rowCurrencyId || null,
              basePrice: price,
              vat: vatPct,
              subTotal: amounts.subTotal,
              vatAmount: amounts.vatAmount,
              totalAmount: amounts.totalAmount,
              pricingMode: rowPricingMode,
              ...rowPackageFields,
              billingMode: rowBillingMode,
              financialSourceType: rowFinancialSourceType,
              status: deriveStatus({ ...r, billingMode: rowBillingMode }),
              // Combo traceability — null for manually-added rows. Both
              // comboId (raw FK column, confirmed via Case Services >
              // Configure fields — NOT "serviceComboId") and serviceCombo
              // (the belongsTo relation field itself) are both sent for
              // compatibility, same as this file's serviceId/ServiceId/
              // services convention. comboName + pricingSnapshot are full
              // snapshots taken at apply time, so they stay correct even
              // if the combo template is later edited or deleted.
              comboId: r._comboCatalogId ? parseInt(r._comboCatalogId, 10) : null,
              serviceCombo: r._comboCatalogId ? parseInt(r._comboCatalogId, 10) : null,
              comboName: r._comboName || null,
              pricingSnapshot: r._comboSnapshot || null,
            }));
            const rawCreatedProjectServiceId =
              psCreateRes?.data?.data?.id || psCreateRes?.data?.id;
            const createdProjectServiceId = rawCreatedProjectServiceId
              ? parseInt(rawCreatedProjectServiceId)
              : null;
            if (createdProjectServiceId) {
              createdServiceFolderCandidates.push({
                key: r.serviceId
                  ? String(r.serviceId)
                  : String(createdProjectServiceId),
                serviceName: r.serviceName.trim(),
                projectServiceId: createdProjectServiceId,
              });
            }
            await createCustomDraftTasksForService(r, createdProjectServiceId);
            await syncCatalogServiceTasks(r, createdProjectServiceId);
            if (createdProjectServiceId && contractSvcId) {
              await requestContractService({
                action: "update",
                id: contractSvcId,
                data: {
                  projectId,
                  projectServiceId: createdProjectServiceId,
                  projectServices: createdProjectServiceId,
                },
              });
            }
          } catch (e) {
            console.warn("Could not create projectService:", e);
          }
        }
        // The contract's totals: its lines just changed, so the database
        // recomputes them (money_line_after -> trg_money_contract_header); a
        // retainer keeps its own fee.
      }

      // Sync the Case's own totalAmount from all money-bearing service rows,
      // regardless of pricing mode. Package mode has a single authoritative
      // number already entered by the user (form.packageTotalAmount, in the
      // Case's own currency — no per-row conversion needed); Line mode has to
      // be summed from `rows` (which can carry mixed per-row currencies) and
      // converted into the Case's own currency.
      setSubmitStep(tr("Updating case total..."));
      try {
        let caseTotalAmount = null;
        if (activePackageMode) {
          caseTotalAmount = Number(form.packageTotalAmount) || 0;
        } else {
          const casePreliminarySummary = buildServiceFinancialSummary({
            rows,
            currencies,
            baseCurrency: selectedCurrency,
            pricingDate: form.date,
            sourceRateDate: submitSourceRateDate,
            packageMode: activePackageMode,
            activeFinancialSourceType,
          });
          const caseRateCurrencyIds = getConversionSourceCurrencyIds(
            casePreliminarySummary.groups,
            selectedCurrency,
          );
          const caseExchangeRates = caseRateCurrencyIds.length
            ? await fetchExchangeRatesForConversion(caseRateCurrencyIds, extractCurrencyId(selectedCurrency))
            : [];
          const caseFinancialSummary = buildServiceFinancialSummary({
            rows,
            currencies,
            baseCurrency: selectedCurrency,
            exchangeRates: caseExchangeRates,
            pricingDate: form.date,
            sourceRateDate: submitSourceRateDate,
            packageMode: activePackageMode,
            activeFinancialSourceType,
          });
          if (caseFinancialSummary.converted.canConvert) {
            caseTotalAmount = caseFinancialSummary.converted.totalAmount;
          } else {
            console.warn(
              "[CaseCreateForm] Could not sync case totalAmount — missing exchange rate:",
              formatMissingRatePairs(caseFinancialSummary.missing, selectedCurrency),
            );
          }
        }
        if (caseTotalAmount !== null) {
          await ctx.api.request({
            url: "projects:update",
            method: "POST",
            params: { filterByTk: projectId },
            data: { totalAmount: caseTotalAmount },
          });
        }
      } catch (caseTotalError) {
        console.warn("[CaseCreateForm] Could not sync case totalAmount:", caseTotalError);
      }

      const getNumericId = (value) => {
        if (!value) return null;
        if (typeof value === "object") {
          return getNumericId(value.id || value.value || value.key);
        }
        const parsed = parseInt(value);
        return Number.isFinite(parsed) ? parsed : null;
      };

      const assignDefaultFolderPermissions = async (folderIds = []) => {
        const safeFolderIds = Array.from(
          new Set(folderIds.map(getNumericId).filter(Boolean)),
        );
        if (!safeFolderIds.length) return;

        // managerId is already a lawyers.id (direct select), no more
        // user->lawyer lookup needed here.
        const managerLawyerId = getNumericId(form.managerId);
        const memberLawyerIds = Array.from(
          new Set((form.lawyerIds || []).map(getNumericId).filter(Boolean)),
        ).filter((lawyerId) => lawyerId !== managerLawyerId);

        if (!managerLawyerId && !memberLawyerIds.length) return;

        const permissionPromises = [];
        safeFolderIds.forEach((folderId) => {
          if (managerLawyerId) {
            permissionPromises.push(
              ctx.api
                .request({
                  url: "folderManagers:create",
                  method: "POST",
                  data: { folderId, lawyerId: managerLawyerId, role: "manager" },
                })
                .catch((error) => {
                  console.warn("Could not create folder manager:", error);
                }),
            );
          }

          memberLawyerIds.forEach((lawyerId) => {
            permissionPromises.push(
              ctx.api
                .request({
                  url: "folderMembers:create",
                  method: "POST",
                  data: { folderId, lawyerId, role: "viewer" },
                })
                .catch((error) => {
                  console.warn("Could not create folder member:", error);
                }),
            );
          });
        });

        await Promise.all(permissionPromises);
      };

      // 4. Auto-create folder hierarchy
      setSubmitStep(tr("Creating folder structure..."));
      try {
        let customerRootFolderId = null;
        if (form.customerId) {
          try {
            // 1. Tìm folder gốc của khách hàng (có customerId, KHÔNG có
            // projectId, nằm dưới category root "Customers" — phải khớp
            // đúng parentId đã gán lúc tạo mới bên dưới, nếu không mỗi lần
            // tạo Case mới cho cùng khách hàng sẽ không tìm lại được folder
            // cũ và tạo thêm 1 bản trùng lặp mới.
            const cRes = await ctx.api.request({
              url: "folders:list",
              params: {
                filter: JSON.stringify({
                  customerId: parseInt(form.customerId),
                  projectId: null,
                  parentId: CUSTOMERS_ROOT_FOLDER_ID,
                }),
                sort: ["createdAt"], // Lấy folder tạo đầu tiên
                pageSize: 1,
              },
            });

            let customerRoot = cRes?.data?.data?.[0];
            const customerName =
              customers.find((c) => String(c.id) === String(form.customerId))
                ?.customerName || "Customer";

            // 1b. A root folder with the customer's name may exist elsewhere
            // (e.g. created in CustomerDocument without the category parent).
            // Reuse it: the DB guard (pgsql/document_naming_guards.sql) no
            // longer lets a customer have two root folders with one name.
            if (!customerRoot) {
              const byNameRes = await ctx.api.request({
                url: "folders:list",
                params: {
                  filter: JSON.stringify({
                    customerId: parseInt(form.customerId),
                    projectId: null,
                    name: customerName,
                  }),
                  sort: ["createdAt"],
                  pageSize: 1,
                },
              });
              customerRoot = (byNameRes?.data?.data || []).find((folder) => !folder?.isDeleted) || null;
            }

            // 2. Nếu chưa có folder khách hàng, tạo mới ngay
            if (!customerRoot) {
              const newCFol = await ctx.api.request({
                url: "folders:create",
                method: "POST",
                data: {
                  name: customerName,
                  type: "customer",
                  moduleScope: CASE_DOCUMENT_SCOPE,
                  customerId: parseInt(form.customerId),
                  internalCompanyId: form.internalCompanyId
                    ? parseInt(form.internalCompanyId)
                    : null,
                  // Nests under the hidden "Customers" category root folder
                  // (id from Library.js's LIBRARY_CATEGORY_ROOT_FOLDER_ID —
                  // duplicated here per this repo's no-shared-module
                  // constraint) so the physical folder tree stays organized
                  // for external tools (e.g. Google Drive backup sync)
                  // without changing how the Customer->Case gallery itself
                  // resolves a customer's root folder (still by
                  // customerId + no projectId, not by parentId).
                  parentId: CUSTOMERS_ROOT_FOLDER_ID,
                  createdById: currentUser?.id || null,
                },
              });
              const rawCFol = newCFol?.data?.data || newCFol?.data;
              customerRoot = rawCFol;
            }

            if (customerRoot) {
              customerRootFolderId = customerRoot.id
                ? parseInt(customerRoot.id)
                : null;
            }
          } catch (e) {
            console.warn("Could not handle customer folder:", e);
          }
        }

        const parentFolderName = generatedCaseCode
          ? `${generatedCaseCode} - ${form.projectName.trim()}`
          : form.projectName.trim();

        const pFolderRes = await ctx.api.request({
          url: "folders:create",
          method: "POST",
          data: {
            name: parentFolderName,
            type: "cases",
            parentId: customerRootFolderId
              ? parseInt(customerRootFolderId)
              : null,
            projectId: projectId ? parseInt(projectId) : null,
            customerId: form.customerId ? parseInt(form.customerId) : null,
            internalCompanyId: form.internalCompanyId
              ? parseInt(form.internalCompanyId)
              : null,
            moduleScope: CASE_DOCUMENT_SCOPE,
            createdById: currentUser?.id ? parseInt(currentUser.id) : null,
            updatedById: currentUser?.id ? parseInt(currentUser.id) : null,
          },
        });
        const rawPFolderId = pFolderRes?.data?.data?.id || pFolderRes?.data?.id;
        const pFolderId = rawPFolderId ? parseInt(rawPFolderId) : null;

        if (pFolderId) {
          // ── Chuẩn bị danh sách các folder con ──

          // 1. Các folder mặc định
          // 1. Thư mục mặc định luôn phải có
          // 🌟 folderTemplateKey: định danh ổn định cho từng folder mẫu,
          // dùng để lọc/tìm lại đúng folder (vd "legal_study") mà không phụ
          // thuộc vào tên hiển thị (name có thể bị user đổi sau này).
          const defaultChildren = [
            { name: "Legal Study", key: "legal_study" },
            { name: "LSC & Related", key: "lsc_related" },
            { name: "Legal docs", key: "legal_docs" },
            { name: "Legal dossiers", key: "legal_dossiers" },
            { name: "Report and Result", key: "report_result" },
            // Aggregates all per-service folders below (2026-09-04
            // service-folder-under-Obsolete change) — a case root sibling
            // of "Legal dossiers", not nested inside it. Only new cases get
            // this; cases created before this change keep their service
            // folders under "Legal dossiers" as-is (no backfill).
            { name: "Obsolete", key: "obsolete" },
          ];

          // 2. One folder per service added to this case — gives task
          // uploads (TaskDetailView.js) a single dedicated place to land
          // instead of scattering into the case root. Deduped by key
          // (Map, first entry wins) since 2 rows could in theory resolve
          // to the same catalog serviceId. Not tagged via
          // folderTemplateKey — the real link back to its service is
          // caseServices.folderId (see the 2026-08-21 service-folder
          // discussion), stamped below once each folder's id is known.
          const uniqueServiceCandidates = Array.from(
            new Map(
              createdServiceFolderCandidates.map((c) => [c.key, c]),
            ).values(),
          );
          const serviceChildren = uniqueServiceCandidates.map((c) => ({
            name: c.serviceName,
            projectServiceId: c.projectServiceId,
            // Shared (non-unique) folderTemplateKey — CaseDocument.js/
            // Library.js key their delete-lock check off this value (see the
            // 2026-09-04 system-folder delete-protection change) so these
            // folders can't be deleted, without needing a separate
            // projectServices:list fetch just to find them. Deliberately
            // NOT added to SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS in those files
            // — unlike the 5 fixed template folders, a service folder's
            // name may still legitimately need editing.
            key: "case_service",
          }));

          const buildFolderData = (child, parentId) => ({
            name: child.name,
            type: "cases",
            ...(child.key ? { folderTemplateKey: child.key } : {}),
            parentId: parentId ? parseInt(parentId) : null,
            projectId: projectId ? parseInt(projectId) : null,
            customerId: form.customerId ? parseInt(form.customerId) : null,
            internalCompanyId: form.internalCompanyId
              ? parseInt(form.internalCompanyId)
              : null,
            moduleScope: CASE_DOCUMENT_SCOPE,
            createdById: currentUser?.id ? parseInt(currentUser.id) : null,
            updatedById: currentUser?.id ? parseInt(currentUser.id) : null,
          });

          // Default folders first (siblings, directly under the case root) —
          // service folders below need "Legal dossiers"'s own id as their
          // parent, so it must exist before they're created.
          const defaultResults = await Promise.all(
            defaultChildren.map((child) =>
              ctx.api.request({
                url: "folders:create",
                method: "POST",
                data: buildFolderData(child, pFolderId),
              }),
            ),
          );
          const defaultFolderIds = defaultResults
            .map((result) => result?.data?.data?.id || result?.data?.id)
            .map(getNumericId);
          const obsoleteIndex = defaultChildren.findIndex(
            (child) => child.key === "obsolete",
          );
          const obsoleteFolderId =
            obsoleteIndex >= 0 ? defaultFolderIds[obsoleteIndex] : null;

          // Per-service folders nest under "Obsolete" instead of sitting as
          // case-root siblings, so all per-service documentation stays
          // grouped under one place to manage. Falls back to the case root
          // if "Obsolete" somehow failed to create.
          const serviceResults = await Promise.all(
            serviceChildren.map((child) =>
              ctx.api.request({
                url: "folders:create",
                method: "POST",
                data: buildFolderData(
                  child,
                  obsoleteFolderId || pFolderId,
                ),
              }),
            ),
          );
          const serviceFolderIds = serviceResults
            .map((result) => result?.data?.data?.id || result?.data?.id)
            .map(getNumericId);

          const childFolderIds = [...defaultFolderIds, ...serviceFolderIds]
            .filter(Boolean);

          // Stamp caseServices.folderId back onto each service's own row —
          // serviceResults/serviceChildren share the same index/order since
          // both came from a single Promise.all over serviceChildren.
          if (serviceChildren.length) {
            await Promise.all(
              serviceChildren.map((child, idx) => {
                if (!child.projectServiceId) return null;
                const folderId = serviceFolderIds[idx];
                if (!folderId) return null;
                return ctx.api
                  .request({
                    url: "projectServices:update",
                    method: "POST",
                    params: { filterByTk: child.projectServiceId },
                    data: { folderId },
                  })
                  .catch((e) =>
                    console.warn(
                      "Could not link service folder to projectService:",
                      e,
                    ),
                  );
              }),
            );
          }

          setSubmitStep(tr("Assigning folder permissions..."));
          await assignDefaultFolderPermissions([pFolderId, ...childFolderIds]);
        }
      } catch (err) {
        console.warn("Could not create folder structure:", err);
      }

      setSubmitStep(tr("Linking installment trigger tasks..."));
      await linkInstallmentTemplateTasks();

      message.success(tr("Case created successfully!"));
      isDirtyRef.current = false;

      // The user already opted in per-row (the "Also save to the shared
      // catalog" checkbox in the Create New Service form, checked at the
      // moment they typed the name) — nothing to ask here, just carry out
      // what they already chose, now that the case is confirmed created.
      // Deferred to this point (rather than writing immediately when the
      // checkbox was checked) so deleting the row or abandoning the case
      // before submit never leaves a "phantom" catalog entry behind.
      const rowsToSaveToCatalog = rows.filter(
        (r) => !r.serviceId && r.serviceName?.trim() && r._saveToCatalog,
      );
      // Tracks row._id -> the services.id created for it below, so the
      // combo-catalog-save pass further down can resolve a real serviceId
      // for a custom combo item too, not just already-catalog ones.
      const newServiceIdByRowId = new Map();
      if (rowsToSaveToCatalog.length > 0) {
        setSubmitStep(tr("Saving to catalog..."));
        let savedCount = 0;
        for (const r of rowsToSaveToCatalog) {
          // Defensive re-check — svcOpts could only have gone stale within
          // this same form session, but skipping a would-be duplicate here
          // costs nothing and matches the "never create a duplicate catalog
          // entry" rule the Select-tab list already enforces.
          if (svcOpts.some((s) => serviceNameKey(s.serviceName) === serviceNameKey(r.serviceName))) continue;
          try {
            const svcRes = await ctx.api.request({
              url: "services:create",
              method: "POST",
              data: {
                serviceName: r.serviceName,
                serviceType: r.serviceType || null,
                description: r.description || null,
                basePrice: r.basePrice || 0,
                currencyId: r.currencyId || null,
              },
            });
            const newServiceId = svcRes?.data?.data?.id;
            if (newServiceId) {
              savedCount++;
              newServiceIdByRowId.set(r._id, newServiceId);
              // BR-DATA-02: every service picker in this codebase (this
              // form's own included) reads companyServices, not services
              // directly — skipping this link would leave the new service
              // invisible everywhere until someone adds it by hand.
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
                    price: r.basePrice || 0,
                    vat: r.vat || 0,
                    currencyId: r.currencyId || null,
                  },
                });
              } catch (linkErr) {
                console.warn("Could not link new service to company catalog:", linkErr);
              }
              // Carry this row's own sample tasks over as projectTemplates,
              // so future cases that pick this now-standardized service get
              // the same starting task list (mirrors what
              // AutoCreateTaskFromTemplate.sql's trigger later clones from).
              const carriedTasks = normalizeCustomTaskTemplates(r._customTaskTemplates);
              if (carriedTasks.length) {
                await Promise.all(
                  carriedTasks.map((t, index) =>
                    ctx.api.request({
                      url: "projectTemplates:create",
                      method: "POST",
                      data: {
                        templateName: t.title,
                        description: t.description || null,
                        sortOrder: index,
                        serviceId: newServiceId,
                      },
                    }).catch((taskErr) =>
                      console.warn("Could not create task template for new catalog service:", taskErr),
                    ),
                  ),
                );
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

      // Same deferred-write idea, one level up: for each ad-hoc combo whose
      // "Also save this combo to the shared catalog" was checked, create
      // serviceCombos + one serviceComboItems row per member service that
      // now has a real serviceId (either it was catalog-picked to begin
      // with, or it's a custom item saved via newServiceIdByRowId above —
      // every custom item auto-saves when the combo checkbox is checked).
      // An item still ends up without a serviceId only if its name already
      // matched an existing catalog entry (skipped to avoid a duplicate,
      // see the dedup check above) or its own services:create call failed —
      // that item alone is left out of the combo definition (warned about
      // below), not the whole combo skipped.
      if (pendingComboCatalogSaves.length > 0) {
        for (const comboEntry of pendingComboCatalogSaves) {
          const comboRows = rows.filter((r) => r._comboInstanceId === comboEntry.instanceId);
          const resolved = comboRows
            .map((r) => ({
              serviceId: r.serviceId ? parseInt(r.serviceId) : newServiceIdByRowId.get(r._id) || null,
              serviceName: r.serviceName,
           serviceType: r.serviceType,
               price: parseNum(r._comboItemSnapshot?.price ?? r.basePrice),
               vat: parseNum(r._comboItemSnapshot?.vat ?? r.vat),
               currencyId: getRecordCurrencyId(r._comboItemSnapshot),
             }))
            .filter((it) => it.serviceId);
          const skippedCount = comboRows.length - resolved.length;
          if (!resolved.length) {
            console.warn(`Skipped saving combo "${comboEntry.comboName}" to the catalog — no service in it has a real catalog link.`);
            message.warning(
              tr("Combo \"{0}\" was not saved to the catalog — its services could not be linked (a name may already be in use, or saving one of them failed).", { 0: comboEntry.comboName }),
            );
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
                    data: {
                      comboId: newComboId,
                      serviceId: it.serviceId,
                      serviceName: it.serviceName,
                      serviceType: it.serviceType || null,
                      quantity: it.quantity,
                      price: it.price,
                      vat: it.vat,
                      currencyId: it.currencyId || comboEntry.currencyId || null,
                    },
                  }).catch((itemErr) =>
                    console.warn("Could not add service to new catalog combo:", itemErr),
                  ),
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

      setSubmitStep("");
      setSubmittingState(false);
      await closePopupAfterSubmit();
      return;
    } catch (e) {
      console.error("Submit error:", e);
      message.error(tr("Error: ") + (e?.message || tr("Please try again")));
    }

    setSubmittingState(false);
    setSubmitStep("");
  };

  const filteredSvcOpts = useMemo(
    () =>
      form.internalCompanyId
        ? svcOpts.filter(
          (s) =>
            isSameInternalCompany(s, form.internalCompanyId),
        )
        : [],
    [svcOpts, form.internalCompanyId],
  );

  const handleInternalCompanyChange = useCallback((value) => {
    const nextInternalCompanyId = value || null;
    const currentInternalCompanyId = form.internalCompanyId || null;
    if (String(nextInternalCompanyId || "") === String(currentInternalCompanyId || "")) return;
    markDirty();
    initialRowsRef.current = [];
    setRows([]);
    setForm((p) => ({
      ...p,
      internalCompanyId: nextInternalCompanyId,
      contractId: null,
      quotationId: null,
      ...financialStateFromRecord(null, SOURCE_NONE),
    }));
  }, [form.internalCompanyId, markDirty]);

  // Preview/auto-fill caseCode as "C" + STT(3) + MM + YYYY for companies whose
  // shortName is CBI or VLIC. STT is counted independently per company so the
  // two companies never collide on the same code. Never overwrites a caseCode
  // the user has already typed by hand.
  useEffect(() => {
    const requestId = ++caseCodeRequestRef.current;
    const selectedCompany = internalCompanies.find(
      (c) => String(c.id) === String(form.internalCompanyId || ""),
    );
    const shortName = selectedCompany?.shortName || "";
    const eligible =
      !!form.internalCompanyId &&
      !!CASE_CODE_PREFIX_BY_SHORT_NAME[String(shortName).trim().toUpperCase()];

    if (!eligible) {
      setCaseCodePreview(null);
      if (lastAutoCaseCodeRef.current && form.caseCode === lastAutoCaseCodeRef.current) {
        lastAutoCaseCodeRef.current = "";
        setF("caseCode", "");
      }
      return;
    }

    generateCaseCode({
      internalCompanyId: form.internalCompanyId,
      shortName,
      dateValue: form.date,
    }).then((code) => {
      if (requestId !== caseCodeRequestRef.current || !code) return;
      setCaseCodePreview({ shortName: shortName.trim().toUpperCase(), code });
      if (!form.caseCode || form.caseCode === lastAutoCaseCodeRef.current) {
        lastAutoCaseCodeRef.current = code;
        setF("caseCode", code);
      }
    });
  }, [form.internalCompanyId, form.date, internalCompanies]);

  if (loading)
    return React.createElement(
      "div",
      { style: { textAlign: "center", padding: 80 } },
      React.createElement(Spin, { size: "large" }),
    );

  const selStyle = { ...inp(), cursor: "pointer" };
  const CUSTOMER_SOURCE_LABELS = {
    googleAds: "Google Ads",
    facebookAds: "Facebook Ads",
    zalo: "Zalo",
    referral: tr("Referral"),
    website: "Website",
    hotline: "Hotline",
    partner: tr("Partner"),
    lawyer: tr("Lawyer"),
    staff: tr("Staff"),
  };
  const formatCustomerSource = (source) => {
    const raw = String(source || "").trim();
    if (!raw) return tr("Not set");
    return CUSTOMER_SOURCE_LABELS[raw] ||
      raw
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (ch) => ch.toUpperCase());
  };
  const getCustomerSourceSub = (c) => tr("Source: {0}", { 0: formatCustomerSource(c?.source) });
  const getCustomerName = (c) =>
    c.customerName || c.name || c.fullName || tr("Customer #{0}", { 0: c.id });
  const getCustomerSub = (c) =>
    [c.phone || c.phoneNumber, c.email].filter(Boolean).join(" · ");
  const getLawyerName = (l) =>
    l.user?.nickname ||
    l.lawyerName ||
    l.name ||
    [l.firstName, l.lastName].filter(Boolean).join(" ") ||
    l.user?.username ||
    l.user?.email ||
    `#${l.id}`;
  const getContractLabel = (c) =>
    c.contractName || c.name || c.contractNumber || tr("Contract #{0}", { 0: c.id });
  const getCustomerNameFromDoc = (doc) => {
    const cust =
      doc.customer ||
      customers.find((c) => String(c.id) === String(doc.customerId)) ||
      {};
    const type = doc.customerType || cust.customerType;
    if (type === "company") {
      return (
        doc.companyName ||
        cust.companyName ||
        doc.customerName ||
        cust.customerName ||
        cust.name ||
        ""
      );
    }
    return (
      cust.fullName || cust.name || doc.customerName || cust.customerName || ""
    );
  };

  const getContractSub = (c) => getCustomerNameFromDoc(c);

  const getQuotationLabel = (q) =>
    q.quotationName || q.quotationNumber || tr("Quotation #{0}", { 0: q.id });

  const getQuotationSub = (q) => {
    const n = getCustomerNameFromDoc(q);
    const t = q.totalAmount
      ? formatMoney(q.totalAmount, currencyFromRecord(q, currencies, selectedCurrency))
      : "";
    const mode = isPackagePricing(q) ? tr("Combo pricing") : tr("Line pricing");
    return [mode, n, t].filter(Boolean).join(" · ");
  };

  const customerContracts = contracts.filter(
    (c) =>
      (!form.internalCompanyId || isSameInternalCompany(c, form.internalCompanyId)) &&
      (!form.customerId ||
        String(c.customerId) === String(form.customerId) ||
        String(c.customer?.id) === String(form.customerId)),
  );

  const usedQuotationIds = new Set(
    projects.filter((p) => p.quotationId).map((p) => String(p.quotationId)),
  );

  const customerQuotations = quotations.filter(
    (q) =>
      (!form.internalCompanyId || isSameInternalCompany(q, form.internalCompanyId)) &&
      (!form.customerId ||
        String(q.customerId) === String(form.customerId) ||
        String(q.customer?.id) === String(form.customerId)) &&
      !usedQuotationIds.has(String(q.id)),
  );

  const renderRelatedToSection = () =>
    React.createElement(
      "section",
      {
        style: {
          marginBottom: 16,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            position: "relative",
            opacity: form.internalCompanyId ? 1 : 0.55,
            pointerEvents: form.internalCompanyId ? "auto" : "none",
          },
        },
        React.createElement(
          Field,
          {
            label: tr("Customer"),
            required: true,
            hint: currentCustomer ? getCustomerSourceSub(currentCustomer) : undefined,
            mb: 16,
          },
          React.createElement(PersonDropdown, {
            items: customers,
            value: form.customerId,
            onChange: handleCustomerChange,
            placeholder: !form.internalCompanyId
              ? tr("Please select an Internal Company first")
              : tr("Search or select a customer"),
            getItemName: getCustomerName,
            getItemSub: (customer) =>
              [getCustomerSourceSub(customer), getCustomerSub(customer)].filter(Boolean).join(" - "),
            currentItem: currentCustomer,
            disabled: !form.internalCompanyId,
            onAddNew: () =>
              openCreatePopup(
                "customerCreate",
                refreshCustomers,
                { internalCompanyId: form.internalCompanyId },
                {
                  beforeIds: customers.map((c) => c.id),
                  onCreated: (id, record) => {
                    if (record) setCustomers((prev) => mergeRecordById(prev, record));
                    handleCustomerChange(id, record);
                  },
                },
              ),
          }),
        ),
        form.customerId &&
        React.createElement(
          "div",
          {
            style: {
              padding: "0 0 12px",
              background: "transparent",
              border: "none",
              borderRadius: 0,
              marginBottom: 16,
              fontSize: 13,
              color: C.textSub,
              display: "flex",
              alignItems: "center",
              gap: 7,
            },
          },
          React.createElement(
            "span",
            null,
            tr("Showing {0} contracts and {1} quotations for this customer. ", { 0: customerContracts.length, 1: customerQuotations.length }),
            React.createElement(
              "span",
              {
                onClick: () => {
                  setForm((p) => ({
                    ...p,
                    contractId: null,
                    quotationId: null,
                    ...financialStateFromRecord(null, SOURCE_NONE),
                  }));
                  setRows([]);
                },
                style: {
                  color: C.danger,
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontWeight: 500,
                },
              },
              tr("Clear selection"),
            ),
          ),
        ),
        React.createElement(
          Grid,
          { cols: 2, gap: 16, mb: 0 },
          React.createElement(
            Field,
            { label: tr("Related Contract") },
            React.createElement(RelatedSingleDropdown, {
              items: customerContracts,
              value: form.contractId,
              onChange: handleContractChange,
              placeholder: !form.internalCompanyId ? "" : tr("Select contract"),
              getItemLabel: getContractLabel,
              getItemSub: getContractSub,
              disabled: !form.internalCompanyId,
              onAddNew: () =>
                openCreatePopup(
                  "contractCreate",
                  refreshContracts,
                  {
                    customerId: form.customerId,
                    internalCompanyId: form.internalCompanyId,
                    lawyerId: form.lawyerIds?.[0] || form.managerId,
                    quotationId: form.quotationId,
                    projectId: ctx?.record?.id || ctx?.popup?.record?.id || form.id,
                    caseId: ctx?.record?.id || ctx?.popup?.record?.id || form.id,
                  },
                  {
                    beforeIds: contracts.map((c) => c.id),
                    onCreated: (id, record) => {
                      if (record) setContracts((prev) => mergeRecordById(prev, record));
                      handleContractChange(id, record);
                    },
                  },
                ),
            }),
          ),
          React.createElement(
            Field,
            {
              label: tr("Related Quotation"),
              hint: !form.internalCompanyId
                ? tr("please select internal company")
                : form.quotationId
                  ? tr("↓ changing will reload services")
                  : tr("select to load services into table"),
            },
            React.createElement(RelatedSingleDropdown, {
              items: customerQuotations,
              value: form.quotationId,
              onChange: handleQuotationChange,
              placeholder: !form.internalCompanyId ? "" : tr("Select quotation"),
              getItemLabel: getQuotationLabel,
              getItemSub: getQuotationSub,
              disabled: !form.internalCompanyId,
              onAddNew: () =>
                openCreatePopup(
                  "quotationCreate",
                  refreshQuotations,
                  {
                    customerId: form.customerId,
                    internalCompanyId: form.internalCompanyId,
                    lawyerId: form.lawyerIds?.[0] || form.managerId,
                    projectId: ctx?.record?.id || ctx?.popup?.record?.id || form.id,
                    caseId: ctx?.record?.id || ctx?.popup?.record?.id || form.id,
                  },
                  {
                    beforeIds: quotations.map((q) => q.id),
                    onCreated: (id, record) => {
                      if (record) setQuotations((prev) => mergeRecordById(prev, record));
                      handleQuotationChange(id, record);
                    },
                  },
                ),
            }),
          ),
        ),
      ),
    );

  return React.createElement(
    "div",
    {
      style: {
        fontFamily: FONT,
        width: "100%",
        padding: "16px 0",
      },
      onChange: markDirty,
      onInput: markDirty,
    },

    React.createElement(
      Card,
      null,
      React.createElement(CardHeader, { title: tr("Case Information") }),
      React.createElement(
        "div",
        { style: { padding: "18px 20px" } },

        React.createElement(
          Field,
          { label: tr("Internal Company"), required: true, mb: 16 },
          Select
            ? React.createElement(Select, {
              showSearch: true,
              allowClear: true,
              value: form.internalCompanyId ? String(form.internalCompanyId) : undefined,
              placeholder: tr("Select company"),
              optionFilterProp: "label",
              style: { width: "100%" },
              onChange: handleInternalCompanyChange,
              options: internalCompanies.map((c) => ({
                value: String(c.id),
                label: c.companyName || c.name || tr("Company #{0}", { 0: c.id }),
              })),
            })
            : React.createElement(
              "select",
              {
                value: form.internalCompanyId || "",
                onChange: (e) => {
                  handleInternalCompanyChange(e.target.value || null);
                },
                style: selStyle,
              },
              React.createElement("option", { value: "" }, tr("Select company")),
              ...internalCompanies.map((c) =>
                React.createElement(
                  "option",
                  { key: c.id, value: c.id },
                  c.companyName || c.name || tr("Company #{0}", { 0: c.id }),
                ),
              ),
            ),
        ),

        renderRelatedToSection(),

        React.createElement(
          Grid,
          { cols: 2, gap: 16, mb: 16 },
          React.createElement(
            Field,
            {
              label: tr("Case Code"),
              hint: caseCodePreview
                ? tr("Auto ({0}): next is {1} — editable", { 0: caseCodePreview.shortName, 1: caseCodePreview.code })
                : "optional",
            },
            Input
              ? React.createElement(Input, {
                value: form.caseCode,
                onChange: (e) => setF("caseCode", e.target.value),
                placeholder: tr("E.g. CBI-2025-001"),
              })
              : React.createElement("input", {
                value: form.caseCode,
                onChange: (e) => setF("caseCode", e.target.value),
                placeholder: tr("E.g. CBI-2025-001"),
                style: inp(),
                onFocus,
                onBlur,
              }),
          ),
          React.createElement(
            Field,
            { label: tr("Case Name"), required: true },
            Input
              ? React.createElement(Input, {
                value: form.projectName,
                onChange: (e) => setF("projectName", e.target.value),
                placeholder: tr("E.g. Real estate purchase contract consultation..."),
              })
              : React.createElement("input", {
                value: form.projectName,
                onChange: (e) => setF("projectName", e.target.value),
                placeholder: tr("E.g. Real estate purchase contract consultation..."),
                style: { ...inp(), fontSize: 14, fontWeight: 500 },
                onFocus,
                onBlur,
              }),
          ),
        ),

        React.createElement(
          Grid,
          { cols: 3, gap: 16, mb: 16 },
          React.createElement(
            Field,
            { label: tr("Open Date & Time"), required: true },
            React.createElement(DateTimePicker, {
              value: form.date,
              onChange: (v) => setF("date", v),
              placeholder: tr("Select open date & time"),
            }),
          ),
          React.createElement(
            Field,
            { label: tr("Deadline"), hint: "optional" },
            React.createElement(DateTimePicker, {
              value: form.deadline,
              onChange: (v) => setF("deadline", v),
              placeholder: tr("Select deadline date & time"),
              minValue: form.date || undefined,
            }),
          ),
          React.createElement(
            Field,
            { label: tr("Priority"), required: true },
            React.createElement(StarRating, {
              value: form.priority,
              onChange: (v) => setF("priority", v),
            }),
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              fontSize: 11.5,
              fontWeight: 700,
              color: C.textSub,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0,
              fontFamily: FONT,
            },
          },
          tr("Team Members"),
        ),
        React.createElement(
          Grid,
          { cols: 2, gap: 16, mb: 16 },
          React.createElement(
            Field,
            { label: tr("Manager"), hint: "optional" },
            Select
              ? React.createElement(Select, {
                showSearch: true,
                allowClear: true,
                value: form.managerId ? String(form.managerId) : undefined,
                placeholder: tr("Select manager"),
                optionFilterProp: "label",
                style: { width: "100%" },
                onChange: (value) => setF("managerId", value || null),
                options: lawyers.map((lawyer) => ({
                  value: String(lawyer.id),
                  label: getLawyerName(lawyer),
                })),
              })
              : React.createElement(PersonDropdown, {
                items: lawyers,
                value: form.managerId,
                onChange: (v) => setF("managerId", v),
                placeholder: tr("— Select manager —"),
                getItemName: getLawyerName,
              }),
          ),
          React.createElement(
            Field,
            { label: tr("Members"), hint: tr("optional — multiple") },
            Select
              ? React.createElement(Select, {
                mode: "multiple",
                showSearch: true,
                allowClear: true,
                value: (form.lawyerIds || []).map((id) => String(id)),
                placeholder: tr("Select lawyers"),
                optionFilterProp: "label",
                style: { width: "100%" },
                onChange: (value) => setF("lawyerIds", value || []),
                options: membersLawyers.map((lawyer) => ({
                  value: String(lawyer.id),
                  label: getLawyerName(lawyer),
                })),
              })
              : React.createElement(MultiPersonDropdown, {
                items: membersLawyers,
                value: form.lawyerIds,
                onChange: (v) => setF("lawyerIds", v),
                placeholder: tr("— Select lawyers —"),
                getItemName: getLawyerName,
              }),
          ),
        ),

        React.createElement(
          Field,
          { label: tr("Description"), hint: "optional", mb: 0 },
          React.createElement(AutoTextarea, {
            value: form.description,
            onChange: (v) => setF("description", v),
            placeholder:
              tr("Summarize the content, requirements, scope of work..."),
            minRows: 3,
          }),
        ),
      ),
    ),

    // Loading overlay for services
    React.createElement(
      Card,
      null,
      loadingServices &&
      React.createElement(
        "div",
        {
          style: {
            padding: "12px 16px",
            background: C.bgSection,
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            color: C.textSub,
            fontFamily: FONT,
          },
        },
        React.createElement(Spin, { size: "small" }),
        React.createElement(
          "span",
          null,
          tr("Loading services..."),
        ),
      ),
      React.createElement(ProjectServicesTable, {
        rows,
        svcOpts: filteredSvcOpts,
        internalCompanyId: form.internalCompanyId,
        quotationId: form.quotationId,
        pricingMode: form.pricingMode,
        financialSourceType: form.financialSourceType,
        currency: selectedCurrency,
        currencies,
        pricingDate: form.date,
        sourceRateDate,
        packageSummary: {
          subTotal: form.packageSubTotal,
          vatRate: form.packageVatRate,
          vatAmount: form.packageVatAmount,
          totalAmount: form.packageTotalAmount,
        },
        onUpdate: updateRow,
        onDelete: deleteRow,
        onAddFromService: addRowFromService,
        onPricingModeChange: handleServicePricingModeChange,
        onPackageChange: handlePackageSummaryChange,
        onCurrencyChange: (value) => setF("currencyId", value || null),
        taskTemplates,
        setTaskTemplates,
        combos,
        onApplyCombo: applyCombo,
        onApplyAdhocCombo: applyAdhocCombo,
        appliedCombos,
        onRemoveCombo: removeAppliedCombo,
        onUpdateComboAmount: updateComboAmount,
        onAddServiceToCombo,
      }),
    ),

    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 12,
          marginTop: 8,
          paddingBottom: 36,
        },
      },
      submitting &&
      React.createElement(
        "span",
        { style: { fontSize: 12, color: C.textSub, fontFamily: FONT } },
        submitStep,
      ),
      Space
        ? React.createElement(
          Space,
          null,
          React.createElement(Button, { onClick: requestClose }, tr("Cancel")),
          React.createElement(
            Button,
            {
              type: "primary",
              loading: submitting,
              onClick: submitting ? undefined : handleSubmit,
            },
            tr("Submit"),
          ),
        )
        : React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            {
              onClick: requestClose,
              style: {
                padding: "10px 24px",
                borderRadius: 7,
                border: `1px solid ${C.border}`,
                cursor: "pointer",
                fontSize: 13.5,
                fontWeight: 500,
                background: "#fff",
                fontFamily: FONT,
                color: C.text,
              },
            },
            tr("Cancel"),
          ),
          React.createElement(
            "div",
            {
              onClick: submitting ? null : handleSubmit,
              style: {
                padding: "10px 36px",
                borderRadius: 7,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                background: submitting ? "#f3f4f6" : C.primary,
                color: submitting ? "#9ca3af" : "#fff",
                transition: "all 0.15s",
                fontFamily: FONT,
              },
            },
            submitting ? tr("Processing...") : tr("Submit"),
          ),
        ),
    ),
  );
};

ctx.render(React.createElement(ProjectCreateForm, null));
