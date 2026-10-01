/**
 * NocoBase RunJS - AI maintenance manifest
 *
 * PURPOSE
 * - Create a main or supplementary quotation.
 * - Prefill from the active record, popup/view input arguments, project,
 *   project service, parent quotation, lead, customer, or contract context.
 * - Keep quotation, project service, contract service, contract totals, and
 *   project totals synchronized after a successful create.
 *
 * RUNTIME CONTRACT USED BY THIS FILE
 * - UI: ctx.React, ctx.antd, ctx.render(...)
 * - Data: ctx.api.request(...)
 * - Context: ctx.record, ctx.params, ctx.action, ctx.modal, ctx.view, ctx.popup
 * - Navigation: ctx.openView(...), ctx.view.close()
 * - Existing browser dependencies: window.location and window.history
 * Do not replace these APIs or introduce imports unless the target NocoBase
 * runtime has been verified with getContextEnvs/getContextVars/getContextApis.
 *
 * DATA/API MAP
 * - Read lists: internalCompany, companyServices, services, lead, customers,
 *   projects, template, lawyers, projectServices, contractServices
 * - Read records: projects, contracts, customers, projectServices, quotations
 * - Create: quotations, quotationServices
 * - Update: projectServices, contractServices, contracts, projects
 * - Authentication: auth:check
 *
 * CORE STATE CONTRACT
 * - form: quotation header, relation IDs, pricing mode, package totals,
 *   approval settings, and popup-derived relation IDs.
 * - rows: transient service lines. `_id` is UI-only; projectServiceId links an
 *   existing project service; serviceId links the service catalog.
 * - popupContext: resolved project/projectService/parentQuotation records.
 *
 * COMPONENT MAP
 * - AutoTextarea, DatePicker, PriceInput: reusable input primitives.
 * - LeadDropdown, CustomerDropdown, LawyerPicker: relation selectors.
 * - ApprovalSection: approval toggle and approver selection.
 * - ServicePickerModal: service search and ad-hoc service entry.
 * - ServicesTable: service rows, pricing mode, totals, and comparison UI.
 * - QuotationTutorialPanel: embedded user guide.
 * - QuotationCreateForm: orchestration, prefill, submit transaction, and render.
 *
 * BUSINESS INVARIANTS
 * 1. pricingMode is exactly "line" or "package".
 * 2. Line mode stores amounts on every quotation service and aggregates them.
 * 3. Package mode stores package totals on the quotation and mirrors package
 *    fields to service links while line amount fields remain zero.
 * 4. A supplementary quotation requires parentId.
 * 5. A quotation requires an issuing company, a lead or customer,
 *    and at least one valid service row.
 * 6. Existing projectServiceId links must be preserved during row edits.
 * 7. Submit order is intentional:
 *    validate -> normalize lines -> create quotation -> create service lines
 *    -> update project services -> update contract services/totals
 *    -> link the main quotation to the project -> close/redirect.
 *
 * SAFE AI EDITING PROTOCOL
 * - Read the whole current editor before patching.
 * - Use the stable <ai-section> anchors below to make targeted patches.
 * - Preserve API resource names, payload field names, relation IDs, pricing
 *   semantics, and synchronization order unless schema metadata proves a change.
 * - Avoid broad UI, i18n, encoding, or createElement-to-JSX rewrites unless the
 *   user explicitly requests that migration.
 * - For schema changes, inspect collection metadata first.
 * - After every patch, run lintAndTestJS against the current editor.
 * - This file is a single RunJS artifact; do not add static import/require.
 */

// <ai-section name="runtime-bindings-and-config">
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
  "Base currency": "Tiền tệ gốc",
  "No rate": "Chưa có tỷ giá",
  "Manual": "Thủ công",
  "Discard changes?": "Bỏ các thay đổi?",
  "Your unsaved input will be lost.": "Dữ liệu chưa lưu sẽ bị mất.",
  "Discard": "Bỏ",
  "Continue editing": "Tiếp tục chỉnh sửa",
  "Please configure POPUP_VIEW_UIDS.{0} first.": "Vui lòng cấu hình POPUP_VIEW_UIDS.{0} trước.",
  "ctx.openView is not available in this runtime.": "ctx.openView không khả dụng trong môi trường này.",
  "Cannot open configured popup view.": "Không thể mở popup đã cấu hình.",
  "Case #{0}": "Hồ sơ #{0}",
  "Case": "Hồ sơ",
  "Immediate": "Thanh toán ngay",
  "Net 15 days": "Trong 15 ngày",
  "Net 30 days": "Trong 30 ngày",
  "Net 45 days": "Trong 45 ngày",
  "End of following month": "Cuối tháng kế tiếp",
  "Balance payment": "Thanh toán phần còn lại",
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
  "Sun": "CN",
  "Mon": "T2",
  "Tue": "T3",
  "Wed": "T4",
  "Thu": "T5",
  "Fri": "T6",
  "Sat": "T7",
  "Select date": "Chọn ngày",
  "Clear selected date": "Xóa ngày đã chọn",
  "The firm entity that issues the quotation. Services and templates are filtered by it.": "Pháp nhân của công ty phát hành báo giá. Dịch vụ và mẫu được lọc theo pháp nhân này.",
  "The lead, when the quotation comes from a sales opportunity that is not a customer yet.": "Lead, khi báo giá đến từ cơ hội bán hàng chưa là khách hàng.",
  "The customer, when they already have a customer record.": "Khách hàng, khi đã có hồ sơ khách hàng.",
  "The lawyer in charge of the quotation and the services that follow.": "Luật sư phụ trách báo giá và các dịch vụ tiếp theo.",
  "Tick when someone must review the quotation before it is sent.": "Đánh dấu khi cần có người duyệt báo giá trước khi gửi.",
  "The person who reviews the quotation.": "Người duyệt báo giá.",
  "Expected payment terms, e.g. immediate, net 15, net 30.": "Điều khoản thanh toán dự kiến, VD: ngay, trong 15 ngày, trong 30 ngày.",
  "The template used to generate the quotation document.": "Mẫu dùng để tạo tài liệu báo giá.",
  "The last day the quotation is valid.": "Ngày cuối cùng báo giá còn hiệu lực.",
  "The address printed on the quotation, if the template uses one.": "Địa chỉ in trên báo giá, nếu mẫu có dùng.",
  "A short note about the quotation.": "Ghi chú ngắn về báo giá.",
  "The services offered in this quotation.": "Các dịch vụ được báo giá.",
  "A service from the internal company's catalog.": "Một dịch vụ trong danh mục của công ty nội bộ.",
  "The scope of work of each line; edit it for this quotation.": "Phạm vi công việc của từng dòng; chỉnh sửa cho báo giá này.",
  "The price of one unit, before VAT, in the line's currency.": "Giá một đơn vị, chưa VAT, theo tiền tệ của dòng.",
  "The VAT rate of the line.": "Thuế suất VAT của dòng.",
  "The amount before VAT.": "Số tiền trước VAT.",
  "The VAT of the line.": "Tiền VAT của dòng.",
  "The amount after VAT, in VND.": "Số tiền sau VAT, theo VND.",
  "Add new": "Thêm mới",
  "Selected": "Đã chọn",
  "Lead #{0}": "Lead #{0}",
  "Clear selection": "Bỏ chọn",
  "— Search or select lead —": "— Tìm hoặc chọn lead —",
  "Add new lead": "Thêm lead mới",
  "Search by name, phone, email...": "Tìm theo tên, điện thoại, email...",
  "No results found": "Không tìm thấy kết quả",
  "{0} results": "{0} kết quả",
  "{0} leads — newest first": "{0} lead — mới nhất trước",
  "Add new customer": "Thêm khách hàng mới",
  "Clear": "Bỏ chọn",
  "Customer #{0}": "Khách hàng #{0}",
  "— Search or select customer —": "— Tìm hoặc chọn khách hàng —",
  "Current": "Hiện tại",
  "{0} customers — newest first": "{0} khách hàng — mới nhất trước",
  "Lawyer #{0}": "Luật sư #{0}",
  "Partner": "Luật sư đối tác",
  "Lawyer": "Luật sư",
  "Associate": "Luật sư cộng sự",
  "Sales": "Kinh doanh",
  "Suppliant": "Trợ lý pháp lý",
  "— Select lawyer —": "— Chọn luật sư —",
  "Search by name, email...": "Tìm theo tên, email...",
  "{0} users": "{0} người dùng",
  "Require approval before sending": "Cần duyệt trước khi gửi",
  "Quotation will need approval from authorized personnel": "Báo giá cần được người có thẩm quyền duyệt",
  "Pending Approval": "Chờ duyệt",
  "Not Required": "Không yêu cầu",
  "Approver": "Người duyệt",
  "— optional": "— không bắt buộc",
  "Please enter a combo name": "Vui lòng nhập tên combo",
  "Please select a currency": "Vui lòng chọn tiền tệ",
  "Please add at least 1 service to the combo": "Vui lòng thêm ít nhất 1 dịch vụ vào combo",
  "One or more services are missing a name": "Một hoặc nhiều dịch vụ chưa có tên",
  "Duplicate service name in combo": "Trùng tên dịch vụ trong combo",
  "Please enter service name": "Vui lòng nhập tên dịch vụ",
  "Unit price must be greater than 0": "Đơn giá phải lớn hơn 0",
  "Please select currency": "Vui lòng chọn tiền tệ",
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
  "Services in combo ({0})": "Dịch vụ trong combo ({0})",
  "+ Add existing service...": "+ Thêm dịch vụ có sẵn...",
  "Service #{0}": "Dịch vụ #{0}",
  "+ New service": "+ Dịch vụ mới",
  "No services yet — add one from the list or create a new one.": "Chưa có dịch vụ — thêm từ danh sách hoặc tạo mới.",
  "Service name": "Tên dịch vụ",
  "Type": "Loại",
  "Unit Price": "Đơn giá",
  "Description": "Mô tả",
  "New service name...": "Tên dịch vụ mới...",
  "Already in the standardized catalog": "Đã có trong danh mục chuẩn",
  "Type (optional)...": "Loại (không bắt buộc)...",
  "Description (optional)...": "Mô tả (không bắt buộc)...",
  "Remove": "Gỡ",
  "Also save this combo to the shared catalog (created only if you finish creating this quotation). All custom services in it are saved too — services already in the catalog are simply reused.": "Lưu combo này vào danh mục chung (chỉ tạo khi bạn hoàn tất tạo báo giá). Các dịch vụ tự tạo trong combo cũng được lưu — dịch vụ đã có trong danh mục sẽ được dùng lại.",
  "Back": "Quay lại",
  "Applying...": "Đang áp dụng...",
  "Submit": "Gửi",
  "Select from list": "Chọn từ danh sách",
  "Create new service": "Tạo dịch vụ mới",
  "New Combo": "Combo mới",
  "Select Combo": "Chọn combo",
  "Line pricing": "Giá theo dòng",
  "Combo pricing": "Giá combo",
  "Add to combo:": "Thêm vào combo:",
  "Combo pricing keeps every service inside a combo.": "Giá combo giữ mọi dịch vụ trong một combo.",
  "Search service name...": "Tìm tên dịch vụ...",
  "Create new": "Tạo mới",
  "Service Name": "Tên dịch vụ",
  "No services found": "Không tìm thấy dịch vụ",
  "Create now": "Tạo ngay",
  "e.g., Labor contract consulting...": "VD: Tư vấn hợp đồng lao động...",
  "Service Type": "Loại dịch vụ",
  "e.g., Consulting, Legal...": "VD: Tư vấn, Pháp lý...",
  "VAT (%)": "VAT (%)",
  "Scope of work, notes...": "Phạm vi công việc, ghi chú...",
  "No currencies configured": "Chưa cấu hình tiền tệ",
  "Select currency": "Chọn tiền tệ",
  "This name already exists in the shared catalog — it will be reused, not duplicated.": "Tên này đã có trong danh mục chung — sẽ được dùng lại, không tạo trùng.",
  "Also save to the shared catalog (created only if you finish creating this quotation).": "Lưu vào danh mục chung (chỉ tạo khi bạn hoàn tất tạo báo giá).",
  "Cancel": "Hủy",
  "Save & Select": "Lưu & Chọn",
  "No description": "Không có mô tả",
  "Show less": "Thu gọn",
  "Show more": "Xem thêm",
  "— not selected —": "— chưa chọn —",
  "Compare each service in the form with the company service catalog.": "So sánh từng dịch vụ trong biểu mẫu với danh mục dịch vụ của công ty.",
  "No.": "STT",
  "Service in Quotation": "Dịch vụ trong báo giá",
  "Catalog Service": "Dịch vụ trong danh mục",
  "No catalog": "Không có danh mục",
  "Changes": "Thay đổi",
  "No catalog link": "Chưa liên kết danh mục",
  "{0} changed": "{0} thay đổi",
  "No change": "Không thay đổi",
  "Detail": "Chi tiết",
  "View": "Xem",
  "{0} field(s) changed": "{0} trường thay đổi",
  "No catalog service": "Không có dịch vụ trong danh mục",
  "This service is not linked to a catalog service — no comparison data available.": "Dịch vụ này chưa liên kết với dịch vụ trong danh mục — không có dữ liệu so sánh.",
  "Field": "Trường",
  "Catalog (Original)": "Danh mục (gốc)",
  "Current in Form": "Hiện tại trong biểu mẫu",
  "Status": "Trạng thái",
  "Changed": "Đã thay đổi",
  "Same": "Giống nhau",
  "View currency breakdown ({0} currencies)": "Xem chi tiết tiền tệ ({0} loại tiền)",
  "Missing exchange rate ({0}) — the total is not final.": "Thiếu tỷ giá ({0}) — tổng chưa phải cuối cùng.",
  "Combo subtotal:": "Tạm tính combo:",
  "VAT (%):": "VAT (%):",
  "VAT amount:": "Tiền VAT:",
  "Combo total:": "Tổng combo:",
  "Subtotal (excl. VAT)": "Tạm tính (chưa VAT)",
  "VAT amount": "Tiền VAT",
  "Total": "Tổng",
  "COMBO": "COMBO",
  "Add service to this combo": "Thêm dịch vụ vào combo này",
  "+ Add service": "+ Thêm dịch vụ",
  "Remove this combo": "Gỡ combo này",
  "× Remove combo": "× Gỡ combo",
  "Please select Internal Company first": "Vui lòng chọn Công ty nội bộ trước",
  "Service List": "Danh sách dịch vụ",
  "Review Changes": "Xem lại thay đổi",
  "New service": "Dịch vụ mới",
  "Pricing Mode": "Cách tính giá",
  "Service Name & Type": "Tên & loại dịch vụ",
  "No services added — click \"New service\"": "Chưa có dịch vụ — bấm \"Dịch vụ mới\"",
  "Service name...": "Tên dịch vụ...",
  "Service type...": "Loại dịch vụ...",
  "Service scope or row note...": "Phạm vi dịch vụ hoặc ghi chú dòng...",
  "Included in combo": "Đã gồm trong combo",
  "Original: {0}": "Gốc: {0}",
  "Missing rate to {0}": "Thiếu tỷ giá sang {0}",
  "Done editing": "Xong chỉnh sửa",
  "Edit service": "Sửa dịch vụ",
  "Delete service": "Xóa dịch vụ",
  "Currency breakdown": "Chi tiết tiền tệ",
  "Base currency: {0}. Rates of today.": "Tiền tệ gốc: {0}. Tỷ giá hôm nay.",
  "Original total": "Tổng gốc",
  "Rate to ": "Tỷ giá sang ",
  "Missing": "Thiếu",
  "Converted total": "Tổng quy đổi",
  "Effective date": "Ngày hiệu lực",
  "Source": "Nguồn",
  "Converted total in ": "Tổng quy đổi theo ",
  "Review Service Changes": "Xem lại thay đổi dịch vụ",
  "Review All Service Changes": "Xem lại mọi thay đổi dịch vụ",
  "← Back to list": "← Quay lại danh sách",
  "Related": "Liên quan",
  "Quotation terms": "Điều khoản báo giá",
  "Totals": "Tổng cộng",
  "Currencies": "Tiền tệ",
  "Each service keeps its own currency; totals are in VND at today's rate. View currency breakdown shows the rates used.": "Mỗi dịch vụ giữ tiền tệ riêng; tổng tính bằng VND theo tỷ giá hôm nay. Xem chi tiết tiền tệ để thấy tỷ giá đã dùng.",
  "Quotation fields": "Các trường báo giá",
  "What each field means. The quotation document itself is generated from the template.": "Ý nghĩa của từng trường. Tài liệu báo giá được tạo từ mẫu.",
  "Cannot close this popup from the current runtime.": "Không thể đóng popup này từ môi trường hiện tại.",
  "No exchange rate from the combo's currency to VND — the original amount is kept; check the rates.": "Không có tỷ giá từ tiền tệ của combo sang VND — giữ nguyên số tiền gốc; hãy kiểm tra tỷ giá.",
  "This combo has no services yet.": "Combo này chưa có dịch vụ.",
  "Skipped {0} service(s) already on the quotation: {1}": "Bỏ qua {0} dịch vụ đã có trên báo giá: {1}",
  "Merged {0} standalone service(s) into combo \"{1}\": {2}": "Đã gộp {0} dịch vụ lẻ vào combo \"{1}\": {2}",
  "Service": "Dịch vụ",
  "Combo \"{0}\" applied.": "Đã áp dụng combo \"{0}\".",
  "Also removed {0} service(s) merged into this combo: {1}": "Đồng thời gỡ {0} dịch vụ đã gộp vào combo này: {1}",
  "This service is already on the quotation.": "Dịch vụ này đã có trên báo giá.",
  "Missing exchange rate {0} → VND — this service is not in the total yet; check the rates.": "Thiếu tỷ giá {0} → VND — dịch vụ này chưa được tính vào tổng; hãy kiểm tra tỷ giá.",
  "Please select Internal Issuing Company": "Vui lòng chọn Công ty phát hành",
  "Please select Related Lead or Customer": "Vui lòng chọn Lead hoặc Khách hàng liên quan",
  "Please select Quotation Currency": "Vui lòng chọn tiền tệ báo giá",
  "Please select or pass the main quotation before creating a supplementary quotation.": "Vui lòng chọn báo giá chính trước khi tạo báo giá bổ sung.",
  "Please add at least 1 service": "Vui lòng thêm ít nhất 1 dịch vụ",
  "Please select service information": "Vui lòng chọn thông tin dịch vụ",
  "Please fill in all service information": "Vui lòng điền đầy đủ thông tin dịch vụ",
  "Please enter combo subtotal": "Vui lòng nhập tạm tính combo",
  "Note: You have not selected an approver. Quotation will be created with pending status.": "Lưu ý: Bạn chưa chọn người duyệt. Báo giá sẽ được tạo ở trạng thái chờ.",
  "Creating quotation...": "Đang tạo báo giá...",
  "Checking quotation exchange rates...": "Đang kiểm tra tỷ giá báo giá...",
  "Missing exchange rate for quotation total: {0}": "Thiếu tỷ giá cho tổng báo giá: {0}",
  "Could not retrieve quotation id after creation": "Không lấy được ID báo giá sau khi tạo",
  "Saving service {0}/{1}...": "Đang lưu dịch vụ {0}/{1}...",
  "Could not link the case line to the quotation.": "Không thể liên kết dòng dịch vụ của hồ sơ với báo giá.",
  "Could not sync the contract lines.": "Không thể đồng bộ các dòng dịch vụ của hợp đồng.",
  "Quotation created successfully!": "Đã tạo báo giá!",
  "Saving to catalog...": "Đang lưu vào danh mục...",
  "{0} service{1} added to the catalog.": "Đã thêm {0} dịch vụ vào danh mục.",
  "Combo \"{0}\" was not saved to the catalog — its services could not be linked (a name may already be in use, or saving one of them failed).": "Combo \"{0}\" chưa được lưu vào danh mục — không liên kết được các dịch vụ (có thể tên đã được dùng, hoặc lưu một dịch vụ bị lỗi).",
  "Combo \"{0}\" saved to the catalog — {1} custom service(s) without a catalog link were left out.": "Đã lưu combo \"{0}\" vào danh mục — bỏ qua {1} dịch vụ tự tạo chưa liên kết danh mục.",
  "Combo \"{0}\" saved to the catalog.": "Đã lưu combo \"{0}\" vào danh mục.",
  "Could not save combo \"{0}\" to the catalog.": "Không thể lưu combo \"{0}\" vào danh mục.",
  "Error: ": "Lỗi: ",
  "Please try again": "Vui lòng thử lại",
  "Guide": "Hướng dẫn",
  "Quotation Information": "Thông tin báo giá",
  "Internal Issuing Company": "Công ty phát hành",
  "— Select company —": "— Chọn công ty —",
  "Company #{0}": "Công ty #{0}",
  "Related Case": "Hồ sơ liên quan",
  "-- Select case --": "-- Chọn hồ sơ --",
  "Related Lead": "Lead liên quan",
  "Related Customer": "Khách hàng liên quan",
  "Assigned Lawyer": "Luật sư phụ trách",
  "Quotation Template": "Mẫu báo giá",
  "select company first": "chọn công ty trước",
  "— Select company first —": "— Chọn công ty trước —",
  "— Select template —": "— Chọn mẫu —",
  "+ New Template": "+ Mẫu mới",
  "Short Description": "Mô tả ngắn",
  "Quotation description...": "Mô tả báo giá...",
  "Processing...": "Đang xử lý...",
};
// ---- end ui language ----
const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);

const { React } = ctx;
const { useState, useEffect, useCallback, useMemo, useRef } = React;
const {
  Spin,
  message,
  Tooltip,
  Modal,
  Form: AntForm,
  Input: AntInput,
  Button: AntButton,
  Segmented: AntSegmented,
} = ctx.antd;
const { origin, pathname } = window.location;

const FONT = "inherit";
const FONT_MONO =
  "ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace";
const VAT_DEFAULT = 8;
const PRICING_MODE_LINE = "line";
const PRICING_MODE_PACKAGE = "package";
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

// Configure these popup view UIDs after creating the corresponding NocoBase views.
const POPUP_VIEW_UIDS = {
  leadCreate: "3xktqcqx9g5",
  customerCreate: "onjascp1npq",
  quotationTemplateCreate: "c17e97e4828",
};

const REDIRECT_URL = `${origin}${pathname}`;
// </ai-section>

// <ai-section name="pricing-and-cross-record-sync">

const parseNum = (v) => {
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return isNaN(n) ? 0 : n;
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
const formatMoneyAmount = (value, currency = null) => {
  if (!value && value !== 0) return "—";
  const info = currency || defaultCurrencyObject();
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const decimals = getCurrencyDecimals(info);
  return n.toLocaleString(getCurrencyLocale(info), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
const formatMoneyByCurrency = (value, currency = null) => {
  const info = currency || defaultCurrencyObject();
  return `${formatMoneyAmount(value, info)} ${getCurrencyCode(info)}`;
};
const isSameCurrency = (left, right) => {
  const leftId = extractCurrencyId(left);
  const rightId = extractCurrencyId(right);
  if (leftId && rightId) return leftId === rightId;
  const leftCode = extractCurrencyCode(left) || getCurrencyCode(left || {});
  const rightCode = extractCurrencyCode(right) || getCurrencyCode(right || {});
  return !!leftCode && !!rightCode && leftCode === rightCode;
};
const parseDateMillis = (value) => {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
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
const calcLine = (basePrice, quantity, vat, currency) => {
  const decimals = lineDecimals(currency);
  const sub = roundToDecimals(parseNum(basePrice) * parseNum(quantity), decimals);
  const vatA = roundToDecimals((sub * parseNum(vat)) / 100, decimals);
  return { subTotal: sub, vatAmount: vatA, totalAmount: roundToDecimals(sub + vatA, decimals) };
};
const calcPackageTotals = (subTotal, vatRate, currency) => {
  const decimals = lineDecimals(currency);
  const sub = roundToDecimals(subTotal, decimals);
  const vatA = roundToDecimals((sub * parseNum(vatRate)) / 100, decimals);
  return { subTotal: sub, vatAmount: vatA, totalAmount: roundToDecimals(sub + vatA, decimals) };
};
// ---- end line amount helpers ----
const buildServicePricingPayload = ({
  pricingMode,
  basePrice,
  quantity = 1,
  vat,
  packageSubTotal,
  packageVatRate,
  currency,
  packageCurrency,
}) => {
  if (isPackagePricing(pricingMode)) {
    const totals = calcPackageTotals(packageSubTotal, packageVatRate, packageCurrency);
    return {
      pricingMode: PRICING_MODE_PACKAGE,
      basePrice: 0,
      quantity: 1,
      vat: 0,
      subTotal: 0,
      vatAmount: 0,
      totalAmount: 0,
      packageSubTotal: totals.subTotal,
      packageVatRate: parseNum(packageVatRate),
      packageVatAmount: totals.vatAmount,
      packageTotalAmount: totals.totalAmount,
    };
  }
  const qty = parseNum(quantity) || 1;
  const line = calcLine(basePrice, qty, vat, currency);
  return {
    pricingMode: PRICING_MODE_LINE,
    basePrice: parseNum(basePrice),
    quantity: qty,
    vat: parseNum(vat),
    ...line,
    packageSubTotal: 0,
    packageVatRate: 0,
    packageVatAmount: 0,
    packageTotalAmount: 0,
  };
};
const calcRowsTotals = (items = []) =>
  items.reduce(
    (a, l) => ({
      subTotal: a.subTotal + parseNum(l.subTotal),
      vatAmount: a.vatAmount + parseNum(l.vatAmount),
      totalAmount: a.totalAmount + parseNum(l.totalAmount),
    }),
    { subTotal: 0, vatAmount: 0, totalAmount: 0 },
  );
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
// ---- rate lookup helpers (pure; tested by scripts/tests/money-cases.test.js) ----
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
// ---- end rate lookup helpers ----
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
const buildQuotationFinancialSummary = ({
  rows = [],
  currencies = [],
  baseCurrency = null,
  exchangeRates = [],
  pricingDate,
  packageMode = false,
} = {}) => {
  const targetCurrency = baseCurrency || findDefaultCurrency(currencies);
  if (packageMode) {
    return {
      groups: [],
      missing: [],
      converted: {
        subTotal: 0,
        vatAmount: 0,
        totalAmount: 0,
        canConvert: true,
        currency: targetCurrency,
      },
    };
  }
  const byCurrency = {};
  (rows || []).forEach((row) => {
    if (!row?.serviceName?.trim()) return;
    const rowCurrency = currencyFromRecord(row, currencies, targetCurrency);
    const amounts = calcLine(row.basePrice, row.quantity || 1, row.vat, rowCurrency);
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
      // Whole đồng per line, total = subtotal + VAT: the quotation total
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
const isPackagePricing = (mode) =>
  String(mode || "").toLowerCase() === PRICING_MODE_PACKAGE;

const localIsPackage = (record) =>
  String(record?.pricingMode || "").toLowerCase() === "package";

const localGetContractLineAmounts = (line = {}) => {
  const isPackageLine =
    localIsPackage(line) ||
    parseNum(line.packageSubTotal) ||
    parseNum(line.packageTotalAmount);

  if (isPackageLine) {
    const subTotal = parseNum(line.packageSubTotal ?? line.subTotal);
    const totalAmount = parseNum(line.packageTotalAmount ?? line.totalAmount);
    const vatAmount =
      parseNum(line.packageVatAmount ?? line.vatAmount) ||
      (totalAmount && subTotal ? Math.max(totalAmount - subTotal, 0) : 0);
    return {
      subTotal,
      vatAmount,
      totalAmount: totalAmount || subTotal + vatAmount,
      packageVatRate: parseNum(line.packageVatRate ?? line.vat),
      isPackageLine,
    };
  }

  const quantity = parseNum(line.quantity) || 1;
  const subTotal = parseNum(
    line.subTotal ?? parseNum(line.basePrice) * quantity,
  );
  const vatAmount = parseNum(
    line.vatAmount ?? Math.round((subTotal * parseNum(line.vat)) / 100),
  );
  return {
    subTotal,
    vatAmount,
    totalAmount: parseNum(line.totalAmount ?? subTotal + vatAmount),
    packageVatRate: 0,
    isPackageLine,
  };
};

const localSyncContractHeaderFromServices = async (contractId) => {
  const safeContractId = extractId(contractId);
  if (!safeContractId) return;

  try {
    const [contractRes, linesRes] = await Promise.all([
      ctx.api.request({
        url: "contracts:get",
        params: {
          filterByTk: safeContractId,
          appends: ["cases"],
        },
      }),
      ctx.api.request({
        url: "contractServices:list",
        params: {
          filter: JSON.stringify({ contractId: { $eq: safeContractId } }),
          pageSize: 1000,
        },
      }),
    ]);

    const contract = contractRes?.data?.data || contractRes?.data || {};
    const lines = linesRes?.data?.data || [];
    const syncCurrencies = await fetchAllFromCandidates(
      CURRENCY_RESOURCE_CANDIDATES,
    );
    const contractCurrency = currencyFromRecord(
      contract,
      syncCurrencies,
      findDefaultCurrency(syncCurrencies),
    );
    const isRetainer =
      String(contract.contractType || "").toLowerCase() === "retainer";

    let subTotal = 0;
    let vatAmount = 0;
    let totalAmount = 0;
    let packageVatRate = parseNum(contract.packageVatRate ?? contract.vatRate);

    // Only a combo contract's header is synced here: a retainer's is its typed
    // fee (the form never sends monthlyFee — monthlyFee × duration wrote 0),
    // and a line-priced contract's (and its case's) is recomputed by the
    // database when its lines change.
    if (isRetainer) return; // a retainer's header is its typed fee
    const packageLines = lines.filter(
      (line) =>
        localIsPackage(line) ||
        parseNum(line.packageSubTotal) ||
        parseNum(line.packageTotalAmount),
    );
    const packageLine = packageLines[0];
    if (!(localIsPackage(contract) || packageLine)) return; // line pricing: trg_money_contract_header
    // every combo group counts, not only the first line's
    const packageAmounts = packageLines.length
      ? sumPackageGroups(packageLines, packageVatRate)
      : localGetContractLineAmounts(contract);
    subTotal = packageAmounts.subTotal;
    vatAmount = packageAmounts.vatAmount;
    totalAmount = packageAmounts.totalAmount;
    packageVatRate =
      (packageLines.length ? packageAmounts.vatRate : packageAmounts.packageVatRate) || packageVatRate;

    await ctx.api.request({
      url: "contracts:update",
      method: "POST",
      params: { filterByTk: safeContractId },
      data: {
        subTotal,
        vatAmount,
        totalAmount,
        currencyId: extractCurrencyId(contractCurrency) || null,
        ...(!isRetainer ? { fixedAmount: totalAmount } : {}),
        ...(packageVatRate ? { packageVatRate } : {}),
        ...(extractId(contract.customerId)
          ? { customerId: extractId(contract.customerId) }
          : {}),
        ...(extractId(contract.internalCompanyId)
          ? { internalCompanyId: extractId(contract.internalCompanyId) }
          : {}),
      },
    });

    const projectId =
      extractId(contract.projectId) ||
      extractId(contract.caseId) ||
      (contract.cases &&
        (typeof contract.cases[0] === "object"
          ? contract.cases[0].id
          : contract.cases[0]));

    if (projectId) {
      try {
        await ctx.api.request({
          url: "projects:update",
          method: "POST",
          params: { filterByTk: parseInt(projectId) },
          data: {
            // Cases' "Currency" field is a belongsTo association named
            // "currencies", not a "currencyId" scalar — sending "currencyId"
            // is a silently-ignored unknown key on this collection.
            currencies: extractCurrencyId(contractCurrency) || null,
            currencyId: extractCurrencyId(contractCurrency) || null,
            subTotal,
            vatAmount,
            totalAmount,
          },
        });
      } catch (projectErr) {
        console.warn(
          "[localSyncContractHeaderFromServices] Could not sync project totalAmount",
          projectErr,
        );
      }
    }
  } catch (e) {
    console.error("[localSyncContractHeaderFromServices] failed", e);
  }
};

// </ai-section>

// <ai-section name="shared-utilities-context-and-data-access">
const todayISO = () => new Date().toISOString().slice(0, 10);
const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
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
  const colors = [
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
    h = (h * 31 + name.charCodeAt(i)) % colors.length;
  return colors[h];
};

async function fetchAll(url, extra = {}) {
  try {
    const res = await ctx.api.request({
      url,
      params: { pageSize: 500, page: 1, ...extra },
    });
    return res?.data?.data || [];
  } catch (error) {
    if (extra?.appends) {
      try {
        const res = await ctx.api.request({
          url,
          params: { pageSize: 500, page: 1 },
        });
        return res?.data?.data || [];
      } catch {}
    }
    return [];
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

  // enough history for an older rate date (newest first)
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
async function getCurrentUser() {
  try {
    const r = await ctx.api.request({ url: "auth:check", method: "GET" });
    return r?.data?.data || r?.data || null;
  } catch {
    return null;
  }
}

const runtimeCompact = (items = []) =>
  items
    .map((item) =>
      item === undefined || item === null ? "" : String(item).trim(),
    )
    .filter(Boolean);

const runtimeExtractId = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return runtimeExtractId(value[0]);
  if (typeof value === "object")
    return runtimeExtractId(value.id || value.value || value.key);
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const SYSTEM_USER_ID = 1;
const QUICK_CREATE_CREATED_EVENT = "law:quick-create:created";
const QUICK_CREATE_BRIDGE_KEY = "__lawQuickCreateBridge";
const QUOTATION_REFRESH_BLOCK_UID = "sowlvtiiqkv";
const CONTRACT_REFRESH_BLOCK_UID = "7be57facee6";
// The Quotation module's own list block — confirmed via NocoBase View Settings.
const DEFAULT_REFRESH_BLOCK_UID = QUOTATION_REFRESH_BLOCK_UID;
const ADDITIONAL_REFRESH_BLOCK_UIDS = [
  QUOTATION_REFRESH_BLOCK_UID,
  CONTRACT_REFRESH_BLOCK_UID,
];
const isSystemUserId = (value) => runtimeExtractId(value) === SYSTEM_USER_ID;
const filterSelectableLawyers = (items = []) =>
  (items || []).filter((item) => {
    const linkedUserId =
      runtimeExtractId(item?.userId) ||
      runtimeExtractId(item?.user) ||
      runtimeExtractId(item?.users) ||
      runtimeExtractId(item?.accountId) ||
      runtimeExtractId(item?.account);
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
              "[QuotationCreateForm] quick-create bridge listener failed",
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
                "[QuotationCreateForm] quick-create bridge replay failed",
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
    console.log("[QuotationCreateForm][refresh-debug] getBlockModelByUid", {
      uid,
      foundVia,
      hasEngine: !!engine,
      hasCtxGetModel: typeof ctx.getModel === "function",
      resolvedHasResource: !!(model && model.resource),
      resolvedHasRefreshFn: !!(model && typeof model.refresh === "function"),
    });
    return model || null;
  } catch (error) {
    console.warn("[QuotationCreateForm] get model failed", uid, error);
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
        "[QuotationCreateForm][refresh-debug] refreshed via resource.refresh()",
        uidForLog,
      );
      return true;
    }
    if (typeof blockModel.refresh === "function") {
      await blockModel.refresh();
      console.log(
        "[QuotationCreateForm][refresh-debug] refreshed via blockModel.refresh()",
        uidForLog,
      );
      return true;
    }
    console.warn(
      "[QuotationCreateForm][refresh-debug] model found but has no resource.refresh/refresh function",
      uidForLog,
      blockModel,
    );
  } catch (error) {
    console.warn("[QuotationCreateForm] refresh failed", uidForLog, error);
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
          "[QuotationCreateForm][refresh-debug] click failed on refresh button",
          error,
        );
      }
    });
    console.log(
      "[QuotationCreateForm][refresh-debug] clickVisibleRefreshButtons matched",
      matches.length,
      "button(s)",
    );
    return matches.length > 0;
  } catch (error) {
    console.warn(
      "[QuotationCreateForm][refresh-debug] clickVisibleRefreshButtons failed",
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
      runtimeCompact([
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
    "[QuotationCreateForm][refresh-debug] uidCandidates",
    uidCandidates,
  );

  let refreshedAny = false;
  for (const uid of uidCandidates) {
    const refreshed = await refreshBlockModel(getBlockModelByUid(uid), uid);
    refreshedAny = refreshedAny || refreshed;
  }

  if (!refreshedAny) {
    console.warn(
      "[QuotationCreateForm][refresh-debug] no candidate UID resolved to a refreshable model, falling back to ctx.blockModel/ctx.model",
    );
    refreshedAny = await refreshBlockModel(
      ctx.blockModel || ctx.model,
      "ctx.blockModel||ctx.model",
    );
  }

  const clickedRefreshButton = clickVisibleRefreshButtons();
  refreshedAny = refreshedAny || clickedRefreshButton;

  console.log(
    "[QuotationCreateForm][refresh-debug] refreshNocoBaseDataBlocks result:",
    refreshedAny,
  );
  return refreshedAny;
};

const emitQuickCreateCreated = (collection, record) => {
  const id = runtimeExtractId(record);
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
    targetBlockUid: input.targetBlockUid || QUOTATION_REFRESH_BLOCK_UID,
    dataBlockUid: input.dataBlockUid || QUOTATION_REFRESH_BLOCK_UID,
    refreshBlockUids: runtimeCompact([
      input.refreshBlockUid,
      ...(Array.isArray(input.refreshBlockUids) ? input.refreshBlockUids : []),
      input.targetBlockUid,
      input.dataBlockUid,
      QUOTATION_REFRESH_BLOCK_UID,
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
        console.warn("[QuotationCreateForm] close popup failed", error);
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
      console.warn("[QuotationCreateForm] discard close failed", error);
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
          "[QuotationCreateForm] configure modal close failed",
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
      console.warn("[QuotationCreateForm] patch close failed", error);
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

const getViewInputArgs = () => ctx.view?.inputArgs || {};

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
  const sourceName = String(sourceCollectionName || "").toLowerCase();
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

const debugQuotationContext = (step, payload) => {
  console.log(
    `[QuotationCreateForm][context:${step}]`,
    safeJsonStringify(payload),
  );
};

const openPopupViewByUid = async (viewKey) => {
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
    const result = ctx.openView(uid);
    if (result?.then) await result;
    return true;
  } catch (error) {
    console.warn("[QuotationCreateForm] ctx.openView failed", error);
    message.error(tr("Cannot open configured popup view."));
    return false;
  }
};

const extractId = (value) => {
  const id = value && typeof value === "object" ? value.id : value;
  return id ? parseInt(id, 10) : null;
};

const firstId = (...values) => {
  for (const value of values) {
    const id = Array.isArray(value) ? extractId(value[0]) : extractId(value);
    if (id) return id;
  }
  return null;
};

const hasOwn = (record, key) =>
  !!record &&
  typeof record === "object" &&
  Object.prototype.hasOwnProperty.call(record, key);

const getContextRecordKind = (record) => {
  if (hasOwn(record, "leadType")) return "lead";
  if (hasOwn(record, "customerType")) return "customer";
  if (
    hasOwn(record, "contractCode") ||
    hasOwn(record, "contractName") ||
    hasOwn(record, "contractType")
  )
    return "contract";
  return "";
};

const isProjectRecord = (record = {}) => {
  if (!record || typeof record !== "object") return false;
  if (getContextRecordKind(record)) return false;
  return !!(
    record.caseCode ||
    record.caseName ||
    record.projectName ||
    record.projectManagerId ||
    record.projectStatus ||
    Array.isArray(record.assignees)
  );
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
    record?.projectManagerId,
    record?.projectManager,
    record?.assignees,
  );

const recordCustomerId = (record) =>
  firstId(record?.customerId, record?.customer, record?.customers);

const recordLeadId = (record) =>
  firstId(record?.leadId, record?.lead, record?.leads);

const mergeRecordById = (items, record) => {
  const id = extractId(record?.id);
  if (!id) return items;
  return items.some((item) => String(extractId(item?.id)) === String(id))
    ? items
    : [record, ...items];
};

const normalizeIdentityText = (value) =>
  normalizeLookupText(value).replace(/\s+/g, " ");

const currentUserLawyerId = (lawyers = [], user = null) => {
  if (!user) return null;
  const userId = extractId(user?.id);
  const userEmail = normalizeIdentityText(user?.email || user?.username);
  const userName = normalizeIdentityText(
    user?.nickname ||
      user?.name ||
      [user?.firstName, user?.lastName].filter(Boolean).join(" "),
  );

  const byUserRelation = lawyers.find((lawyer) => {
    const relatedUserId = firstId(
      lawyer?.userId,
      lawyer?.user,
      lawyer?.users,
      lawyer?.accountId,
      lawyer?.account,
    );
    return userId && relatedUserId && String(relatedUserId) === String(userId);
  });
  if (byUserRelation) return extractId(byUserRelation?.id);

  const byEmail = lawyers.find((lawyer) => {
    const lawyerEmail = normalizeIdentityText(
      lawyer?.email ||
        lawyer?.workEmail ||
        lawyer?.user?.email ||
        lawyer?.users?.email,
    );
    return userEmail && lawyerEmail && lawyerEmail === userEmail;
  });
  if (byEmail) return extractId(byEmail?.id);

  const byName = lawyers.find((lawyer) => {
    const lawyerName = normalizeIdentityText(
      lawyer?.lawyerName ||
        lawyer?.name ||
        [lawyer?.firstName, lawyer?.lastName].filter(Boolean).join(" "),
    );
    return userName && lawyerName && lawyerName === userName;
  });
  return byName ? extractId(byName?.id) : null;
};

const normalizeLookupText = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
// Diacritic-insensitive (unlike normalizeLookupText above) - used only for
// "is this typed service name already in the catalog" dedup, so accent
// differences don't create near-duplicate catalog entries.
const normalizeSearch = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const serviceNameKey = (value) =>
  normalizeSearch(value).replace(/\s+/g, " ").trim();

const serviceOptionServiceId = (item) =>
  firstId(item?.serviceId, item?.service, item?.services);

const serviceOptionCompanyId = (item) =>
  firstId(
    item?.internalCompanyId,
    item?.internalCompany,
    item?.companyId,
    item?.company,
  );

const serviceOptionName = (item) =>
  item?.service?.serviceName ||
  item?.services?.serviceName ||
  item?.serviceName ||
  item?.name ||
  "";

const serviceOptionDescription = (item) =>
  item?.service?.description ||
  item?.services?.description ||
  item?.description ||
  "";

const serviceOptionType = (item) =>
  item?.service?.serviceType ||
  item?.services?.serviceType ||
  item?.serviceType ||
  "";

const serviceOptionPrice = (item) =>
  item?.price ??
  item?.basePrice ??
  item?.service?.basePrice ??
  item?.services?.basePrice ??
  0;

const serviceOptionVat = (item) =>
  item?.vat ??
  item?.vatRate ??
  item?.service?.vat ??
  item?.service?.vatRate ??
  item?.services?.vat ??
  item?.services?.vatRate ??
  0;

const serviceOptionCurrency = (item, currencies = [], fallback = null) => {
  const service = item?.service || item?.services || null;
  return (
    currencyFromRecordOptional(item, currencies, null) ||
    currencyFromRecordOptional(service, currencies, null) ||
    currencyFromRecordOptional(fallback, currencies, null)
  );
};

const enrichCompanyServices = (
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
    const currency = serviceOptionCurrency(next, currencies, null);
    return {
      ...next,
      currency,
      currencyId:
        extractCurrencyId(currency) ||
        getRecordCurrencyId(next) ||
        getRecordCurrencyId(service),
      currencyCode: extractCurrencyCode(currency),
    };
  });
};

const fetchRecord = async (url, id, params = {}, options = {}) => {
  if (!id) return null;
  try {
    const res = await ctx.api.request({
      url,
      params: { filterByTk: id, ...params },
    });
    return res?.data?.data || res?.data || null;
  } catch (error) {
    if (!options.quiet) {
      console.warn(
        `[QuotationCreateForm] Could not fetch ${url} #${id}`,
        error,
      );
    }
    return null;
  }
};

const firstPresent = (item, fields) => {
  for (const field of fields) {
    const value = item?.[field];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const projectLabel = (project) => {
  const code = firstPresent(project, ["caseCode", "projectCode", "code"]);
  const name = firstPresent(project, [
    "projectName",
    "caseName",
    "title",
    "name",
  ]);
  return (
    [code, name].filter(Boolean).join(" - ") ||
    (project?.id ? tr("Case #{0}", { 0: project.id }) : tr("Case"))
  );
};

const quoteStatusToServiceStatus = (status) => {
  const st = String(status || "")
    .toLowerCase()
    .trim();
  if (["cancelled", "canceled", "rejected", "lost"].includes(st))
    return "cancelled";
  if (
    [
      "order",
      "ordered",
      "accepted",
      "approved_by_customer",
      "won",
      "done",
    ].includes(st)
  )
    return "ordered";
  if (["sent", "approved"].includes(st)) return "quote_sent";
  if (
    ["pending_approval", "pending", "approval", "submitted", "review"].includes(
      st,
    )
  )
    return "quote_pending_approval";
  return "quote_draft";
};

const PAYMENT_TERMS = [
  { value: "immediate", label: tr("Immediate") },
  { value: "15days", label: tr("Net 15 days") },
  { value: "30days", label: tr("Net 30 days") },
  { value: "45days", label: tr("Net 45 days") },
  { value: "endFollowingMonth", label: tr("End of following month") },
  { value: "balance", label: tr("Balance payment") },
];

// </ai-section>

// <ai-section name="design-tokens-and-ui-components">
const C = {
  border: "#d9d9d9",
  borderFocus: "#1677ff",
  borderPre: "#faad14",
  bgPre: "#fffbe6",
  text: "rgba(0, 0, 0, 0.88)",
  textSub: "rgba(0, 0, 0, 0.45)",
  textLabel: "rgba(0, 0, 0, 0.88)",
  primary: "#1677ff",
  danger: "#ff4d4f",
  success: "#52c41a",
  warning: "#faad14",
  bgCard: "#ffffff",
  bgSection: "#fafafa",
  bgHighlight: "#e6f4ff",
  borderHighlight: "#91caff",
  // Approval palette
  approvalBg: "#f5f5f5",
  approvalBorder: "#d9d9d9",
  approvalText: "rgba(0, 0, 0, 0.65)",
  approvalBadgeBg: "#f5f5f5",
};

const inp = (ex = {}) => ({
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "4px 11px",
  fontSize: 14,
  fontFamily: FONT,
  outline: "none",
  color: C.text,
  background: "#fff",
  width: "100%",
  boxSizing: "border-box",
  transition: "all 0.2s",
  lineHeight: "1.5715",
  minHeight: 32,
  ...ex,
});
const inpPre = (ex = {}) => ({
  ...inp(),
  borderColor: C.borderPre,
  background: C.bgPre,
  ...ex,
});
const onFocus = (e) => {
  if (e.currentTarget) e.currentTarget.style.borderColor = C.borderFocus;
};
const onBlur = (e) => {
  if (e.currentTarget) e.currentTarget.style.borderColor = C.border;
};
const onFocusP = (e) => {
  if (e.currentTarget) e.currentTarget.style.borderColor = C.borderPre;
};
const onBlurP = (e) => {
  if (e.currentTarget) e.currentTarget.style.borderColor = C.borderPre;
};

// ==================== AUTO-RESIZE TEXTAREA ====================
const AutoTextarea = ({
  value,
  onChange,
  placeholder,
  minRows = 3,
  prefilled = false,
}) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = ref.current.scrollHeight + "px";
  }, [value]);
  if (AntInput?.TextArea) {
    return React.createElement(AntInput.TextArea, {
      value: value || "",
      onChange: (e) => onChange(e.target.value),
      placeholder,
      autoSize: { minRows },
      style: prefilled
        ? { borderColor: C.borderPre, background: C.bgPre }
        : undefined,
    });
  }
  return React.createElement("textarea", {
    ref,
    value: value || "",
    onChange: (e) => onChange(e.target.value),
    placeholder,
    rows: minRows,
    style: {
      ...(prefilled ? inpPre() : inp()),
      resize: "none",
      overflow: "hidden",
      lineHeight: "22px",
      minHeight: minRows * 22 + 18,
    },
    onFocus: prefilled ? onFocusP : onFocus,
    onBlur: prefilled ? onBlurP : onBlur,
  });
};

// ==================== DATE PICKER ====================
const DatePicker = ({ value, onChange, minDate }) => {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState(() => {
    if (value) {
      const d = new Date(value);
      return { y: d.getFullYear(), m: d.getMonth() };
    }
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() };
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minD = minDate ? new Date(minDate) : today;
  minD.setHours(0, 0, 0, 0);
  const selected = value ? new Date(value) : null;
  if (selected) selected.setHours(0, 0, 0, 0);
  const MONTHS_VI = [
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
  const DAYS_VI = [tr("Sun"), tr("Mon"), tr("Tue"), tr("Wed"), tr("Thu"), tr("Fri"), tr("Sat")];
  const firstDay = new Date(display.y, display.m, 1).getDay();
  const daysInMon = new Date(display.y, display.m + 1, 0).getDate();
  const prevMonth = () =>
    setDisplay((p) =>
      p.m === 0 ? { y: p.y - 1, m: 11 } : { y: p.y, m: p.m - 1 },
    );
  const nextMonth = () =>
    setDisplay((p) =>
      p.m === 11 ? { y: p.y + 1, m: 0 } : { y: p.y, m: p.m + 1 },
    );
  const selectDay = (day) => {
    onChange(new Date(display.y, display.m, day).toISOString());
    setOpen(false);
  };
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMon; d++) cells.push(d);
  const displayStr = selected ? fmtDate(selected.toISOString()) : "";
  return React.createElement(
    "div",
    { style: { position: "relative", zIndex: open ? 1000 : 1 } },
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
        { style: { color: displayStr ? C.text : C.textSub, fontSize: 13.5 } },
        displayStr || tr("Select date"),
      ),
      React.createElement(
        "span",
        { style: { fontSize: 14, color: C.textSub, marginLeft: 8 } },
        "📅",
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
            zIndex: 999,
            background: "#fff",
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            boxShadow: "0 12px 36px rgba(0,0,0,0.15)",
            padding: "14px 14px 10px",
            width: 300,
          },
        },
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
              onClick: prevMonth,
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
              style: {
                fontFamily: FONT,
                fontWeight: 600,
                fontSize: 13.5,
                color: C.text,
              },
            },
            `${MONTHS_VI[display.m]} ${display.y}`,
          ),
          React.createElement(
            "button",
            {
              onClick: nextMonth,
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
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 2,
              marginBottom: 4,
            },
          },
          ...DAYS_VI.map((d) =>
            React.createElement(
              "div",
              {
                key: d,
                style: {
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.textSub,
                  padding: "2px 0",
                  fontFamily: FONT,
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
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 2,
            },
          },
          ...cells.map((day, i) => {
            if (!day) return React.createElement("div", { key: `e${i}` });
            const thisDate = new Date(display.y, display.m, day);
            thisDate.setHours(0, 0, 0, 0);
            const isDisabled = thisDate < minD;
            const isSelected =
              selected && thisDate.getTime() === selected.getTime();
            const isToday = thisDate.getTime() === today.getTime();
            return React.createElement(
              "div",
              {
                key: day,
                onClick: () => !isDisabled && selectDay(day),
                style: {
                  textAlign: "center",
                  padding: "6px 0",
                  borderRadius: 6,
                  fontSize: 13.5,
                  fontFamily: FONT,
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  fontWeight: isToday ? 600 : 400,
                  color: isDisabled
                    ? "#d1d5db"
                    : isSelected
                      ? "#fff"
                      : isToday
                        ? C.primary
                        : C.text,
                  background: isSelected
                    ? C.primary
                    : isToday && !isSelected
                      ? C.bgHighlight
                      : "transparent",
                },
              },
              day,
            );
          }),
        ),
        value &&
          React.createElement(
            "div",
            {
              onClick: () => {
                onChange("");
                setOpen(false);
              },
              style: {
                marginTop: 10,
                textAlign: "center",
                fontSize: 12,
                color: C.danger,
                cursor: "pointer",
                padding: "4px 0",
              },
            },
            tr("Clear selected date"),
          ),
      ),
  );
};

// ==================== PRICE INPUT ====================
// ---- money draft helpers (pure; tested by scripts/tests/money-input.test.js) ----
// What a price box shows and hands back, by the currency's decimals:
// VND whole đồng grouped "1.000.000"; USD / EUR / SGD typed as "120.50".
// Vietnamese typing too: a comma is the decimal point when 1-2 digits (or
// nothing yet) follow it, and groups thousands when 3 do ("1,500"); a dot is
// the decimal point unless several dots group thousands ("1.500.000").
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
// A VND box being typed in: digits only, grouped "1.000.000".
const groupWholeDraft = (value) => {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
};
// A stored amount shown in a VND box: a decimal one (a price switched from
// USD, "120.50") rounds to whole đồng instead of losing its point.
const moneyDraftShow = (value, decimals) => {
  if (value === undefined || value === null || value === "") return "";
  if (decimals <= 0) {
    const s = String(value).trim();
    return groupWholeDraft(/^\d+\.\d+$/.test(s) ? String(Math.round(Number(s))) : s);
  }
  return cleanDecimalDraft(value, decimals);
};
const moneyDraftValue = (draft, decimals) => {
  const cleaned = decimals <= 0 ? String(draft ?? "").replace(/[^\d]/g, "") : cleanDecimalDraft(draft, decimals);
  const n = Number(cleaned);
  return cleaned && Number.isFinite(n) ? n : 0;
};
// ---- end money draft helpers ----

const PriceInput = ({ value, onChange, prefilled, currency = null }) => {
  const decimals = currency ? getCurrencyDecimals(currency) : 0;
  const [draft, setDraft] = useState(() => moneyDraftShow(value, decimals));

  // keep what is being typed ("120.") while it still means the same value
  useEffect(() => {
    setDraft((prev) =>
      moneyDraftValue(prev, decimals) === Number(value || 0) && prev !== ""
        ? prev
        : moneyDraftShow(value, decimals),
    );
  }, [value, decimals]);

  const handleChange = (inputValue) => {
    const next = decimals > 0 ? cleanDecimalDraft(inputValue, decimals) : groupWholeDraft(inputValue);
    setDraft(next);
    onChange(moneyDraftValue(next, decimals));
  };

  const normalizeDraft = () => {
    setDraft(moneyDraftShow(moneyDraftValue(draft, decimals), decimals));
  };

  if (AntInput) {
    return React.createElement(AntInput, {
      value: draft,
      placeholder: "0",
      inputMode: decimals > 0 ? "decimal" : "numeric",
      onChange: (e) => handleChange(e.target.value),
      onBlur: normalizeDraft,
      style: {
        textAlign: "right",
        ...(prefilled
          ? { borderColor: C.borderPre, background: C.bgPre }
          : null),
      },
    });
  }
  return React.createElement("input", {
    type: "text",
    value: draft,
    placeholder: "0",
    inputMode: decimals > 0 ? "decimal" : "numeric",
    onChange: (e) => handleChange(e.target.value),
    style: { ...(prefilled ? inpPre() : inp()), textAlign: "right" },
    onFocus: prefilled ? onFocusP : onFocus,
    onBlur: (e) => {
      normalizeDraft();
      (prefilled ? onBlurP : onBlur)(e);
    },
  });
};

// ==================== UI PRIMITIVES ====================
const Card = ({ children, style = {} }) =>
  React.createElement(
    "section",
    {
      style: {
        background: C.bgCard,
        borderTop: `1px solid ${C.border}`,
        paddingTop: 18,
        marginTop: 18,
        ...style,
      },
    },
    children,
  );

const CardHeader = ({ title, right }) =>
  React.createElement(
    "div",
    {
      style: {
        padding: "0 0 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      },
    },
    React.createElement(
      "span",
      {
        style: {
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 14,
          color: C.text,
        },
      },
      title,
    ),
    right || null,
  );

const Grid = ({ cols = 2, gap = 16, mb = 16, children }) =>
  React.createElement(
    "div",
    {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap,
        marginBottom: mb,
      },
    },
    children,
  );

const FIELD_HELP = {
  "Internal Issuing Company": tr("The firm entity that issues the quotation. Services and templates are filtered by it."),
  "Related Lead": tr("The lead, when the quotation comes from a sales opportunity that is not a customer yet."),
  "Related Customer": tr("The customer, when they already have a customer record."),
  "Assigned Lawyer": tr("The lawyer in charge of the quotation and the services that follow."),
  "Require approval before sending": tr("Tick when someone must review the quotation before it is sent."),
  Approver: tr("The person who reviews the quotation."),
  "Payment Terms": tr("Expected payment terms, e.g. immediate, net 15, net 30."),
  "Quotation Template": tr("The template used to generate the quotation document."),
  "Valid Until": tr("The last day the quotation is valid."),
  Address: tr("The address printed on the quotation, if the template uses one."),
  "Short Description": tr("A short note about the quotation."),
  "Service List": tr("The services offered in this quotation."),
  "Service Name": tr("A service from the internal company's catalog."),
  Description: tr("The scope of work of each line; edit it for this quotation."),
  "Unit Price": tr("The price of one unit, before VAT, in the line's currency."),
  "VAT %": tr("The VAT rate of the line."),
  Subtotal: tr("The amount before VAT."),
  "VAT amount": tr("The VAT of the line."),
  Total: tr("The amount after VAT, in VND."),
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
        color: C.textSub,
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

const Field = ({ label, required, hint, children, mb = 0, tooltip }) => {
  const labelNode = React.createElement(
    "span",
    { style: { display: "inline-flex", alignItems: "center", minWidth: 0 } },
    React.createElement("span", { style: { color: C.textLabel } }, label),
    React.createElement(HelpMark, { text: tooltip || (FIELD_HELP[label] || FIELD_HELP[Object.keys(VI).find((k) => VI[k] === label && k in FIELD_HELP)]) }),
    hint &&
      React.createElement(
        "span",
        {
          style: {
            fontSize: 12,
            color: C.textSub,
            fontStyle: "italic",
            marginLeft: 6,
          },
        },
        hint,
      ),
  );

  if (AntForm?.Item) {
    return React.createElement(
      AntForm.Item,
      {
        label: labelNode,
        required: !!required,
        colon: false,
        labelCol: { span: 24 },
        wrapperCol: { span: 24 },
        style: { marginBottom: mb, minWidth: 0, maxWidth: "100%" },
      },
      children,
    );
  }

  return React.createElement(
    "div",
    { style: { marginBottom: mb, minWidth: 0, maxWidth: "100%" } },
    React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", marginBottom: 5 } },
      React.createElement(
        "span",
        {
          style: {
            fontFamily: FONT,
            fontSize: 12,
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
      React.createElement(HelpMark, { text: tooltip || (FIELD_HELP[label] || FIELD_HELP[Object.keys(VI).find((k) => VI[k] === label && k in FIELD_HELP)]) }),
      hint &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 11,
              color: C.textSub,
              fontStyle: "italic",
              marginLeft: 6,
            },
          },
          hint,
        ),
    ),
    children,
  );
};

// ==================== AVATAR ====================
const Avatar = ({ name, size = 32 }) =>
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
        letterSpacing: 0.5,
        userSelect: "none",
      },
    },
    getInitials(name),
  );
const AddNewIconButton = ({ onClick, title = tr("Add new") }) =>
  React.createElement(
    "button",
    {
      type: "button",
      title,
      onMouseDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      },
      style: {
        width: 22,
        height: 22,
        borderRadius: "50%",
        border: "none",
        background: C.bgHighlight,
        color: C.primary,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: 700,
        lineHeight: 1,
        padding: 0,
        flexShrink: 0,
        pointerEvents: "auto",
      },
    },
    "+",
  );
const SelectedCheckIcon = () =>
  React.createElement(
    "span",
    {
      title: tr("Selected"),
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: "#ecfdf5",
        border: `1px solid ${C.success}33`,
        color: C.success,
        flexShrink: 0,
      },
    },
    React.createElement(
      "svg",
      {
        width: 13,
        height: 13,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2.5,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
      },
      React.createElement("path", { d: "M20 6 9 17l-5-5" }),
    ),
  );

// ==================== LEAD SEARCHABLE DROPDOWN ====================
const LeadDropdown = ({ leads, value, onChange, currentLead, onAddNew }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  const sortedLeads = useMemo(
    () =>
      [...leads].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      ),
    [leads],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return sortedLeads;
    const q = search.toLowerCase();
    return sortedLeads.filter((l) => {
      const name = (
        l.companyName ||
        l.customerName ||
        l.fullName ||
        l.name ||
        ""
      ).toLowerCase();
      const phone = (l.phone || l.phoneNumber || "").toLowerCase();
      const email = (l.email || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [sortedLeads, search]);

  const selected = useMemo(
    () => leads.find((l) => String(l.id) === String(value)),
    [leads, value],
  );
  const getLeadName = (l) => {
    if (l.leadType === "company")
      return (
        l.companyName ||
        l.customerName ||
        l.fullName ||
        l.name ||
        tr("Lead #{0}", { 0: l.id })
      );
    return (
      l.fullName || l.customerName || l.name || l.companyName || tr("Lead #{0}", { 0: l.id })
    );
  };
  const selectedName = selected ? getLeadName(selected) : "";
  const isCurrentLead = (l) =>
    currentLead && String(l.id) === String(currentLead.id);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  return React.createElement(
    "div",
    { ref, style: { position: "relative", zIndex: open ? 1000 : 1 } },
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
          gap: 8,
          userSelect: "none",
          borderColor: open ? C.borderFocus : C.border,
          minHeight: 38,
          padding: "7px 11px",
        },
      },
      selected
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement(Avatar, { name: selectedName, size: 22 }),
            React.createElement(
              "div",
              { style: { flex: 1, minWidth: 0 } },
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.text,
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
                  },
                },
                selectedName,
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
                  fontSize: 13,
                  color: C.textSub,
                  cursor: "pointer",
                  padding: "2px 6px",
                  borderRadius: 4,
                  flexShrink: 0,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                },
                title: tr("Clear selection"),
              },
              React.createElement(
                "svg",
                {
                  width: 14,
                  height: 14,
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: 2.5,
                  strokeLinecap: "round",
                },
                React.createElement("line", { x1: 18, y1: 6, x2: 6, y2: 18 }),
                React.createElement("line", { x1: 6, y1: 6, x2: 18, y2: 18 }),
              ),
            ),
          )
        : React.createElement(
            React.Fragment,
            null,
            React.createElement(
              "span",
              { style: { color: C.textSub, fontSize: 13, flex: 1 } },
              tr("— Search or select lead —"),
            ),
            onAddNew &&
              React.createElement(AddNewIconButton, {
                title: tr("Add new lead"),
                onClick: () => {
                  setOpen(false);
                  onAddNew();
                },
              }),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 11,
                  color: C.textSub,
                  transform: open ? "rotate(180deg)" : "none",
                  display: "inline-block",
                  transition: "transform 0.15s",
                },
              },
              "▾",
            ),
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
            zIndex: 999,
            background: "#fff",
            borderRadius: 6,
            border: `1px solid ${C.border}`,
            boxShadow: "0 12px 28px rgba(15,23,42,0.14)",
            overflow: "hidden",
          },
        },
        React.createElement(
          "div",
          {
            style: { padding: 8, borderBottom: `1px solid #f3f4f6` },
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
                },
              },
              // "Search",
            ),
            React.createElement("input", {
              autoFocus: true,
              value: search,
              onChange: (e) => setSearch(e.target.value),
              placeholder: tr("Search by name, phone, email..."),
              style: {
                ...inp({ paddingLeft: 11, paddingTop: 7, paddingBottom: 7 }),
              },
              onFocus,
              onBlur,
            }),
          ),
        ),

        React.createElement(
          "div",
          { style: { maxHeight: 220, overflowY: "auto" } },
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
                const lName = getLeadName(l);
                const isSelected = String(l.id) === String(value);
                const isCurrent = isCurrentLead(l);
                return React.createElement(
                  "div",
                  {
                    key: l.id,
                    onClick: () => {
                      onChange(String(l.id));
                      setOpen(false);
                    },
                    style: {
                      padding: "8px 11px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      background: isSelected
                        ? C.bgHighlight
                        : isCurrent
                          ? "#f0fdf4"
                          : i % 2 === 0
                            ? "#fff"
                            : "#fafafa",
                      borderBottom: `1px solid #f3f4f6`,
                    },
                  },
                  React.createElement(Avatar, { name: lName, size: 22 }),
                  React.createElement(
                    "div",
                    { style: { flex: 1, minWidth: 0 } },
                    React.createElement(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        },
                      },
                      React.createElement(
                        "span",
                        {
                          style: {
                            fontSize: 13,
                            fontWeight: isSelected ? 600 : 500,
                            color: C.text,
                            whiteSpace: "normal",
                            overflowWrap: "anywhere",
                          },
                        },
                        lName,
                      ),
                    ),
                  ),
                  isSelected && React.createElement(SelectedCheckIcon),
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
            search
              ? tr("{0} results", { 0: filtered.length })
              : tr("{0} leads — newest first", { 0: filtered.length }),
          ),
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 12 } },
            onAddNew &&
              React.createElement(AddNewIconButton, {
                title: tr("Add new customer"),
                onClick: () => {
                  setOpen(false);
                  onAddNew();
                },
              }),
            value &&
              React.createElement(
                "span",
                {
                  onClick: () => onChange(null),
                  style: { fontSize: 11.5, color: C.danger, cursor: "pointer" },
                },
                tr("Clear"),
              ),
          ),
        ),
      ),
  );
};

// ==================== CUSTOMER SEARCHABLE DROPDOWN ====================
const CustomerDropdown = ({
  customers,
  value,
  onChange,
  currentCustomer,
  onAddNew,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  const sortedCustomers = useMemo(
    () =>
      [...customers].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      ),
    [customers],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return sortedCustomers;
    const q = search.toLowerCase();
    return sortedCustomers.filter((c) => {
      const name = (
        c.companyLegalName ||
        c.companyName ||
        c.customerName ||
        c.fullName ||
        c.name ||
        ""
      ).toLowerCase();
      const phone = (c.phone || c.phoneNumber || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [sortedCustomers, search]);

  const selected = useMemo(
    () => customers.find((c) => String(c.id) === String(value)),
    [customers, value],
  );
  const getCustomerName = (c) => {
    if (c.customerType === "company")
      return (
        c.companyLegalName ||
        c.companyName ||
        c.customerName ||
        c.fullName ||
        c.name ||
        tr("Customer #{0}", { 0: c.id })
      );
    return (
      c.fullName ||
      c.customerName ||
      c.name ||
      c.companyLegalName ||
      c.companyName ||
      tr("Customer #{0}", { 0: c.id })
    );
  };
  const selectedName = selected ? getCustomerName(selected) : "";
  const isCurrentCustomer = (c) =>
    currentCustomer && String(c.id) === String(currentCustomer.id);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  return React.createElement(
    "div",
    { ref, style: { position: "relative", zIndex: open ? 1000 : 1 } },
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
          gap: 8,
          userSelect: "none",
          borderColor: open ? C.borderFocus : C.border,
          minHeight: 38,
          padding: "7px 11px",
        },
      },
      selected
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement(Avatar, { name: selectedName, size: 22 }),
            React.createElement(
              "div",
              { style: { flex: 1, minWidth: 0 } },
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.text,
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
                  },
                },
                selectedName,
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
                  fontSize: 13,
                  color: C.textSub,
                  cursor: "pointer",
                  padding: "2px 6px",
                  borderRadius: 4,
                  flexShrink: 0,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                },
                title: tr("Clear selection"),
              },
              React.createElement(
                "svg",
                {
                  width: 14,
                  height: 14,
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: 2.5,
                  strokeLinecap: "round",
                },
                React.createElement("line", { x1: 18, y1: 6, x2: 6, y2: 18 }),
                React.createElement("line", { x1: 6, y1: 6, x2: 18, y2: 18 }),
              ),
            ),
          )
        : React.createElement(
            React.Fragment,
            null,
            React.createElement(
              "span",
              { style: { color: C.textSub, fontSize: 13, flex: 1 } },
              tr("— Search or select customer —"),
            ),
            onAddNew &&
              React.createElement(AddNewIconButton, {
                title: tr("Add new customer"),
                onClick: () => {
                  setOpen(false);
                  onAddNew();
                },
              }),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 11,
                  color: C.textSub,
                  transform: open ? "rotate(180deg)" : "none",
                  display: "inline-block",
                  transition: "transform 0.15s",
                },
              },
              "▾",
            ),
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
            zIndex: 999,
            background: "#fff",
            borderRadius: 6,
            border: `1px solid ${C.border}`,
            boxShadow: "0 12px 28px rgba(15,23,42,0.14)",
            overflow: "hidden",
          },
        },
        React.createElement(
          "div",
          {
            style: { padding: 8, borderBottom: `1px solid #f3f4f6` },
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
                },
              },
              // "Search",
            ),
            React.createElement("input", {
              autoFocus: true,
              value: search,
              onChange: (e) => setSearch(e.target.value),
              placeholder: tr("Search by name, phone, email..."),
              style: {
                ...inp({ paddingLeft: 11, paddingTop: 7, paddingBottom: 7 }),
              },
            }),
          ),
        ),

        React.createElement(
          "div",
          { style: { maxHeight: 220, overflowY: "auto" } },
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
            : filtered.map((c, i) => {
                const cName = getCustomerName(c);
                const isSelected = String(c.id) === String(value);
                const isCurrent = isCurrentCustomer(c);
                return React.createElement(
                  "div",
                  {
                    key: c.id,
                    onClick: () => {
                      onChange(String(c.id));
                      setOpen(false);
                    },
                    style: {
                      padding: "8px 11px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      background: isSelected
                        ? C.bgHighlight
                        : isCurrent
                          ? "#f0fdf4"
                          : i % 2 === 0
                            ? "#fff"
                            : "#fafafa",
                      borderBottom: `1px solid #f3f4f6`,
                    },
                  },
                  React.createElement(Avatar, { name: cName, size: 22 }),
                  React.createElement(
                    "div",
                    { style: { flex: 1, minWidth: 0 } },
                    React.createElement(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        },
                      },
                      React.createElement(
                        "span",
                        {
                          style: {
                            fontSize: 13,
                            fontWeight: isSelected ? 600 : 500,
                            color: C.text,
                            whiteSpace: "normal",
                            overflowWrap: "anywhere",
                          },
                        },
                        cName,
                      ),
                      isCurrent &&
                        React.createElement(
                          "span",
                          {
                            style: {
                              fontSize: 10,
                              background: "#dcfce7",
                              color: "#16a34a",
                              border: "1px solid #bbf7d0",
                              borderRadius: 4,
                              padding: "1px 6px",
                              fontWeight: 600,
                              flexShrink: 0,
                            },
                          },
                          tr("Current"),
                        ),
                    ),
                  ),
                  isSelected && React.createElement(SelectedCheckIcon),
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
            search
              ? tr("{0} results", { 0: filtered.length })
              : tr("{0} customers — newest first", { 0: filtered.length }),
          ),
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 12 } },
            onAddNew &&
              React.createElement(AddNewIconButton, {
                title: tr("Add new lead"),
                onClick: () => {
                  setOpen(false);
                  onAddNew();
                },
              }),
            value &&
              React.createElement(
                "span",
                {
                  onClick: () => onChange(null),
                  style: { fontSize: 11.5, color: C.danger, cursor: "pointer" },
                },
                tr("Clear"),
              ),
          ),
        ),
      ),
  );
};

// ==================== LAWYER PICKER (GROUPED BY TYPE) ====================
const LawyerPicker = ({ lawyers = [], value, onChange, accentColor }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  const getLawyerName = (l) =>
    l.lawyerName ||
    l.name ||
    [l.firstName, l.lastName].filter(Boolean).join(" ") ||
    l.email ||
    tr("Lawyer #{0}", { 0: l.id });

  const GROUP_CONFIG = [
    { key: "partner", label: tr("Partner"), color: "#7c3aed", bg: "#f3e8ff" },
    { key: "lawyer", label: tr("Lawyer"), color: "#2563eb", bg: "#eff6ff" },
    { key: "associate", label: tr("Associate"), color: "#059669", bg: "#d1fae5" },
    { key: "sales", label: tr("Sales"), color: "#d97706", bg: "#fef3c7" },
    { key: "suppliant", label: tr("Suppliant"), color: "#4b5563", bg: "#f3f4f6" },
  ];

  const filtered = useMemo(() => {
    let list = lawyers.filter((l) => {
      const type = String(l.lawyerType || "")
        .toLowerCase()
        .trim();
      return GROUP_CONFIG.some((g) => g.key === type);
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          getLawyerName(l).toLowerCase().includes(q) ||
          (l.email || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [lawyers, search]);

  const grouped = useMemo(() => {
    const g = {
      partner: [],
      lawyer: [],
      associate: [],
      sales: [],
      suppliant: [],
    };
    filtered.forEach((l) => {
      const type = String(l.lawyerType || "")
        .toLowerCase()
        .trim();
      if (g[type]) g[type].push(l);
    });
    return g;
  }, [filtered]);

  const selected = useMemo(
    () => lawyers.find((l) => String(l.id) === String(value)),
    [lawyers, value],
  );
  const selectedName = selected ? getLawyerName(selected) : "";
  const selectedType = selected
    ? String(selected.lawyerType || "")
        .toLowerCase()
        .trim()
    : "";
  const selectedConf = GROUP_CONFIG.find((g) => g.key === selectedType);
  const focusColor = accentColor || C.borderFocus;

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  return React.createElement(
    "div",
    { ref, style: { position: "relative", zIndex: open ? 1000 : 1 } },
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
          gap: 8,
          userSelect: "none",
          borderColor: open ? focusColor : C.border,
          minHeight: 38,
          padding: "7px 11px",
        },
      },
      selected
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement(Avatar, { name: selectedName, size: 22 }),
            React.createElement(
              "div",
              { style: { flex: 1, minWidth: 0 } },
              React.createElement(
                "div",
                { style: { fontSize: 13, fontWeight: 600, color: C.text } },
                selectedName,
              ),
              selectedConf &&
                React.createElement(
                  "div",
                  { style: { fontSize: 11, color: selectedConf.color } },
                  selectedConf.label,
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
                  fontSize: 13,
                  color: C.textSub,
                  cursor: "pointer",
                  padding: "2px 6px",
                  borderRadius: 4,
                  flexShrink: 0,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                },
                title: tr("Clear selection"),
              },
              React.createElement(
                "svg",
                {
                  width: 14,
                  height: 14,
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: 2.5,
                  strokeLinecap: "round",
                },
                React.createElement("line", { x1: 18, y1: 6, x2: 6, y2: 18 }),
                React.createElement("line", { x1: 6, y1: 6, x2: 18, y2: 18 }),
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
                  width: 22,
                  height: 22,
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
              { style: { color: C.textSub, fontSize: 13, flex: 1 } },
              tr("— Select lawyer —"),
            ),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 11,
                  color: C.textSub,
                  transform: open ? "rotate(180deg)" : "none",
                  display: "inline-block",
                  transition: "transform 0.15s",
                },
              },
              "▾",
            ),
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
            zIndex: 999,
            background: "#fff",
            borderRadius: 6,
            border: `1px solid ${C.border}`,
            boxShadow: "0 12px 28px rgba(15,23,42,0.14)",
            overflow: "hidden",
          },
        },
        React.createElement(
          "div",
          {
            style: { padding: 8, borderBottom: `1px solid #f3f4f6` },
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
                },
              },
              // "Search",
            ),
            React.createElement("input", {
              autoFocus: true,
              value: search,
              onChange: (e) => setSearch(e.target.value),
              placeholder: tr("Search by name, email..."),
              style: {
                ...inp({ paddingLeft: 11, paddingTop: 7, paddingBottom: 7 }),
              },
              onFocus,
              onBlur,
            }),
          ),
        ),

        React.createElement(
          "div",
          { style: { maxHeight: 220, overflowY: "auto" } },
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
            : GROUP_CONFIG.map((group) => {
                const items = grouped[group.key];
                if (!items || items.length === 0) return null;
                return React.createElement(
                  React.Fragment,
                  { key: group.key },
                  React.createElement(
                    "div",
                    {
                      style: {
                        padding: "6px 14px",
                        background: "#f9fafb",
                        borderBottom: "1px solid #f3f4f6",
                        borderTop: "1px solid #f3f4f6",
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: group.color,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      },
                    },
                    group.label,
                  ),
                  items.map((u) => {
                    const uName = getLawyerName(u);
                    const isSelected = String(u.id) === String(value);
                    return React.createElement(
                      "div",
                      {
                        key: u.id,
                        onClick: () => {
                          onChange(String(u.id));
                          setOpen(false);
                        },
                        style: {
                          padding: "8px 11px",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          cursor: "pointer",
                          background: isSelected ? C.bgHighlight : "#fff",
                          borderBottom: "1px solid #f3f4f6",
                        },
                      },
                      React.createElement(Avatar, { name: uName, size: 22 }),
                      React.createElement(
                        "div",
                        { style: { flex: 1 } },
                        React.createElement(
                          "div",
                          {
                            style: {
                              fontSize: 13,
                              fontWeight: isSelected ? 600 : 500,
                              color: C.text,
                            },
                          },
                          uName,
                        ),
                      ),
                      isSelected && React.createElement(SelectedCheckIcon),
                    );
                  }),
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
            },
          },
          React.createElement(
            "span",
            { style: { fontSize: 11.5, color: C.textSub } },
            tr("{0} users", { 0: filtered.length }),
          ),
        ),
      ),
  );
};

// ==================== APPROVAL SECTION ====================
// Hiển thị inline bên dưới luật sư phụ trách, trong cùng Card thông tin báo giá
const ApprovalSection = ({
  isRequired,
  approvedById,
  lawyers,
  onToggle,
  onSelectApprover,
}) => {
  return React.createElement(
    "div",
    { style: { marginTop: 16 } },

    // ── Checkbox row ──
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          background: isRequired ? C.approvalBg : C.bgSection,
          border: `1px solid ${isRequired ? C.approvalBorder : C.border}`,
          borderRadius: isRequired ? "8px 8px 0 0" : 8,
          cursor: "pointer",
          transition: "all 0.18s",
          userSelect: "none",
        },
        onClick: onToggle,
      },
      // Custom checkbox
      React.createElement(
        "div",
        {
          style: {
            width: 18,
            height: 18,
            borderRadius: 4,
            flexShrink: 0,
            border: `2px solid ${isRequired ? C.approvalText : "#d1d5db"}`,
            background: isRequired ? C.approvalText : "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
          },
        },
        isRequired &&
          React.createElement(
            "span",
            {
              style: {
                color: "#fff",
                fontSize: 11,
                fontWeight: 900,
                lineHeight: 1,
              },
            },
            "",
          ),
      ),

      React.createElement(
        "div",
        { style: { flex: 1 } },
        React.createElement(
          "div",
          {
            style: {
              display: "inline-flex",
              alignItems: "center",
              fontSize: 13.5,
              fontWeight: 600,
              color: isRequired ? C.approvalText : C.text,
            },
          },
          tr("Require approval before sending"),
          React.createElement(HelpMark, {
            text: FIELD_HELP["Require approval before sending"],
          }),
        ),
        React.createElement(
          "div",
          { style: { fontSize: 11.5, color: C.textSub, marginTop: 1 } },
          tr("Quotation will need approval from authorized personnel"),
        ),
      ),

      // Status badge
      React.createElement(
        "span",
        {
          style: {
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 10px",
            borderRadius: 10,
            flexShrink: 0,
            background: isRequired ? C.approvalBadgeBg : "#f3f4f6",
            color: isRequired ? C.approvalText : "#9ca3af",
            border: `1px solid ${isRequired ? C.approvalBorder : "#e5e7eb"}`,
          },
        },
        isRequired ? tr("Pending Approval") : tr("Not Required"),
      ),
    ),

    // ── Expanded: chọn người xét duyệt ──
    isRequired &&
      React.createElement(
        "div",
        {
          style: {
            padding: "14px 14px",
            background: C.approvalBg,
            border: `1px solid ${C.approvalBorder}`,
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            },
          },
          React.createElement(
            "span",
            {
              style: { fontSize: 11.5, fontWeight: 700, color: C.approvalText },
            },
            tr("Approver"),
            React.createElement(HelpMark, { text: FIELD_HELP.Approver }),
          ),
          React.createElement(
            "span",
            { style: { fontSize: 11, color: "#9ca3af", fontStyle: "italic" } },
            tr("— optional"),
          ),
        ),
        React.createElement(LawyerPicker, {
          lawyers,
          value: approvedById,
          onChange: onSelectApprover,
          accentColor: C.approvalText,
        }),
      ),
  );
};

// Matches a candidate service (by catalog serviceId first, else by
// case-insensitive name) against every row already on the quotation,
// regardless of whether that row came from an individual pick, a
// custom-created service, or an already-applied combo — a service should
// only ever appear once no matter which entry point added it. Mirrors
// CaseCreateForm.js's findDuplicateServiceRow (no shared-module imports in
// this repo, so duplicated here).
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

// ==================== SERVICE PICKER MODAL ====================
// ---- combo merge helpers (pure; tested by scripts/tests/combo-merge.test.js) ----
// Line/Combo pricing sync (2026-09-25, user rule): when a combo is added
// while standalone services exist (picked in Line pricing, or added with
// "New service" before any combo), they are merged INTO that combo — Combo
// pricing never shows loose lines next to combos. Blank placeholder rows
// are left alone. Each merged row is tagged with the combo, priced by it
// (its own value kept as _comboItemSnapshot for reference) and flagged
// _mergedIntoCombo; its value (contributionOf) joins the combo's amount.
const mergeStandaloneIntoCombo = (rows, combo, contributionOf) => {
  const merged = [];
  let contribution = 0;
  const next = (rows || []).map((row) => {
    if (row?._comboInstanceId || !String(row?.serviceName || "").trim()) return row;
    const value = Math.max(Number(contributionOf(row)) || 0, 0);
    contribution += value;
    const mergedRow = {
      ...row,
      basePrice: 0,
      vat: 0,
      _packageBasePrice: 0,
      _comboInstanceId: combo.instanceId,
      _comboCatalogId: combo.catalogId ?? null,
      _comboName: combo.name || "",
      _mergedIntoCombo: true,
      _comboItemSnapshot: row._comboItemSnapshot || { price: value, vat: 0, currency: combo.currency || null },
    };
    merged.push(mergedRow);
    return mergedRow;
  });
  return { rows: next, merged, contribution };
};
// ---- end combo merge helpers ----

const ServicePickerModal = ({
  svcOpts,
  selectedIds,
  onSelect,
  onClose,
  companyId,
  currencies = [],
  currencyOptions = [],
  defaultCurrencyId = null,
  onAddNewService,
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
  // build a one-off ad-hoc bundle. No sample-tasks UI here (unlike
  // CaseCreateForm.js's picker) — quotations don't create tasks, only Cases
  // do, so per-service task templates are meaningless at this stage.
  const [mode, setMode] = useState("individual");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newSvc, setNewSvc] = useState({
    name: "",
    price: 0,
    description: "",
    serviceType: "",
    currencyId: defaultCurrencyId ? String(defaultCurrencyId) : "",
    vat: VAT_DEFAULT,
    saveToCatalog: false,
  });
  const [errors, setErrors] = useState({});
  const [comboTab, setComboTab] = useState("select");
  const [comboSearch, setComboSearch] = useState("");
  const [comboName, setComboName] = useState("");
  const [comboType, setComboType] = useState("");
  const [comboSubTotal, setComboSubTotal] = useState(0);
  const [comboCurrencyId, setComboCurrencyId] = useState(
    defaultCurrencyId ? String(defaultCurrencyId) : "",
  );
  const [comboVatRate, setComboVatRate] = useState(0);
  const [comboItems, setComboItems] = useState([]);
  const [comboItemPick, setComboItemPick] = useState(undefined);
  const [comboErrors, setComboErrors] = useState({});
  const [comboApplying, setComboApplying] = useState(false);
  const [comboSaveToCatalog, setComboSaveToCatalog] = useState(false);
  useEffect(() => {
    if (!defaultCurrencyId) return;
    setNewSvc((prev) =>
      prev.currencyId
        ? prev
        : { ...prev, currencyId: String(defaultCurrencyId) },
    );
    setComboCurrencyId((prev) => (prev ? prev : String(defaultCurrencyId)));
  }, [defaultCurrencyId]);
  const selectedComboCurrency =
    findCurrencyById(currencies, comboCurrencyId) ||
    findCurrencyById(currencies, defaultCurrencyId) ||
    defaultCurrencyObject();

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
      (companyId
        ? svcOpts.filter((s) => String(serviceOptionCompanyId(s)) === String(companyId))
        : svcOpts
      ).filter(
        (s) =>
          !comboItems.some(
            (it) =>
              it.source === "catalog" &&
              String(it.serviceId) === String(serviceOptionServiceId(s)),
          ),
      ),
    [svcOpts, companyId, comboItems],
  );

  const addComboCatalogItem = (svc) => {
    setComboItems((prev) => [
      ...prev,
      {
        _id: Date.now() + Math.random(),
        source: "catalog",
        serviceId: String(serviceOptionServiceId(svc)),
        serviceName: serviceOptionName(svc) || "",
        serviceType: serviceOptionType(svc) || "",
        description: serviceOptionDescription(svc) || "",
        quantity: 1,
        basePrice: parseNum(serviceOptionPrice(svc)),
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
      },
    ]);
    setComboErrors((p) => ({ ...p, items: "" }));
  };
  const updateComboItem = (itemId, field, value) => {
    setComboItems((prev) => prev.map((it) => (it._id === itemId ? { ...it, [field]: value } : it)));
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
          // row's standalone-price display had nothing to read and fell
          // back to 0.
          price: parseNum(it.basePrice ?? it.price),
          vat: parseNum(it.vat),
          currencyId: extractCurrencyId(it.currencyId),
          // Driven entirely by the combo-level checkbox - checking "Also
          // save this combo to the shared catalog" saves every custom item
          // in it, no separate per-item opt-in.
          saveToCatalog:
            comboSaveToCatalog &&
            !svcOpts.some((s) => serviceNameKey(serviceOptionName(s)) === serviceNameKey(it.serviceName)),
        })),
      });
      onClose();
    } finally {
      setComboApplying(false);
    }
  };

  const filtered = useMemo(() => {
    if (!companyId) return [];
    return svcOpts.filter((s) => {
      const match = String(serviceOptionCompanyId(s)) === String(companyId);
      const name = normalizeLookupText(serviceOptionName(s));
      return match && name.includes(normalizeLookupText(search));
    });
  }, [svcOpts, search, companyId]);

  const thS = (ex = {}) => ({
    padding: "9px 14px",
    fontSize: 11.5,
    fontWeight: 600,
    color: C.textSub,
    background: C.bgSection,
    borderBottom: `2px solid ${C.border}`,
    textAlign: "left",
    whiteSpace: "normal",
    fontFamily: FONT,
    ...ex,
  });
  const tdS = (ex = {}) => ({
    padding: "9px 14px",
    fontSize: 13,
    borderBottom: `1px solid #f3f4f6`,
    verticalAlign: "middle",
    fontFamily: FONT,
    ...ex,
  });

  const isNameAlreadyInCatalog = svcOpts.some(
    (s) => serviceNameKey(serviceOptionName(s)) === serviceNameKey(newSvc.name),
  );

  const validate = () => {
    const e = {};
    if (!newSvc.name.trim()) e.name = tr("Please enter service name");
    if (!newSvc.price || newSvc.price <= 0)
      e.price = tr("Unit price must be greater than 0");
    if (currencies.length && !extractCurrencyId(newSvc.currencyId))
      e.currencyId = tr("Please select currency");
    setErrors(e);
    return !Object.keys(e).length;
  };

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
        React.createElement("input", {
          autoFocus: true,
          value: comboSearch,
          onChange: (e) => setComboSearch(e.target.value),
          placeholder: tr("Search combo..."),
          style: { ...inp(), flex: 1 },
          onFocus,
          onBlur,
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
              borderRadius: 6,
              padding: "0 14px",
              height: 34,
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
        { style: { overflowY: "auto", flex: 1 } },
        React.createElement(
          "table",
          { style: { width: "100%", borderCollapse: "collapse" } },
          React.createElement(
            "thead",
            null,
            React.createElement(
              "tr",
              null,
              React.createElement("th", { style: thS({ width: 36, textAlign: "center" }) }, "#"),
              React.createElement("th", { style: thS() }, tr("Combo")),
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
                      { style: tdS({ textAlign: "center", color: C.textSub, fontSize: 12 }) },
                      i + 1,
                    ),
                    React.createElement(
                      "td",
                      { style: tdS() },
                      React.createElement(
                        "div",
                        { style: { display: "flex", flexDirection: "column", gap: 4 } },
                        React.createElement(
                          "span",
                          { style: { fontWeight: 700, color: C.text, overflowWrap: "anywhere" } },
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
                                alignSelf: "flex-start",
                              },
                            },
                            c.serviceComboType,
                          ),
                      ),
                    ),
                    React.createElement(
                      "td",
                      { style: tdS({ textAlign: "right" }) },
                      React.createElement(
                        "div",
                        { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 } },
                        comboSavings !== 0 &&
                          React.createElement(
                            "span",
                            { style: { fontSize: 11, color: C.textSub, textDecoration: "line-through" } },
                            formatMoneyByCurrency(individualTotal, vndCurrency),
                          ),
                        React.createElement(
                          "span",
                          { style: { fontFamily: FONT_MONO, fontWeight: 700, color: C.text } },
                          formatMoneyByCurrency(c.packageSubTotal, currencyFromRecord(c, currencies, defaultCurrencyObject())),
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
                            tr("Save {0} ({1}%)", { 0: formatMoneyByCurrency(comboSavings, vndCurrency), 1: comboSavingsPct }),
                          ),
                      ),
                    ),
                    React.createElement(
                      "td",
                      { style: tdS({ textAlign: "center", color: C.textSub, fontSize: 12.5 }) },
                      itemCount,
                    ),
                    React.createElement(
                      "td",
                      { style: tdS({ textAlign: "center" }) },
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

  const comboTh = (extra = {}) => ({ padding: "8px 10px", fontSize: 11, fontWeight: 600, color: C.textSub, background: C.bgSection, borderBottom: `1px solid ${C.border}`, textAlign: "left", fontFamily: FONT, ...extra });
  const comboTd = (extra = {}) => ({ padding: "6px 10px", fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}`, verticalAlign: "middle", fontFamily: FONT, ...extra });

  const renderComboCreateTab = () =>
    React.createElement(
      React.Fragment,
      null,
      React.createElement(
        "div",
        { style: { overflowY: "auto", flex: 1, padding: "20px 24px" } },
        React.createElement(
          "div",
          { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 16 } },
          React.createElement(
            "div",
            { style: { minWidth: 0 } },
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", marginBottom: 5 } },
              React.createElement(
                "span",
                { style: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: C.text } },
                tr("Combo Name"),
              ),
              React.createElement("span", { style: { color: C.danger, marginLeft: 3, fontSize: 12 } }, "*"),
            ),
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
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", marginBottom: 5 } },
              React.createElement(
                "span",
                { style: { fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: C.text } },
                tr("Combo Type"),
              ),
              React.createElement("span", { style: { color: "#9ca3af", marginLeft: 6, fontSize: 11, fontStyle: "italic" } }, "optional"),
            ),
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
            React.createElement(
              "div",
              { style: { fontSize: 11.5, fontWeight: 600, color: C.text, marginBottom: 5 } },
              tr("Combo Subtotal"),
            ),
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
                React.createElement(
                  "select",
                  {
                    value: comboCurrencyId || "",
                    onChange: (e) => setComboCurrencyId(e.target.value || ""),
                    style: inp(),
                    disabled: !currencies.length,
                  },
                  React.createElement("option", { value: "" }, tr("Currency")),
                  ...currencyOptions.map((option) =>
                    React.createElement("option", { key: option.value, value: option.value }, option.label),
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
                  { style: { marginTop: 6, fontSize: 11.5, color: C.textSub, display: "flex", flexWrap: "wrap", gap: 6 } },
                  React.createElement("span", null, tr("Individual price: {0}", { 0: formatMoneyByCurrency(originalTotal, selectedComboCurrency) })),
                  delta < 0 &&
                    React.createElement("span", { style: { color: C.success, fontWeight: 600 } }, tr("Discount {0}", { 0: formatMoneyByCurrency(-delta, selectedComboCurrency) })),
                  delta > 0 &&
                    React.createElement("span", { style: { color: C.warning, fontWeight: 600 } }, tr("Increase {0}", { 0: formatMoneyByCurrency(delta, selectedComboCurrency) })),
                );
              })(),
          ),
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              { style: { fontSize: 11.5, fontWeight: 600, color: C.text, marginBottom: 5 } },
              tr("VAT %"),
            ),
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
            React.createElement(
              "select",
              {
                value: comboItemPick || "",
                onChange: (e) => {
                  const svc = comboAvailableCatalogItems.find(
                    (s) => String(serviceOptionServiceId(s)) === String(e.target.value),
                  );
                  if (svc) addComboCatalogItem(svc);
                },
                style: { ...inp(), width: 220 },
              },
              React.createElement("option", { value: "" }, tr("+ Add existing service...")),
              ...comboAvailableCatalogItems.map((s) =>
                React.createElement(
                  "option",
                  { key: serviceOptionServiceId(s), value: serviceOptionServiceId(s) },
                  serviceOptionName(s) || tr("Service #{0}", { 0: serviceOptionServiceId(s) }),
                ),
              ),
            ),
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
                  background: C.bgHighlight,
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
          : React.createElement(
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
                    svcOpts.some((s) => serviceNameKey(serviceOptionName(s)) === serviceNameKey(item.serviceName));
                  return React.createElement(
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
                          })
                        : React.createElement("span", { style: { color: C.text, fontSize: 12.5, fontFamily: FONT_MONO } }, formatMoneyByCurrency(item.basePrice || 0, selectedComboCurrency)),
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
            ),
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
            tr("Also save this combo to the shared catalog (created only if you finish creating this quotation). All custom services in it are saved too — services already in the catalog are simply reused."),
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
            background: C.bgHighlight,
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

  const hasUnsavedPickerInput = () => {
    if (
      showAdd &&
      (newSvc.name.trim() ||
        newSvc.serviceType.trim() ||
        newSvc.description.trim())
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
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        boxSizing: "border-box",
        zIndex: 1000,
        // Rendered as a plain fixed-position div (no portal), so it stays a
        // DOM descendant of the services-section wrapper that sets
        // pointerEvents:"none" while no Internal Company is picked yet —
        // CSS pointer-events inherits through fixed positioning, so
        // without resetting it here the whole modal silently stops
        // accepting clicks.
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
          maxWidth: mode === "combo" ? 760 : showAdd ? 520 : 700,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
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
        mode === "individual"
          ? React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 4 } },
              [
                [false, tr("Select from list")],
                [true, tr("Create new service")],
              ].map(([tabIsAdd, label]) =>
                React.createElement(
                  "button",
                  {
                    key: label,
                    type: "button",
                    onClick: () => {
                      setShowAdd(tabIsAdd);
                      setErrors({});
                    },
                    style: {
                      border: "none",
                      background: showAdd === tabIsAdd ? C.bgHighlight : "transparent",
                      color: showAdd === tabIsAdd ? C.primary : C.textSub,
                      fontWeight: showAdd === tabIsAdd ? 700 : 500,
                      fontSize: 13,
                      padding: "6px 12px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontFamily: FONT,
                    },
                  },
                  label,
                ),
              ),
            )
          : React.createElement(
              "span",
              { style: { fontWeight: 700, fontSize: 15, color: C.text, fontFamily: FONT } },
              comboTab === "create" ? tr("New Combo") : tr("Select Combo"),
            ),
        React.createElement(
          "span",
          {
            onClick: requestClosePicker,
            style: {
              cursor: "pointer",
              fontSize: 18,
              color: C.textSub,
              lineHeight: 1,
            },
          },
          tr("Close"),
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
        AntSegmented
          ? React.createElement(AntSegmented, {
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
      (!showAdd
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement(
              "div",
              {
                style: {
                  padding: "12px 20px",
                  borderBottom: `1px solid #f3f4f6`,
                  display: "flex",
                  gap: 10,
                  flexShrink: 0,
                },
              },
              React.createElement("input", {
                autoFocus: true,
                value: search,
                onChange: (e) => setSearch(e.target.value),
                placeholder: tr("Search service name..."),
                style: { ...inp(), flex: 1 },
                onFocus,
                onBlur,
              }),
              React.createElement(
                "div",
                {
                  onClick: () => setShowAdd(true),
                  style: {
                    padding: "8px 16px",
                    background: "#16a34a",
                    color: "#fff",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                    whiteSpace: "normal",
                    fontFamily: FONT,
                  },
                },
                tr("Create new"),
              ),
            ),
            React.createElement(
              "div",
              { style: { overflowY: "auto", overflowX: "auto", flex: 1 } },
              React.createElement(
                "table",
                { style: { width: "100%", minWidth: 640, borderCollapse: "collapse" } },
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
                    React.createElement("th", { style: thS() }, tr("Service Name")),
                    React.createElement(
                      "th",
                      { style: thS({ width: 130 }) },
                      tr("Type"),
                    ),
                    React.createElement(
                      "th",
                      { style: thS({ width: 160, textAlign: "right" }) },
                      tr("Unit Price"),
                    ),
                    React.createElement(
                      "th",
                      { style: thS({ width: 80, textAlign: "center" }) },
                      tr("Currency"),
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
                              "div",
                              null,
                              tr("No services found"),
                            ),
                            React.createElement(
                              "span",
                              {
                                onClick: () => setShowAdd(true),
                                style: {
                                  color: C.primary,
                                  cursor: "pointer",
                                  fontSize: 12,
                                  textDecoration: "underline",
                                },
                              },
                              tr("Create now"),
                            ),
                          ),
                        ),
                      )
                    : filtered.map((s, i) => {
                        const svcId = serviceOptionServiceId(s);
                        const isUsed = selectedIds.includes(String(svcId));
                        const svcName =
                          serviceOptionName(s) || tr("Service #{0}", { 0: svcId || s.id });
                        const price = serviceOptionPrice(s);
                        const svcType = serviceOptionType(s);
                        const description = serviceOptionDescription(s);
                        const serviceCurrency =
                          serviceOptionCurrency(
                            s,
                            currencies,
                            defaultCurrencyId,
                          ) ||
                          findCurrencyById(currencies, defaultCurrencyId) ||
                          defaultCurrencyObject();
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
                                  id: svcId,
                                  serviceName: svcName,
                                  basePrice: price,
                                  currencyId:
                                    extractCurrencyId(serviceCurrency) ||
                                    getRecordCurrencyId(s) ||
                                    defaultCurrencyId,
                                  currency: serviceCurrency,
                                  description,
                                  serviceType: svcType,
                                  catalogService:
                                    s.service || s.services || null,
                                  catalogServiceId: svcId,
                                  catalogBasePrice: price,
                                  vat: serviceOptionVat(s),
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
                              }),
                            },
                            i + 1,
                          ),
                          React.createElement(
                            "td",
                            { style: tdS({ fontWeight: 500 }) },
                            React.createElement("div", null, svcName),
                            description &&
                              React.createElement(
                                "div",
                                {
                                  style: {
                                    fontSize: 11.5,
                                    color: C.textSub,
                                    marginTop: 2,
                                    whiteSpace: "normal",
                                    lineHeight: "17px",
                                  },
                                },
                                description,
                              ),
                          ),
                          React.createElement(
                            "td",
                            { style: tdS() },
                            svcType
                              ? React.createElement(
                                  "span",
                                  {
                                    style: {
                                      fontSize: 11,
                                      background: "#eff6ff",
                                      color: "#1d4ed8",
                                      padding: "2px 8px",
                                      borderRadius: 10,
                                    },
                                  },
                                  svcType,
                                )
                              : React.createElement(
                                  "span",
                                  { style: { color: "#d1d5db" } },
                                  "—",
                                ),
                          ),
                          React.createElement(
                            "td",
                            { style: tdS({ textAlign: "right" }) },
                            React.createElement("div", null, formatMoneyByCurrency(price, serviceCurrency), catalogVndText(s, serviceCurrency) && React.createElement("div", { style: { fontSize: 11, color: "rgba(0, 0, 0, 0.45)", fontWeight: 400 } }, catalogVndText(s, serviceCurrency))),
                          ),
                          React.createElement(
                            "td",
                            {
                              style: tdS({
                                textAlign: "center",
                                fontFamily: FONT_MONO,
                                fontSize: 11.5,
                                color: C.textSub,
                              }),
                            },
                            getCurrencyCode(serviceCurrency),
                          ),
                          React.createElement(
                            "td",
                            { style: tdS({ textAlign: "center" }) },
                            isUsed
                              ? React.createElement(
                                  "span",
                                  {
                                    title: tr("Selected"),
                                    style: {
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      width: 26,
                                      height: 26,
                                      borderRadius: "50%",
                                      background: "#ecfdf5",
                                      border: `1px solid ${C.success}33`,
                                      color: C.success,
                                    },
                                  },
                                  React.createElement(
                                    "svg",
                                    {
                                      width: 15,
                                      height: 15,
                                      viewBox: "0 0 24 24",
                                      fill: "none",
                                      stroke: "currentColor",
                                      strokeWidth: 2.4,
                                      strokeLinecap: "round",
                                      strokeLinejoin: "round",
                                      "aria-hidden": "true",
                                    },
                                    React.createElement("path", {
                                      d: "M20 6 9 17l-5-5",
                                    }),
                                  ),
                                )
                              : React.createElement(
                                  "div",
                                  {
                                    style: {
                                      display: "inline-block",
                                      padding: "3px 12px",
                                      borderRadius: 4,
                                      background: C.primary,
                                      color: "#fff",
                                      fontSize: 12,
                                      fontWeight: 600,
                                      fontFamily: FONT,
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
          )
        : React.createElement(
            React.Fragment,
            null,
            React.createElement(
              "div",
              { style: { overflowY: "auto", flex: 1, padding: "20px 24px" } },
              [
                [
                  {
                    key: "name",
                    label: tr("Service Name"),
                    req: true,
                    type: "input",
                    placeholder: tr("e.g., Labor contract consulting..."),
                  },
                  {
                    key: "serviceType",
                    label: tr("Service Type"),
                    req: false,
                    type: "input",
                    placeholder: tr("e.g., Consulting, Legal..."),
                    hint: "optional",
                  },
                ],
                [
                  {
                    key: "price",
                    label: tr("Unit Price"),
                    req: true,
                    type: "price_currency",
                  },
                ],
                [
                  {
                    key: "vat",
                    label: tr("VAT (%)"),
                    req: false,
                    type: "vat",
                    hint: "optional",
                  },
                ],
                [
                  {
                    key: "description",
                    label: tr("Description"),
                    req: false,
                    type: "textarea",
                    placeholder: tr("Scope of work, notes..."),
                    hint: "optional",
                  },
                ],
              ].map((row, rowIdx) =>
                React.createElement(
                  "div",
                  {
                    key: rowIdx,
                    style: { display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 },
                  },
                  ...row.map((f) =>
                    React.createElement(
                      "div",
                      { key: f.key, style: { flex: "1 1 160px", minWidth: 0 } },
                      React.createElement(
                        Field,
                        { label: f.label, required: f.req, hint: f.hint },
                        f.type === "price_currency"
                          ? React.createElement(
                              "div",
                              { style: { display: "flex", gap: 8 } },
                              React.createElement(
                                "div",
                                { style: { flex: 1, minWidth: 0 } },
                                React.createElement(PriceInput, {
                                  value: newSvc.price,
                                  onChange: (v) => {
                                    setNewSvc({ ...newSvc, price: v });
                                    setErrors((p) => ({ ...p, price: "" }));
                                  },
                                  currency: findCurrencyById(currencies, newSvc.currencyId) || null,
                                }),
                              ),
                              React.createElement(
                                "div",
                                { style: { width: 130, flexShrink: 0 } },
                                React.createElement(
                                  "select",
                                  {
                                    value: newSvc.currencyId || "",
                                    onChange: (e) => {
                                      setNewSvc({
                                        ...newSvc,
                                        currencyId: e.target.value || "",
                                      });
                                      setErrors((p) => ({ ...p, currencyId: "" }));
                                    },
                                    style: {
                                      ...inp(),
                                      cursor: "pointer",
                                      ...(errors.currencyId
                                        ? { borderColor: C.danger }
                                        : {}),
                                    },
                                    disabled: !currencies.length,
                                  },
                                  React.createElement(
                                    "option",
                                    { value: "" },
                                    currencies.length ? tr("Currency") : tr("No currencies configured"),
                                  ),
                                  ...currencyOptions.map((option) =>
                                    React.createElement(
                                      "option",
                                      { key: option.value, value: option.value },
                                      option.label,
                                    ),
                                  ),
                                ),
                              ),
                            )
                          : f.type === "currency"
                          ? React.createElement(
                              "select",
                              {
                                value: newSvc.currencyId || "",
                                onChange: (e) => {
                                  setNewSvc({
                                    ...newSvc,
                                    currencyId: e.target.value || "",
                                  });
                                  setErrors((p) => ({ ...p, currencyId: "" }));
                                },
                                style: {
                                  ...inp(),
                                  cursor: "pointer",
                                  ...(errors[f.key]
                                    ? { borderColor: C.danger }
                                    : {}),
                                },
                                disabled: !currencies.length,
                              },
                              React.createElement(
                                "option",
                                { value: "" },
                                currencies.length
                                  ? tr("Select currency")
                                  : tr("No currencies configured"),
                              ),
                              ...currencyOptions.map((option) =>
                                React.createElement(
                                  "option",
                                  { key: option.value, value: option.value },
                                  option.label,
                                ),
                              ),
                            )
                          : f.type === "price"
                            ? React.createElement(PriceInput, {
                                value: newSvc.price,
                                onChange: (v) => {
                                  setNewSvc({ ...newSvc, price: v });
                                  setErrors((p) => ({ ...p, price: "" }));
                                },
                                currency: findCurrencyById(currencies, newSvc.currencyId) || null,
                              })
                            : f.type === "vat"
                              ? React.createElement("input", {
                                  type: "number",
                                  min: 0,
                                  max: 100,
                                  step: 1,
                                  value: newSvc.vat,
                                  onChange: (e) =>
                                    setNewSvc({
                                      ...newSvc,
                                      vat: parseFloat(e.target.value) || 0,
                                    }),
                                  style: inp(),
                                  onFocus,
                                  onBlur,
                                })
                              : f.type === "textarea"
                              ? React.createElement(AutoTextarea, {
                                  value: newSvc[f.key],
                                  onChange: (v) =>
                                    setNewSvc({ ...newSvc, [f.key]: v }),
                                  placeholder: f.placeholder,
                                  minRows: 3,
                                })
                              : React.createElement("input", {
                                  value: newSvc[f.key],
                                  onChange: (e) => {
                                    setNewSvc({
                                      ...newSvc,
                                      [f.key]: e.target.value,
                                    });
                                    setErrors((p) => ({ ...p, [f.key]: "" }));
                                  },
                                  placeholder: f.placeholder,
                                  style: {
                                    ...inp(),
                                    ...(errors[f.key]
                                      ? { borderColor: C.danger }
                                      : {}),
                                  },
                                  onFocus,
                                  onBlur,
                                }),
                        errors[f.key] &&
                          React.createElement(
                            "div",
                            {
                              style: {
                                color: C.danger,
                                fontSize: 11.5,
                                marginTop: 4,
                              },
                            },
                            errors[f.key],
                          ),
                      ),
                    ),
                  ),
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
                    background: isNameAlreadyInCatalog ? C.bgSection : "#e6f4ff",
                    border: `1px solid ${isNameAlreadyInCatalog ? C.border : "#91caff"}`,
                    cursor: isNameAlreadyInCatalog ? "default" : "pointer",
                    fontSize: 12.5,
                    color: C.text,
                  },
                },
                React.createElement("input", {
                  type: "checkbox",
                  checked: newSvc.saveToCatalog,
                  disabled: isNameAlreadyInCatalog,
                  onChange: (e) =>
                    setNewSvc({ ...newSvc, saveToCatalog: e.target.checked }),
                  style: { marginTop: 2, cursor: isNameAlreadyInCatalog ? "default" : "pointer" },
                }),
                React.createElement(
                  "span",
                  null,
                  isNameAlreadyInCatalog
                    ? tr("This name already exists in the shared catalog — it will be reused, not duplicated.")
                    : tr("Also save to the shared catalog (created only if you finish creating this quotation)."),
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
                  onClick: () => {
                    setShowAdd(false);
                    setErrors({});
                  },
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
                tr("Cancel"),
              ),
              React.createElement(
                "button",
                {
                  onClick: () => {
                    if (validate()) {
                      onAddNewService({
                        ...newSvc,
                        saveToCatalog: newSvc.saveToCatalog && !isNameAlreadyInCatalog,
                      });
                      setShowAdd(false);
                    }
                  },
                  style: {
                    padding: "8px 24px",
                    borderRadius: 6,
                    background: C.primary,
                    color: "#fff",
                    border: "none",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: FONT,
                  },
                },
                tr("Save & Select"),
              ),
            ),
          )),
      mode === "combo" &&
        (comboTab === "select" ? renderComboSelectTab() : renderComboCreateTab()),
    ),
  );
};

// ==================== SERVICES TABLE — CASE-STYLE DESIGN TOKENS ====================
// Ported from CaseCreateForm.js's services table (see
// docs/superpowers/specs/2026-08-17-services-table-case-createform-parity-design.md §3.5) —
// square, bordered icon buttons for the per-row edit-toggle and delete actions, and a minimal
// truncate/expand text component for read-only descriptions. Files in this repo cannot share
// modules, so these are literal copies scoped to ServicesTable, not imports.
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
          React.createElement("path", { key: "p1", d: "M12 20h9" }),
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

// Minimal truncate/expand for read-only description cells — matches
// CaseCreateForm.js's ExpandableText behavior without importing its code.
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

// ==================== SERVICES TABLE ====================
const ServicesTable = ({
  rows,
  svcOpts,
  onUpdate,
  onAddFromService,
  onDelete,
  companyId,
  onAddNewService,
  pricingMode,
  currencies = [],
  currencyOptions = [],
  selectedCurrency = null,
  packageSubTotal,
  packageVatRate,
  packageTotals,
  onPricingModeChange,
  onPackageChange,
  onCurrencyChange,
  combos = [],
  onApplyCombo,
  onApplyAdhocCombo,
  appliedCombos = [],
  onRemoveCombo,
  onUpdateComboAmount,
  onAddServiceToCombo,
}) => {
  const { Table } = ctx.antd;
  const [pickerOpen, setPickerOpen] = useState(false);
  // When set, the picker was opened via a specific combo section's own
  // "+ Add service" action rather than the top-level "Add service" button —
  // the picked/created service is tagged into that combo's section instead
  // of landing as an untagged row, and the picker's Individual/Combo mode
  // toggle is hidden (adding INTO an existing combo, not creating another).
  const [comboAddInstanceId, setComboAddInstanceId] = useState(null);
  // Line/Combo sync (2026-09-25): in Combo pricing with combos present, a
  // service added from the top-level "New service" goes into a combo the
  // user picks (default: the last one) instead of a loose line.
  const [addToComboTarget, setAddToComboTarget] = useState(null);
  const closePicker = () => {
    setPickerOpen(false);
    setComboAddInstanceId(null);
    setAddToComboTarget(null);
  };
  const [editingRows, setEditingRows] = useState({});
  const toggleRowEdit = (rowId) =>
    setEditingRows((p) => ({ ...p, [rowId]: !p[rowId] }));
  const [compareModal, setCompareModal] = useState({ open: false, data: null });
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [exchangeRates, setExchangeRates] = useState([]);
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
  const baseCurrency = selectedCurrency || findDefaultCurrency(currencies);
  const baseCurrencyId = extractCurrencyId(baseCurrency);
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
    const matched = pickConversionRate(comboRatesVnd, cur, vndCurrency);
    return matched?.rate > 0 ? { value: amt * matched.rate, ok: true } : { value: 0, ok: false };
  };
  const preliminarySummary = useMemo(
    () =>
      buildQuotationFinancialSummary({
        rows,
        currencies,
        baseCurrency,
        packageMode,
      }),
    [rows, currencies, baseCurrency, packageMode],
  );
  const rateCurrencyIds = useMemo(
    () =>
      getConversionSourceCurrencyIds(preliminarySummary.groups, baseCurrency),
    [preliminarySummary.groups, baseCurrency],
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
    fetchExchangeRatesForConversion(rateCurrencyIds, baseCurrencyId)
      .then((r) => {
        if (alive) setExchangeRates(r || []);
      })
      .catch(() => {
        if (alive) setExchangeRates([]);
      });
    return () => {
      alive = false;
    };
  }, [packageMode, rateCurrencyKey, baseCurrencyId]);
  const financialSummary = useMemo(
    () =>
      buildQuotationFinancialSummary({
        rows,
        currencies,
        baseCurrency,
        exchangeRates,
        packageMode,
      }),
    [rows, currencies, baseCurrency, exchangeRates, packageMode],
  );
  const hasMixedCurrencies = !packageMode && financialSummary.groups.length > 1;
  const needsConversion =
    !packageMode &&
    financialSummary.groups.some(
      (group) => !isSameCurrency(group.currency, baseCurrency),
    );
  const canShowTotals = packageMode || financialSummary.converted.canConvert;
  const getRowConversion = (rowCurrency, amounts) => {
    if (isSameCurrency(rowCurrency, baseCurrency)) {
      return { sameCurrency: true, canConvert: true, ...amounts };
    }
    const matched = pickConversionRate(
      exchangeRates,
      rowCurrency,
      baseCurrency,
    );
    if (!matched?.rate) return { sameCurrency: false, canConvert: false };
    return {
      sameCurrency: false,
      canConvert: true,
      rate: matched.rate,
      ...convertLinesToBase([amounts], matched.rate),
    };
  };

  // ── Review Changes helpers ──
  const compareFields = [
    { key: "serviceName", label: tr("Service Name"), type: "text" },
    { key: "description", label: tr("Description"), type: "text" },
    { key: "basePrice", label: tr("Unit Price"), type: "money" },
  ];
  const fmtCmpVal = (v, type) => {
    if (type === "money")
      return `${Number(v) || 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " ₫";
    const t = String(v ?? "").trim();
    return t || "—";
  };
  const normCmp = (v, type) => {
    if (type === "money") return String(Number(v) || 0);
    return String(v ?? "")
      .normalize("NFC")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };
  const getCatalog = (row) => {
    const rowServiceId = firstId(
      row.serviceId,
      row.service,
      row.services,
      row.catalogServiceId,
      row.catalogService,
    );
    const rowName = normalizeLookupText(row.serviceName);
    const direct = rowServiceId
      ? svcOpts.find(
          (s) => String(serviceOptionServiceId(s)) === String(rowServiceId),
        )
      : null;
    if (direct) {
      const fallbackService = row.catalogService || row.originalService || null;
      return fallbackService && !serviceOptionName(direct)
        ? { ...direct, service: fallbackService }
        : direct;
    }

    const byName = rowName
      ? svcOpts.find((s) => {
          const sameCompany =
            !companyId ||
            !serviceOptionCompanyId(s) ||
            String(serviceOptionCompanyId(s)) === String(companyId);
          return (
            sameCompany && normalizeLookupText(serviceOptionName(s)) === rowName
          );
        })
      : null;
    if (byName) return byName;

    if (row.catalogService || row.originalService) {
      return {
        serviceId: firstId(
          row.catalogServiceId,
          row.catalogService,
          row.originalService,
          row.serviceId,
        ),
        service: row.catalogService || row.originalService,
        serviceName:
          row.catalogServiceName || row.originalServiceName || row.serviceName,
        description: row.catalogDescription ?? row.originalDescription ?? "",
        price: row.catalogBasePrice ?? row.originalBasePrice ?? row.basePrice,
      };
    }
    return null;
  };
  const getCatalogVal = (cat, key) => {
    if (!cat) return "";
    if (key === "serviceName") return serviceOptionName(cat);
    if (key === "description") return serviceOptionDescription(cat);
    if (key === "basePrice") return serviceOptionPrice(cat);
    return "";
  };
  const getRowVal = (row, key) => {
    if (key === "serviceName") return row.serviceName || "";
    if (key === "description") return row.description || "";
    if (key === "basePrice") return row.basePrice ?? 0;
    return "";
  };
  const getCmpRows = (row) => {
    const cat = getCatalog(row);
    return compareFields.map((f) => {
      const original = getCatalogVal(cat, f.key);
      const quoted = getRowVal(row, f.key);
      return {
        key: f.key,
        field: f.label,
        type: f.type,
        original,
        quoted,
        catalogMissing: !cat,
        changed: !!cat && normCmp(original, f.type) !== normCmp(quoted, f.type),
      };
    });
  };

  const renderCmpList = () => {
    const { Table: AntTable, Tag } = ctx.antd;
    const tableRows = rows.map((row, idx) => {
      const cat = getCatalog(row);
      const diffRows = getCmpRows(row).filter((r) => r.changed);
      return {
        key: row._id,
        no: idx + 1,
        row,
        catalogMissing: !cat,
        serviceName: row.serviceName || tr("— not selected —"),
        originalName: cat ? getCatalogVal(cat, "serviceName") : "",
        changedCount: diffRows.length,
        changedLabels: diffRows.map((r) => r.field).join(", "),
      };
    });
    return React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        {
          style: {
            marginBottom: 12,
            padding: "8px 12px",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            background: C.bgSection,
            color: C.textSub,
            fontSize: 13,
            fontFamily: FONT,
          },
        },
        tr("Compare each service in the form with the company service catalog."),
      ),
      React.createElement(AntTable, {
        dataSource: tableRows,
        rowKey: "key",
        pagination: false,
        size: "small",
        bordered: true,
        scroll: { x: "max-content" },
        columns: [
          { title: tr("No."), dataIndex: "no", width: 54, align: "center" },
          {
            title: tr("Service in Quotation"),
            dataIndex: "serviceName",
            width: 230,
            render: (v) =>
              React.createElement(
                "div",
                {
                  style: {
                    fontWeight: 600,
                    color: C.text,
                    wordBreak: "break-word",
                    fontFamily: FONT,
                  },
                },
                v,
              ),
          },
          {
            title: tr("Catalog Service"),
            dataIndex: "originalName",
            width: 220,
            render: (v, row) =>
              row.catalogMissing
                ? React.createElement(
                    ctx.antd.Tag,
                    { color: "default" },
                    tr("No catalog"),
                  )
                : React.createElement(
                    "span",
                    { style: { wordBreak: "break-word", fontFamily: FONT } },
                    fmtCmpVal(v, "text"),
                  ),
          },
          {
            title: tr("Changes"),
            width: 220,
            render: (_, row) =>
              row.catalogMissing
                ? React.createElement(
                    ctx.antd.Tag,
                    { color: "default" },
                    tr("No catalog link"),
                  )
                : row.changedCount
                  ? React.createElement(
                      "div",
                      null,
                      React.createElement(
                        ctx.antd.Tag,
                        { color: "red" },
                        tr("{0} changed", { 0: row.changedCount }),
                      ),
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 12,
                            color: C.textSub,
                            marginTop: 4,
                            wordBreak: "break-word",
                            fontFamily: FONT,
                          },
                        },
                        row.changedLabels,
                      ),
                    )
                  : React.createElement(
                      ctx.antd.Tag,
                      { color: "green" },
                      tr("No change"),
                    ),
          },
          {
            title: tr("Detail"),
            width: 90,
            align: "center",
            render: (_, row) =>
              React.createElement(
                ctx.antd.Button,
                {
                  size: "small",
                  onClick: () => setCompareModal({ open: true, data: row.row }),
                },
                tr("View"),
              ),
          },
        ],
      }),
    );
  };

  const renderCmpDetail = (row) => {
    const { Table: AntTable, Tag } = ctx.antd;
    const cat = getCatalog(row);
    const cmpRows = getCmpRows(row);
    const changedRows = cmpRows.filter((r) => r.changed);
    return React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 16,
            padding: "12px 14px",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            background: C.bgSection,
          },
        },
        React.createElement(
          "div",
          { style: { minWidth: 0 } },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                color: C.textSub,
                marginBottom: 4,
                fontFamily: FONT,
              },
            },
            tr("Service in Quotation"),
          ),
          React.createElement(
            "div",
            {
              style: {
                fontSize: 16,
                fontWeight: 700,
                color: C.text,
                wordBreak: "break-word",
                fontFamily: FONT,
              },
            },
            row.serviceName || tr("— not selected —"),
          ),
        ),
        cat
          ? React.createElement(
              ctx.antd.Tag,
              {
                color: changedRows.length ? "red" : "green",
                style: { marginRight: 0 },
              },
              changedRows.length
                ? tr("{0} field(s) changed", { 0: changedRows.length })
                : tr("No change"),
            )
          : React.createElement(
              ctx.antd.Tag,
              { color: "default", style: { marginRight: 0 } },
              tr("No catalog service"),
            ),
      ),
      !cat &&
        React.createElement(
          "div",
          {
            style: {
              marginBottom: 12,
              padding: "8px 12px",
              border: "1px solid #fde68a",
              borderRadius: 6,
              background: "#fffbeb",
              color: "#92400e",
              fontSize: 13,
              fontFamily: FONT,
            },
          },
          tr("This service is not linked to a catalog service — no comparison data available."),
        ),
      React.createElement(AntTable, {
        dataSource: cmpRows,
        rowKey: "key",
        pagination: false,
        size: "small",
        bordered: true,
        rowClassName: (r) => (r.changed ? "" : ""),
        columns: [
          { title: tr("Field"), dataIndex: "field", width: 140 },
          {
            title: tr("Catalog (Original)"),
            dataIndex: "original",
            render: (v, r) =>
              React.createElement(
                "div",
                {
                  style: {
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: FONT,
                  },
                },
                fmtCmpVal(v, r.type),
              ),
          },
          {
            title: tr("Current in Form"),
            dataIndex: "quoted",
            render: (v, r) =>
              React.createElement(
                "div",
                {
                  style: {
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: FONT,
                  },
                },
                fmtCmpVal(v, r.type),
              ),
          },
          {
            title: tr("Status"),
            width: 110,
            align: "center",
            render: (_, r) =>
              r.catalogMissing
                ? React.createElement(
                    ctx.antd.Tag,
                    { color: "default" },
                    tr("No catalog"),
                  )
                : r.changed
                  ? React.createElement(
                      ctx.antd.Tag,
                      { color: "red" },
                      tr("Changed"),
                    )
                  : React.createElement(
                      ctx.antd.Tag,
                      { color: "green" },
                      tr("Same"),
                    ),
          },
        ],
      }),
    );
  };

  const selectedIds = useMemo(
    () =>
      rows
        .map((r) =>
          firstId(r.serviceId, r.service, r.services, r.catalogServiceId),
        )
        .filter(Boolean)
        .map(String),
    [rows],
  );

  const th = (ex = {}) => ({
    padding: "9px 12px",
    fontSize: 11.5,
    fontWeight: 600,
    color: C.textSub,
    background: C.bgSection,
    borderBottom: `2px solid ${C.border}`,
    whiteSpace: "normal",
    textAlign: "left",
    fontFamily: FONT,
    ...ex,
  });
  const td = (ex = {}) => ({
    padding: "8px 10px",
    fontSize: 13,
    borderBottom: `1px solid #f3f4f6`,
    verticalAlign: "top",
    fontFamily: FONT,
    ...ex,
  });

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

  const renderQuotationServicesSummary = () =>
    rows.length > 0
      ? React.createElement(
          "div",
          {
            style: {
              borderTop: `2px solid ${C.border}`,
              padding: "14px 20px",
              background: C.bgSection,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            },
          },
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 } },
            !packageMode &&
              (hasMixedCurrencies || needsConversion) &&
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => setBreakdownOpen(true),
                  style: {
                    border: `1px solid ${C.borderFocus}`,
                    background: C.bgHighlight,
                    color: C.primary,
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    fontFamily: FONT,
                    cursor: "pointer",
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
                    marginTop: 8,
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
                tr("Missing exchange rate ({0}) — the total is not final.", { 0: formatMissingRatePairs(financialSummary.missing, baseCurrency) }),
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
                      React.createElement(PriceInput, {
                        value: packageSubTotal,
                        onChange: (v) => onPackageChange("packageSubTotal", v),
                      }),
                    ),
                  ),
                  React.createElement(
                    "div",
                    { key: "vatRate", style: summaryRowStyle(true) },
                    React.createElement("span", { style: summaryLabelStyle(false) }, tr("VAT (%):")),
                    React.createElement("input", {
                      type: "number",
                      min: 0,
                      max: 100,
                      step: 0.1,
                      value: packageVatRate,
                      onChange: (e) =>
                        onPackageChange("packageVatRate", parseFloat(e.target.value) || 0),
                      style: inp({ textAlign: "right", fontWeight: 700, width: 100 }),
                      onFocus,
                      onBlur,
                    }),
                  ),
                  React.createElement(
                    "div",
                    { key: "vatAmount", style: summaryRowStyle(true) },
                    React.createElement("span", { style: summaryLabelStyle(false) }, tr("VAT amount:")),
                    React.createElement(
                      "span",
                      { style: summaryValueStyle("#d48806", false) },
                      formatMoneyByCurrency(packageTotals.vatAmount, baseCurrency),
                    ),
                  ),
                  React.createElement(
                    "div",
                    { key: "total", style: summaryRowStyle(false) },
                    React.createElement("span", { style: summaryLabelStyle(true) }, tr("Combo total:")),
                    React.createElement(
                      "span",
                      { style: summaryValueStyle("#389e0d", true) },
                      formatMoneyByCurrency(packageTotals.totalAmount, baseCurrency),
                    ),
                  ),
                ]
              : [
                  [
                    tr("Subtotal (excl. VAT)"),
                    canShowTotals
                      ? formatMoneyByCurrency(financialSummary.converted.subTotal, baseCurrency)
                      : "—",
                    C.text,
                    false,
                  ],
                  [
                    tr("VAT amount"),
                    canShowTotals
                      ? formatMoneyByCurrency(financialSummary.converted.vatAmount, baseCurrency)
                      : "—",
                    "#d48806",
                    false,
                  ],
                  [
                    tr("Total"),
                    canShowTotals
                      ? formatMoneyByCurrency(financialSummary.converted.totalAmount, baseCurrency)
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
        )
      : null;

  // One header <tr> (colSpan across all 7 columns) rendered right before the
  // first row of each applied-combo section, so combo-derived rows are
  // visually grouped and identifiable — with an inline "Remove combo"
  // action. Mirrors CaseCreateForm.js's renderComboSectionHeader.
  // Reference-only comparison against the combo's catalog definition — the
  // same figures the "Apply Combo" picker shows before applying, resurfaced
  // here so they stay visible once the package is on the quotation. Doesn't
  // affect combo.originalAmount, the actual per-instance amount charged.
  const getComboHeaderPriceComparison = (combo) => {
    const comboIdVal = extractId(combo?.comboId);
    if (!comboIdVal) return null;
    const catalogCombo = combos.find((c) => extractId(c.id) === comboIdVal);
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

  // A package row's own basePrice is always 0 — this looks up what that one
  // line would cost standalone, from the combo catalog snapshot (matched via
  // the row's own _comboCatalogId + serviceId), purely for display.
  const getComboLineIndividualPrice = (row) => {
    // Use the applied item's snapshot first (checked before the combo/id
    // lookups below, so this also covers ad-hoc combos, which have no
    // _comboCatalogId at all) — so later catalog edits don't rewrite what
    // the user saw when selecting this combo, and reloaded rows aren't left
    // to a re-match that can silently pair up the wrong item (see below).
    if (row?._comboItemSnapshot) return row._comboItemSnapshot;
    const comboIdVal = extractId(row?._comboCatalogId);
    if (!comboIdVal) return null;
    const catalogCombo = combos.find((c) => extractId(c.id) === comboIdVal);
    if (!catalogCombo) return null;
    const svcIdVal = extractId(row?.serviceId);
    // Match on the direct serviceComboItems.serviceId FK first — the
    // nested "services" relation frequently fails to resolve, and matching
    // on it.services?.id alone let two items with an unresolved relation
    // collide (both compare as undefined), silently pairing this row with
    // the WRONG item's price.
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
        currencyFromRecord(catalogCombo, currencies, defaultCurrencyObject()),
      ),
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
          { style: { display: "flex", flexDirection: "column", gap: 8 } },
          // Top row: what this combo is — name label only, matching
          // ContractServices.js's/QuotationServices.js's renderComboHeaderBar
          // (name on its own row, price info stacked below it) instead of
          // squeezing the name and every price figure onto one line.
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0, flexWrap: "wrap" } },
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
          // Bottom row: pricing on the left, actions pinned to the right.
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
              { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
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
                      onChange: (v) => onUpdateComboAmount?.(instanceId, v),
                    }),
                  ),
                ),
              priceComparison &&
                React.createElement(
                  "span",
                  { style: { fontSize: 11.5, color: C.textSub } },
                  tr("Individual price: {0}", { 0: formatMoneyByCurrency(priceComparison.individualTotal, priceComparison.currency) }),
                ),
              priceComparison && priceComparison.savings > 0 &&
                React.createElement(
                  "span",
                  { style: { fontSize: 11.5, color: C.success, fontWeight: 600 } },
                  tr("Save {0} ({1}%)", { 0: formatMoneyByCurrency(priceComparison.savings, priceComparison.currency), 1: priceComparison.savingsPct }),
                ),
            ),
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 } },
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
      ),
    );
  };

  return React.createElement(
    "div",
    {
      style: {
        position: "relative",
        opacity: companyId ? 1 : 0.5,
        pointerEvents: companyId ? "auto" : "none",
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      },
    },
    !companyId &&
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
          tr("Please select Internal Company first"),
        ),
      ),

    pickerOpen &&
      React.createElement(ServicePickerModal, {
        svcOpts,
        selectedIds,
        companyId,
        currencies,
        currencyOptions,
        defaultCurrencyId: extractCurrencyId(selectedCurrency),
        comboScopeId: comboAddInstanceId,
        comboTargets: packageMode ? comboTargets : [],
        comboTarget: addToComboTarget,
        onComboTargetChange: setAddToComboTarget,
        onSelect: (svc) => {
          const svcPayload = {
            serviceId: svc.id,
            basePrice: packageMode ? 0 : svc.basePrice,
            currencyId: svc.currencyId || extractCurrencyId(selectedCurrency),
            currency: svc.currency || selectedCurrency,
            serviceName: svc.serviceName,
            description: svc.description,
            serviceType: svc.serviceType || "",
            catalogService: svc.catalogService || null,
            catalogServiceId: svc.catalogServiceId || svc.id,
            catalogBasePrice: svc.catalogBasePrice ?? svc.basePrice,
            vat: packageMode ? 0 : (svc.vat ?? svc.vatRate ?? 0),
          };
          if (comboAddInstanceId) {
            onAddServiceToCombo(comboAddInstanceId, svcPayload);
          } else if (addToComboTarget && packageMode) {
            onAddServiceToCombo(addToComboTarget, svcPayload);
          } else {
            onAddFromService(svcPayload);
          }
          closePicker();
        },
        onClose: closePicker,
        onAddNewService: (data) => {
          onAddNewService(data).then((s) => {
            const svcPayload = {
              serviceId: s.id,
              basePrice: packageMode ? 0 : s.basePrice,
              currencyId: s.currencyId || extractCurrencyId(selectedCurrency),
              currency: s.currency || selectedCurrency,
              serviceName: s.serviceName,
              description: s.description,
              serviceType: s.serviceType || "",
              catalogService: s.catalogService || null,
              catalogServiceId: s.catalogServiceId || s.id,
              catalogBasePrice: s.catalogBasePrice ?? s.basePrice,
              vat: packageMode ? 0 : (s.vat ?? VAT_DEFAULT),
              saveToCatalog: !!s.saveToCatalog,
            };
            if (comboAddInstanceId) {
              onAddServiceToCombo(comboAddInstanceId, svcPayload);
            } else if (addToComboTarget && packageMode) {
              onAddServiceToCombo(addToComboTarget, svcPayload);
            } else {
              onAddFromService(svcPayload);
            }
            closePicker();
          });
        },
        combos,
        convertComboAmountToVndSync,
        vndCurrency,
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
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              borderRadius: 6,
              background: C.bgHighlight,
              color: C.primary,
              flexShrink: 0,
            },
          },
          React.createElement(
            "svg",
            {
              width: 13,
              height: 13,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: 2.4,
              strokeLinecap: "round",
              strokeLinejoin: "round",
            },
            React.createElement("line", { x1: 8, y1: 6, x2: 21, y2: 6 }),
            React.createElement("line", { x1: 8, y1: 12, x2: 21, y2: 12 }),
            React.createElement("line", { x1: 8, y1: 18, x2: 21, y2: 18 }),
            React.createElement("line", { x1: 3, y1: 6, x2: 3.01, y2: 6 }),
            React.createElement("line", { x1: 3, y1: 12, x2: 3.01, y2: 12 }),
            React.createElement("line", { x1: 3, y1: 18, x2: 3.01, y2: 18 }),
          ),
        ),
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
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, alignItems: "center" } },
        AntButton
          ? React.createElement(
              AntButton,
              {
                size: "small",
                disabled: rows.length <= 0,
                onClick: () => setCompareModal({ open: true, data: null }),
              },
              tr("Review Changes"),
            )
          : React.createElement(
              "div",
              {
                onClick:
                  rows.length > 0
                    ? () => setCompareModal({ open: true, data: null })
                    : undefined,
                style: {
                  padding: "5px 14px",
                  borderRadius: 6,
                  border: `1px solid ${C.border}`,
                  color: rows.length > 0 ? C.primary : C.textSub,
                  cursor: rows.length > 0 ? "pointer" : "not-allowed",
                  fontSize: 12.5,
                  fontWeight: 600,
                  fontFamily: FONT,
                  opacity: rows.length > 0 ? 1 : 0.5,
                },
              },
              tr("Review Changes"),
            ),
        AntButton
          ? React.createElement(
              AntButton,
              {
                size: "small",
                onClick: openTopLevelPicker,
                style: { borderStyle: "dashed" },
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
                  color: C.primary,
                  cursor: "pointer",
                  fontSize: 12.5,
                  fontWeight: 600,
                  fontFamily: FONT,
                },
              },
              tr("New service"),
            ),
      ),
    ),

    React.createElement(
      "div",
      {
        style: {
          padding: "14px 16px",
          borderBottom: `1px solid ${C.border}`,
          background: "#fff",
          display: "grid",
          gridTemplateColumns: "minmax(220px, 330px) minmax(0, 1fr)",
          gap: 14,
          alignItems: "start",
          width: "100%",
          boxSizing: "border-box",
          overflow: "hidden",
        },
      },
      React.createElement(
        "div",
        { style: { minWidth: 0 } },
        React.createElement(
          "div",
          {
            style: {
              fontSize: 11.5,
              fontWeight: 700,
              color: C.textSub,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              fontFamily: FONT,
            },
          },
          tr("Pricing Mode"),
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              border: AntSegmented ? "none" : `1px solid ${C.border}`,
              borderRadius: AntSegmented ? 0 : 7,
              overflow: "hidden",
              maxWidth: 330,
              width: "100%",
              minWidth: 0,
            },
          },
          AntSegmented
            ? React.createElement(AntSegmented, {
                block: true,
                value: pricingMode,
                onChange: onPricingModeChange,
                options: [
                  { value: PRICING_MODE_LINE, label: tr("Line pricing") },
                  { value: PRICING_MODE_PACKAGE, label: tr("Combo pricing") },
                ],
                style: { width: "100%" },
              })
            : [
                [PRICING_MODE_LINE, tr("Line pricing")],
                [PRICING_MODE_PACKAGE, tr("Combo pricing")],
              ].map(([mode, label]) =>
                React.createElement(
                  "button",
                  {
                    key: mode,
                    type: "button",
                    onClick: () => onPricingModeChange(mode),
                    style: {
                      border: "none",
                      borderRight:
                        mode === PRICING_MODE_LINE
                          ? `1px solid ${C.border}`
                          : "none",
                      background: pricingMode === mode ? C.primary : "#fff",
                      color: pricingMode === mode ? "#fff" : C.text,
                      padding: "8px 14px",
                      fontSize: 12.5,
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

    React.createElement(
      "div",
      { style: { overflowX: "auto" } },
      React.createElement(
        "table",
        { style: { width: "100%", borderCollapse: "collapse", minWidth: 970 } },
        React.createElement(
          "thead",
          null,
          React.createElement(
            "tr",
            null,
            React.createElement("th", { style: th({ width: 36, textAlign: "center" }) }, "#"),
            React.createElement("th", { style: th({ minWidth: 280 }) }, tr("Service Name & Type")),
            React.createElement("th", { style: th({ minWidth: 320 }) }, tr("Description")),
            React.createElement("th", { style: th({ width: 220, textAlign: "right" }) }, tr("Unit Price")),
            React.createElement("th", { style: th({ width: 80, textAlign: "center" }) }, tr("VAT (%)")),
            React.createElement("th", { style: th({ width: 160, textAlign: "right", color: "#1d4ed8" }) }, tr("Total")),
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
                  { colSpan: 7, style: td({ textAlign: "center", color: "#9ca3af", padding: "32px 0" }) },
                  tr("No services added — click \"New service\""),
                ),
              )
            : rows.map((r, idx) => {
                const isRowEdit = !!editingRows[r._id];
                const rowCurrency =
                  findCurrencyById(currencies, r.currencyId) ||
                  currencyFromRecord(r, currencies, selectedCurrency);
                const line = packageMode
                  ? calcLine(0, 1, 0, rowCurrency)
                  : calcLine(r.basePrice, 1, r.vat, rowCurrency);
                const rowConversion = !packageMode ? getRowConversion(rowCurrency, line) : null;
                // The "#" column numbers rows per section (combo instance,
                // or the contiguous run of non-combo rows) instead of
                // across the whole table — walk backward while the
                // previous row shares the same _comboInstanceId (or is
                // also non-combo). A combo section header renders right
                // before the first row of that section. See
                // CaseCreateForm.js's ProjectServicesTable for the same
                // pattern.
                let sectionRowIndex = 1;
                for (let j = idx - 1; j >= 0; j--) {
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
                // Section grouping is adjacency-based (no closing marker), so
                // a plain row landing right after a combo's last row would
                // otherwise render with no visual boundary, reading as if it
                // were still part of that combo above.
                const isLeavingComboSection = !r._comboInstanceId && idx > 0 && !!rows[idx - 1]._comboInstanceId;

                return [
                  comboSectionHeader,
                  React.createElement(
                  "tr",
                  { key: r._id, style: isLeavingComboSection ? { borderTop: "2px solid #91caff" } : undefined },
                  React.createElement(
                    "td",
                    { style: td({ textAlign: "center", color: C.textSub, fontSize: 12, fontWeight: 600 }) },
                    sectionRowIndex,
                  ),
                  React.createElement(
                    "td",
                    { style: td() },
                    isRowEdit
                      ? React.createElement(
                          "div",
                          { style: { display: "grid", gap: 6 } },
                          React.createElement("input", {
                            value: r.serviceName || "",
                            onChange: (e) => onUpdate(r._id, "serviceName", e.target.value),
                            placeholder: tr("Service name..."),
                            style: inp({ fontSize: 13.5, padding: "6px 9px" }),
                          }),
                          React.createElement("input", {
                            value: r.serviceType || "",
                            onChange: (e) => onUpdate(r._id, "serviceType", e.target.value),
                            placeholder: tr("Service type..."),
                            style: inp({ fontSize: 12.5, padding: "5px 9px" }),
                          }),
                        )
                      : React.createElement(
                          "div",
                          { style: { display: "flex", flexDirection: "column", gap: 4 } },
                          React.createElement(
                            "span",
                            { style: { fontWeight: 600, color: r.serviceId ? C.text : C.textSub, whiteSpace: "normal", overflowWrap: "anywhere" } },
                            r.serviceName || "—",
                          ),
                          r.serviceType &&
                            React.createElement(
                              "span",
                              {
                                style: {
                                  alignSelf: "flex-start",
                                  fontSize: 10,
                                  background: "#eff6ff",
                                  color: "#1d4ed8",
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                  fontWeight: 500,
                                  lineHeight: "14px",
                                },
                              },
                              r.serviceType,
                            ),
                        ),
                  ),
                  React.createElement(
                    "td",
                    { style: td() },
                    isRowEdit
                      ? React.createElement(AutoTextarea, {
                          value: r.description || "",
                          onChange: (v) => onUpdate(r._id, "description", v),
                          placeholder: tr("Service scope or row note..."),
                          minRows: 2,
                        })
                      : React.createElement(ExpandableText, { text: r.description, limit: 100 }),
                  ),
                  React.createElement(
                    "td",
                    { style: td({ textAlign: "right" }) },
                    packageMode
                      ? (() => {
                          // Same standalone-price lookup used by the Service
                          // Combo config screen's own Base Price column —
                          // shown here instead of the "Included in combo"
                          // label so the per-line discount is visible.
                          const individual = getComboLineIndividualPrice(r);
                          return React.createElement(
                            "div",
                            { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 } },
                            individual
                              ? React.createElement(
                                  "span",
                                  { style: { fontSize: 13, fontWeight: 700, color: C.text } },
                                  formatMoneyByCurrency(individual.price, individual.currency),
                                )
                              : React.createElement(
                                  "span",
                                  { style: { display: "inline-block", padding: "4px 8px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: "#e6f4ff", color: C.primary } },
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
                      : isRowEdit
                        ? React.createElement(
                            "div",
                            { style: { display: "flex", gap: 6 } },
                            React.createElement(
                              "div",
                              { style: { flex: 1, minWidth: 0 } },
                              React.createElement(PriceInput, {
                                value: r.basePrice,
                                onChange: (v) => onUpdate(r._id, "basePrice", v),
                                currency: rowCurrency,
                              }),
                            ),
                            React.createElement(
                              "select",
                              {
                                value: r.currencyId || "",
                                onChange: (e) => onUpdate(r._id, "currencyId", e.target.value || null),
                                style: { ...inp({ padding: "6px 6px" }), cursor: "pointer", fontWeight: 700, textAlign: "center", width: 84, flexShrink: 0 },
                                disabled: !currencies.length,
                                title: currencySelectLabel(rowCurrency),
                              },
                              !currencyOptions.some((option) => String(option.value) === String(r.currencyId || "")) &&
                                React.createElement("option", { value: "" }, getCurrencyCode(rowCurrency)),
                              ...currencyOptions.map((option) =>
                                React.createElement("option", { key: option.value, value: option.value }, option.label),
                              ),
                            ),
                          )
                        : React.createElement(
                            "span",
                            { style: { fontWeight: 700, color: C.text } },
                            formatMoneyByCurrency(r.basePrice || 0, rowCurrency),
                          ),
                  ),
                  React.createElement(
                    "td",
                    { style: td({ textAlign: "center" }) },
                    packageMode
                      ? React.createElement("span", { style: { color: C.textSub, fontSize: 12.5 } }, "0%")
                      : isRowEdit
                        ? React.createElement(
                            "div",
                            { style: { display: "flex", alignItems: "center", gap: 2, justifyContent: "center" } },
                            React.createElement("input", {
                              type: "number",
                              min: 0,
                              max: 100,
                              step: 1,
                              value: r.vat,
                              onChange: (e) => onUpdate(r._id, "vat", parseFloat(e.target.value) || 0),
                              style: { border: `1px solid ${C.border}`, borderRadius: 5, padding: "5px 4px", fontSize: 13.5, outline: "none", textAlign: "right", width: 46, fontFamily: FONT },
                            }),
                            React.createElement("span", { style: { fontSize: 12, color: C.textSub } }, "%"),
                          )
                        : React.createElement("span", { style: { fontSize: 12.5, color: C.text } }, `${r.vat || 0}%`),
                  ),
                  React.createElement(
                    "td",
                    { style: td({ textAlign: "right", fontWeight: 700, color: "#1d4ed8", fontSize: 14, fontVariantNumeric: "tabular-nums" }) },
                    packageMode
                      ? "—"
                      : rowConversion?.canConvert
                        ? React.createElement(
                            "div",
                            { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 } },
                            React.createElement(
                              "span",
                              null,
                              formatMoneyByCurrency(
                                rowConversion.sameCurrency ? line.totalAmount : rowConversion.totalAmount,
                                baseCurrency,
                              ),
                            ),
                            !rowConversion.sameCurrency &&
                              React.createElement(
                                "span",
                                { style: { color: C.textSub, fontSize: 10.5, fontWeight: 600 } },
                                tr("Original: {0}", { 0: formatMoneyByCurrency(line.totalAmount, rowCurrency) }),
                              ),
                          )
                        : React.createElement(
                            "div",
                            { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 } },
                            React.createElement("span", null, formatMoneyByCurrency(line.totalAmount, rowCurrency)),
                            React.createElement(
                              "span",
                              { style: { color: "#d48806", fontSize: 10.5, fontWeight: 700 } },
                              tr("Missing rate to {0}", { 0: getCurrencyCode(baseCurrency) }),
                            ),
                          ),
                  ),
                  React.createElement(
                    "td",
                    { style: td({ textAlign: "center" }) },
                    React.createElement(
                      "div",
                      { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6 } },
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
    renderQuotationServicesSummary(),

    React.createElement(
      Modal,
      {
        title: tr("Currency breakdown"),
        open: breakdownOpen,
        onCancel: () => setBreakdownOpen(false),
        footer: React.createElement(
          AntButton || "button",
          AntButton
            ? { type: "primary", onClick: () => setBreakdownOpen(false) }
            : { onClick: () => setBreakdownOpen(false) },
          tr("Close"),
        ),
        width: 900,
      },
      breakdownOpen &&
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            { style: { marginBottom: 12, color: C.textSub, fontSize: 12.5 } },
            tr("Base currency: {0}. Rates of today.", { 0: getCurrencyCode(baseCurrency) }),
          ),
        React.createElement(Table, {
          dataSource: currencyBreakdownRows(financialSummary.groups, {
            isBase: (group) => isSameCurrency(group.currency, baseCurrency),
            matchOf: (group) => pickConversionRate(exchangeRates, group.currency, baseCurrency),
            codeOf: getCurrencyCode,
            convert: convertLinesToBase,
          }),
          rowKey: "key",
          pagination: false,
          size: "small",
          bordered: true,
          scroll: { x: 760 },
          columns: [
            { title: tr("Currency"), key: "currency", render: (_, item) => React.createElement("span", { style: { fontWeight: 700 } }, `${item.currencyCode} (${item.lineCount})`) },
            { title: tr("Original total"), key: "originalTotal", align: "right", render: (_, item) => formatMoneyByCurrency(item.originalTotal, item.currency) },
            {
              title: tr("Rate to ") + getCurrencyCode(baseCurrency),
              key: "rate",
              align: "right",
              render: (_, item) =>
                item.rate
                  ? item.rate.toLocaleString("en-US", { maximumFractionDigits: 6 })
                  : React.createElement("span", { style: { color: "#d48806" } }, tr("Missing")),
            },
            {
              title: tr("Converted total"),
              key: "converted",
              align: "right",
              render: (_, item) =>
                item.convertedTotal === null
                  ? "—"
                  : React.createElement("span", { style: { fontWeight: 700, color: "#389e0d" } }, formatMoneyByCurrency(item.convertedTotal, baseCurrency)),
            },
            { title: tr("Effective date"), key: "effectiveDate", render: (_, item) => (item.effectiveDate ? String(item.effectiveDate).slice(0, 10).split("-").reverse().join("/") : "—") },
            { title: tr("Source"), key: "source", render: (_, item) => item.source },
          ],
        }),
          financialSummary.converted.canConvert &&
            React.createElement(
              "div",
              { style: { marginTop: 12, padding: "10px 12px", borderRadius: 7, background: "#f6ffed", border: "1px solid #b7eb8f", display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" } },
              React.createElement("span", { style: { fontWeight: 700, color: C.text } }, tr("Converted total in ") + getCurrencyCode(baseCurrency)),
              React.createElement("span", { style: { fontWeight: 800, color: "#389e0d" } }, formatMoneyByCurrency(financialSummary.converted.totalAmount, baseCurrency)),
            ),
        ),
    ),

    React.createElement(
      Modal,
      {
        title: compareModal.data
          ? tr("Review Service Changes")
          : tr("Review All Service Changes"),
        open: compareModal.open,
        onCancel: () => setCompareModal({ open: false, data: null }),
        footer: React.createElement(
          "div",
          { style: { display: "flex", justifyContent: "flex-end", gap: 8 } },
          compareModal.data &&
            React.createElement(
              ctx.antd.Button,
              {
                onClick: () => setCompareModal({ open: true, data: null }),
              },
              tr("← Back to list"),
            ),
          React.createElement(
            ctx.antd.Button,
            {
              type: "primary",
              onClick: () => setCompareModal({ open: false, data: null }),
              style: { background: C.primary },
            },
            tr("Close"),
          ),
        ),
        width: 900,
      },
      compareModal.open &&
        (compareModal.data
          ? renderCmpDetail(compareModal.data)
          : renderCmpList()),
    ),
  );
};

const QuotationTutorialPanel = () => {
  const fromHelp = (keys) => keys.map((key) => [key, FIELD_HELP[key]]);
  const groups = [
    { title: tr("Related"), rows: fromHelp(["Internal Issuing Company", "Related Lead", "Related Customer", "Assigned Lawyer"]) },
    { title: tr("Quotation terms"), rows: fromHelp(["Payment Terms", "Quotation Template", "Valid Until", "Address"]) },
    { title: tr("Services"), rows: fromHelp(["Service Name", "Description", "Unit Price", "VAT %"]) },
    {
      title: tr("Totals"),
      rows: [
        ...fromHelp(["Subtotal", "VAT amount", "Total"]),
        [tr("Currencies"), tr("Each service keeps its own currency; totals are in VND at today's rate. View currency breakdown shows the rates used.")],
      ],
    },
  ];

  return React.createElement(
    "div",
    {
      style: {
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        background: C.bgSection,
        padding: 16,
      },
    },
    React.createElement(
      "div",
      {
        style: {
          fontSize: 14,
          fontWeight: 700,
          color: C.text,
          marginBottom: 8,
        },
      },
      tr("Quotation fields"),
    ),
    React.createElement(
      "div",
      {
        style: {
          fontSize: 12.5,
          color: C.textSub,
          lineHeight: "19px",
          marginBottom: 14,
        },
      },
      tr("What each field means. The quotation document itself is generated from the template."),
    ),
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          columnGap: 18,
          rowGap: 12,
          alignItems: "start",
        },
      },
      groups.map((group) =>
        React.createElement(
          "div",
          {
            key: group.title,
            style: {
              borderTop: `1px solid ${C.border}`,
              paddingTop: 12,
            },
          },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12.5,
                fontWeight: 700,
                color: C.text,
                marginBottom: 7,
              },
            },
            group.title,
          ),
          group.rows
            .filter(
              ([name]) =>
                !["Payment Terms", "Valid Until", "Address"].includes(name),
            )
            .map(([name, desc]) =>
              React.createElement(
                "div",
                { key: name, style: { marginTop: 8 } },
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: C.textLabel,
                      marginBottom: 2,
                    },
                  },
                  tr(name),
                ),
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 12.5,
                      color: C.textSub,
                      lineHeight: "19px",
                    },
                  },
                  desc,
                ),
              ),
            ),
        ),
      ),
    ),
  );
};

// </ai-section>

// ==================== MAIN FORM ====================
// <ai-section name="main-form">
const QuotationCreateForm = () => {
  // <ai-section name="main-form-state">
  const [form, setForm] = useState({
    internalCompanyId: null,
    leadId: null,
    customerId: null,
    userId: null,
    lawyerId: null,
    assignedLawyerId: null,
    projectId: null,
    parentId: null,
    projectServiceId: null,
    quotationKind: "main",
    paymentTerms: "",
    validUntil: "",
    address: "",
    templateId: null,
    description: "",
    serviceDescription: "",
    currencyId: null,
    pricingMode: PRICING_MODE_LINE,
    packageSubTotal: 0,
    packageVatRate: VAT_DEFAULT,
    isRequiredApproval: false,
    approvedById: null,
  });

  const [rows, setRows] = useState([]);
  const lineModeBackupRef = useRef({});
  const [combos, setCombos] = useState([]);
  const [appliedCombos, setAppliedCombos] = useState([]);
  // Ad-hoc combos whose "Also save this combo to the shared catalog"
  // checkbox was checked - the actual serviceCombos/serviceComboItems
  // writes are deferred to handleSubmit's tail, same reasoning as the
  // per-row saveToCatalog flag.
  const [pendingComboCatalogSaves, setPendingComboCatalogSaves] = useState([]);

  useEffect(() => {
    ctx.api
      .request({
        url: "serviceCombos:list",
        params: {
          filter: JSON.stringify({ isActive: { $eq: true } }),
          appends: ["serviceComboItems.services", "serviceComboItems.currency"],
          // Explicit allowlist — omitting `fields` was silently dropping
          // serviceComboItems.price/vat/currencyId from the response (the
          // per-line snapshot fields), even though appends resolved the
          // services/currency relations fine. Matches CaseCreateForm.js's
          // own serviceCombos:list call, which needed the same fix.
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
        console.warn("[QuotationCreateForm] Could not fetch service combos:", error);
      });
  }, []);

  const [internalCompanies, setInternalCompanies] = useState([]);
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [svcOpts, setSvcOpts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const defaultCurrencyId = useMemo(
    () => extractCurrencyId(findDefaultCurrency(currencies)?.id),
    [currencies],
  );
  // The Currency field has been removed from the Services section (no more
  // manual override) — auto-populate form.currencyId with the default
  // currency (VND) once currencies load, so the "select Quotation Currency"
  // submit validation is satisfied without a picker.
  useEffect(() => {
    if (!form.currencyId && defaultCurrencyId) {
      setForm((p) => ({ ...p, currencyId: String(defaultCurrencyId) }));
    }
  }, [defaultCurrencyId]);
  const [lawyers, setLawyers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentLead, setCurrentLead] = useState(null);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [popupContext, setPopupContext] = useState(null);
  const isDirtyRef = useRef(false);
  const submittingRef = useRef(false);
  // Parked rows/appliedCombos/package totals for the pricing mode NOT
  // currently active, keyed by PRICING_MODE_LINE / PRICING_MODE_PACKAGE —
  // see handlePricingModeChange.
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
  const requestClose = useCallback(
    (nativeClose) => {
      if (submittingRef.current) return;
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
  // </ai-section>

  // <ai-section name="main-form-load-and-prefill">
  useEffect(() => {
    return configureGuardedModalClose(requestClose);
  }, [requestClose]);

  useEffect(() => {
    Promise.all([
      fetchAll("internalCompany:list"),
      fetchAll("companyServices:list", { appends: ["service"] }),
      fetchAll("services:list", {
      }),
      fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES),
      fetchAll("lead:list"),
      fetchAll("customers:list"),
      fetchAll("projects:list", {
        appends: ["customers", "customer", "internalCompany", "lawyer", "assignees"],
      }),
      fetchAll("template:list"),
      fetchAll("lawyers:list"),
      getCurrentUser(),
    ]).then(
      async ([
        comps,
        coSvcs,
        serviceCatalog,
        currs,
        lds,
        custs,
        projs,
        tmps,
        laws,
        user,
      ]) => {
        const selectableLawyers = filterSelectableLawyers(laws);
        const normalizedCurrencies = Array.isArray(currs) ? currs : [];
        const defaultCurrencyId = extractCurrencyId(
          findDefaultCurrency(normalizedCurrencies)?.id,
        );
        setInternalCompanies(comps);
        setCurrencies(normalizedCurrencies);
        setSvcOpts(
          enrichCompanyServices(coSvcs, serviceCatalog, normalizedCurrencies),
        );
        setLeads(lds);
        setCustomers(custs);
        setProjects(projs);
        setTemplates(tmps);
        setLawyers(selectableLawyers);
        setCurrentUser(user);
        const currentLawyerId = currentUserLawyerId(selectableLawyers, user);
        if (user?.id || currentLawyerId) {
          setForm((p) => ({
            ...p,
            userId:
              user?.id && !isSystemUserId(user.id) ? String(user.id) : p.userId,
            lawyerId: currentLawyerId
              ? p.lawyerId || String(currentLawyerId)
              : p.lawyerId,
            assignedLawyerId: currentLawyerId
              ? p.assignedLawyerId || String(currentLawyerId)
              : p.assignedLawyerId,
            currencyId:
              p.currencyId ||
              (defaultCurrencyId ? String(defaultCurrencyId) : p.currencyId),
          }));
        } else if (defaultCurrencyId) {
          setForm((p) => ({
            ...p,
            currencyId: p.currencyId || String(defaultCurrencyId),
          }));
        }

        const popupParams = getPopupParams();
        console.log(
          "[QuotationCreateForm] popupParams received:",
          safeJsonStringify(popupParams),
        );

        const match = window.location.pathname.match(/\/filterbytk\/(\d+)/i);
        const urlFilterByTk = match ? match[1] : ctx?.filterByTk || null;
        const hasCtxRecord =
          !!ctx.record &&
          typeof ctx.record === "object" &&
          Object.keys(ctx.record).length > 0;
        const hasPopupRecord =
          !!ctx.popup?.record &&
          typeof ctx.popup.record === "object" &&
          Object.keys(ctx.popup.record).length > 0;
        let urlContractRecord = null;
        let urlProjectRecord = null;
        if (!hasCtxRecord && !hasPopupRecord && urlFilterByTk) {
          if (
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
          if (!urlProjectRecord) {
            urlContractRecord = await fetchRecord(
              "contracts:get",
              urlFilterByTk,
            );
          }
        }

        const contextRecord = hasCtxRecord
          ? ctx.record
          : hasPopupRecord
            ? ctx.popup.record
            : urlContractRecord || {};
        const contextRecordKind = getContextRecordKind(contextRecord);
        const contextRecordId = extractId(contextRecord?.id);
        const contextProjectId = isProjectRecord(contextRecord)
          ? contextRecordId
          : null;
        const directCustomerId = recordCustomerId(contextRecord);
        const directLeadId = recordLeadId(contextRecord);
        const contextCompanyId = recordInternalCompanyId(contextRecord);
        const contextCustomerId = firstId(
          directCustomerId,
          contextRecordKind === "customer" ? contextRecordId : null,
        );
        const contextLeadId = contextCustomerId
          ? null
          : firstId(
              directLeadId,
              contextRecordKind === "lead" ? contextRecordId : null,
            );
        const hasContextParty = !!(contextLeadId || contextCustomerId);
        const popupProjectId =
          extractId(popupParams.projectId) ||
          extractId(popupParams.caseId) ||
          extractId(popupParams.sourceProjectId) ||
          contextProjectId ||
          extractId(urlProjectRecord?.id);
        debugQuotationContext("raw", {
          urlFilterByTk,
          urlContractRecordId: extractId(urlContractRecord?.id),
          urlProjectRecordId: extractId(urlProjectRecord?.id),
          recordId: contextRecordId,
          recordKeys: Object.keys(contextRecord || {})
            .slice(0, 30)
            .join(","),
          contextRecordKind,
          directCustomerId,
          directLeadId,
          contextCustomerId,
          contextLeadId,
          contextCompanyId,
          contextProjectId,
          popupProjectId,
        });

        const popupProjectServiceId = extractId(popupParams.projectServiceId);
        const rawPsIds =
          popupParams.projectServiceId || popupParams.projectServiceIds;
        const popupProjectServiceIds = [];
        if (rawPsIds) {
          if (Array.isArray(rawPsIds)) {
            popupProjectServiceIds.push(
              ...rawPsIds.map((id) => parseInt(id, 10)).filter(Boolean),
            );
          } else {
            const str = String(rawPsIds);
            if (str.includes(",")) {
              popupProjectServiceIds.push(
                ...str
                  .split(",")
                  .map((s) => parseInt(s.trim(), 10))
                  .filter(Boolean),
              );
            } else {
              const parsed = parseInt(str, 10);
              if (parsed) popupProjectServiceIds.push(parsed);
            }
          }
        }
        const popupParentQuotationId =
          extractId(popupParams.parentQuotationId) ||
          extractId(popupParams.mainQuotationId) ||
          extractId(popupParams.parentId);
        const popupQuotationMode = String(
          popupParams.quotationKind || popupParams.quotationMode || "",
        ).toLowerCase();
        const popupQuotationKind =
          popupQuotationMode === "supplement" ||
          popupQuotationMode === "sub" ||
          popupQuotationMode === "sub-quotation" ||
          popupParentQuotationId
            ? "supplement"
            : "main";

        let popupProject = null;
        let popupProjectService = null;
        let popupProjectServices = [];
        let popupParentQuotation = null;

        if (popupProjectId) {
          if (
            contextProjectId &&
            String(contextProjectId) === String(popupProjectId)
          ) {
            popupProject = contextRecord;
          } else if (
            urlProjectRecord &&
            String(extractId(urlProjectRecord?.id)) === String(popupProjectId)
          ) {
            popupProject = urlProjectRecord;
          } else {
            popupProject = await fetchRecord("projects:get", popupProjectId);
          }
        }
        if (popupProjectServiceIds.length > 0) {
          try {
            const psRes = await ctx.api.request({
              url: "projectServices:list",
              params: {
                filter: JSON.stringify({ id: { $in: popupProjectServiceIds } }),
                appends: ["services"],
                pageSize: 1000,
              },
            });
            popupProjectServices = psRes?.data?.data || [];
            if (popupProjectServices.length > 0) {
              popupProjectService = popupProjectServices[0];
            }
          } catch (e) {
            console.warn(
              "[QuotationCreateForm] Could not fetch projectServices:",
              e,
            );
          }
        } else if (popupProjectServiceId) {
          popupProjectService = await fetchRecord(
            "projectServices:get",
            popupProjectServiceId,
            {
              appends: ["services"],
            },
          );
        }
        if (popupParentQuotationId) {
          popupParentQuotation = await fetchRecord(
            "quotations:get",
            popupParentQuotationId,
          );
        }
        if (popupProject) {
          setProjects((prev) => mergeRecordById(prev, popupProject));
        }

        if (
          popupProjectId ||
          popupProjectServiceId ||
          popupProjectServiceIds.length > 0 ||
          popupParentQuotationId ||
          popupParams.customerId ||
          popupParams.internalCompanyId ||
          popupParams.lawyerId
        ) {
          const resolvedCustomerId = firstId(
            popupParams.customerId,
            popupProject?.customerId,
            popupProject?.customer,
            popupProject?.customers,
            popupParentQuotation?.customerId,
            popupParentQuotation?.customer,
            popupParentQuotation?.customers,
          );
          const resolvedCompanyId = firstId(
            popupParams.internalCompanyId,
            popupProject?.internalCompanyId,
            popupProject?.internalCompany,
            popupProject?.internalCompanies,
            popupParentQuotation?.internalCompanyId,
            popupParentQuotation?.internalCompany,
            popupParentQuotation?.internalCompanies,
          );
          const resolvedLawyerId = firstId(
            popupParams.lawyerId,
            popupProject?.lawyerId,
            popupProject?.lawyer,
            popupProject?.lawyers,
            popupProject?.assignedLawyerId,
            popupProject?.assignedLawyer,
            popupProject?.projectManagerId,
            popupProject?.projectManager,
            popupProject?.assignees,
            popupParentQuotation?.lawyerId,
            popupParentQuotation?.lawyer,
            popupParentQuotation?.lawyers,
          );

          console.log(
            "[QuotationCreateForm] resolved preloaded fields:",
            JSON.stringify({
              resolvedCustomerId,
              resolvedCompanyId,
              resolvedLawyerId,
            }),
          );

          if (resolvedCustomerId) {
            const foundCustomer = custs.find(
              (c) => String(c.id) === String(resolvedCustomerId),
            );
            if (foundCustomer) {
              console.log(
                "[QuotationCreateForm] Preloaded customer found in cache:",
                foundCustomer,
              );
              setCurrentCustomer(foundCustomer);
            } else {
              console.log(
                "[QuotationCreateForm] Preloaded customer not in cache, fetching asynchronously...",
              );
              const fetchedCust = await fetchRecord(
                "customers:get",
                resolvedCustomerId,
              );
              if (fetchedCust) {
                console.log(
                  "[QuotationCreateForm] Fetched preloaded customer:",
                  fetchedCust,
                );
                setCurrentCustomer(fetchedCust);
                setCustomers((prev) => mergeRecordById(prev, fetchedCust));
              }
            }
          }

          setPopupContext({
            project: popupProject,
            projectService: popupProjectService,
            parentQuotation: popupParentQuotation,
            params: popupParams,
          });

          const parentPackageMode = isPackagePricing(
            popupParentQuotation?.pricingMode,
          );
          const parentPackageSubTotal = parentPackageMode
            ? parseNum(
                popupParentQuotation?.packageSubTotal ??
                  popupParentQuotation?.subTotal,
              )
            : 0;
          const parentPackageVatRate =
            popupParentQuotation?.packageVatRate ??
            (parentPackageMode && popupParentQuotation?.subTotal
              ? (parseNum(popupParentQuotation?.vatAmount) * 100) /
                parseNum(popupParentQuotation?.subTotal)
              : null);

          setForm((p) => ({
            ...p,
            projectId: popupProjectId ? String(popupProjectId) : p.projectId,
            parentId: popupParentQuotationId
              ? String(popupParentQuotationId)
              : p.parentId,
            projectServiceId:
              popupProjectServiceIds.length > 0
                ? String(popupProjectServiceIds[0])
                : popupProjectServiceId
                  ? String(popupProjectServiceId)
                  : p.projectServiceId,
            quotationKind: popupQuotationKind,
            customerId: resolvedCustomerId
              ? String(resolvedCustomerId)
              : p.customerId,
            internalCompanyId: resolvedCompanyId
              ? String(resolvedCompanyId)
              : p.internalCompanyId,
            lawyerId: resolvedLawyerId ? String(resolvedLawyerId) : p.lawyerId,
            assignedLawyerId: resolvedLawyerId
              ? String(resolvedLawyerId)
              : p.assignedLawyerId,
            paymentTerms: popupParentQuotation?.paymentTerms || p.paymentTerms,
            validUntil: popupParentQuotation?.validUntil || p.validUntil,
            address: popupParentQuotation?.address || p.address,
            description: popupParentQuotation?.description || p.description,
            serviceDescription:
              popupParentQuotation?.serviceDescription || p.serviceDescription,
            pricingMode: popupParentQuotation?.pricingMode || p.pricingMode,
            packageSubTotal: parentPackageMode
              ? parentPackageSubTotal
              : p.packageSubTotal,
            packageVatRate: parentPackageVatRate ?? p.packageVatRate,
          }));

          const serviceId =
            extractId(popupProjectService?.serviceId) ||
            extractId(popupProjectService?.services) ||
            extractId(popupParams.serviceId);
          const serviceName =
            popupProjectService?.serviceName ||
            popupProjectService?.services?.serviceName ||
            popupProjectService?.name ||
            popupParams.serviceName ||
            "";
          if (popupProjectServices.length > 0) {
            const preloadedRows = popupProjectServices.map((ps, idx) => {
              const svcId = extractId(ps?.serviceId) || extractId(ps?.services);
              const svcName =
                ps?.serviceName || ps?.services?.serviceName || ps?.name || "";
              return {
                _id: Date.now() + idx,
                projectServiceId: extractId(ps.id),
                serviceId: svcId || null,
                serviceName: svcName,
                description: ps?.description || ps?.services?.description || "",
                quantity: 1,
                currencyId: getRecordCurrencyId(ps)
                  ? String(getRecordCurrencyId(ps))
                  : null,
                basePrice: Number(ps?.basePrice) || 0,
                vat: VAT_DEFAULT,
                catalogService: ps?.services || null,
                catalogServiceId: svcId || null,
                catalogBasePrice: ps?.services?.basePrice ?? null,
              };
            });
            setRows(preloadedRows);
          } else if (popupProjectServiceId && serviceName) {
            setRows([
              {
                _id: Date.now(),
                projectServiceId: popupProjectServiceId,
                serviceId: serviceId || null,
                serviceName,
                description:
                  popupProjectService?.description ||
                  popupProjectService?.services?.description ||
                  popupParams.description ||
                  "",
                quantity: 1,
                currencyId: getRecordCurrencyId(popupProjectService)
                  ? String(getRecordCurrencyId(popupProjectService))
                  : null,
                basePrice:
                  Number(
                    popupProjectService?.basePrice ?? popupParams.basePrice,
                  ) || 0,
                vat: VAT_DEFAULT,
                catalogService: popupProjectService?.services || null,
                catalogServiceId: serviceId || null,
                catalogBasePrice:
                  popupProjectService?.services?.basePrice ?? null,
              },
            ]);
          }
        }

        if (
          hasContextParty &&
          !popupProjectId &&
          !popupProjectServiceId &&
          popupProjectServiceIds.length === 0
        ) {
          if (contextLeadId) {
            debugQuotationContext("apply-lead", {
              contextLeadId,
              contextCompanyId,
            });
            const foundLead =
              lds.find((l) => String(l.id) === String(contextLeadId)) ||
              (contextRecordKind === "lead" ? contextRecord : null);
            if (foundLead) {
              setCurrentLead(foundLead);
              setLeads((prev) => mergeRecordById(prev, foundLead));
            }
            setForm((p) => ({
              ...p,
              leadId: String(contextLeadId),
              customerId: null,
              internalCompanyId: contextCompanyId
                ? String(contextCompanyId)
                : p.internalCompanyId,
            }));
          }
          if (contextCustomerId) {
            debugQuotationContext("apply-customer", {
              contextCustomerId,
              contextCompanyId,
              source: urlContractRecord
                ? "url-contract"
                : contextRecordKind || "record",
            });
            let foundCustomer =
              custs.find((c) => String(c.id) === String(contextCustomerId)) ||
              (contextRecordKind === "customer" ? contextRecord : null);
            if (!foundCustomer) {
              foundCustomer = await fetchRecord(
                "customers:get",
                contextCustomerId,
              );
            }
            if (foundCustomer) {
              setCurrentCustomer(foundCustomer);
              setCustomers((prev) => mergeRecordById(prev, foundCustomer));
            }
            setForm((p) => ({
              ...p,
              leadId: null,
              customerId: String(contextCustomerId),
              internalCompanyId: contextCompanyId
                ? String(contextCompanyId)
                : recordInternalCompanyId(foundCustomer)
                  ? String(recordInternalCompanyId(foundCustomer))
                  : p.internalCompanyId,
            }));
          }
        }

        const preferredCustomerId = firstId(
          ctx?.params?.customerId,
          ctx?.record?.customerId,
          ctx?.record?.customer,
          ctx?.record?.customers,
        );
        const preferredLeadId = preferredCustomerId
          ? null
          : firstId(
              ctx?.params?.leadId,
              ctx?.record?.leadId,
              ctx?.record?.lead,
              ctx?.record?.leads,
            );
        const urlId =
          preferredCustomerId ||
          preferredLeadId ||
          (match ? match[1] : ctx?.filterByTk || null);

        if (
          urlId &&
          !hasContextParty &&
          !popupProjectId &&
          !popupProjectServiceId &&
          popupProjectServiceIds.length === 0
        ) {
          let foundCust = preferredCustomerId
            ? custs.find((c) => String(c.id) === String(preferredCustomerId))
            : null;
          if (preferredCustomerId && !foundCust) {
            foundCust = await fetchRecord("customers:get", preferredCustomerId);
          }
          if (foundCust) {
            setCurrentCustomer(foundCust);
            const companyId = recordInternalCompanyId(foundCust);
            setCustomers((prev) => mergeRecordById(prev, foundCust));
            setForm((p) => ({
              ...p,
              leadId: null,
              customerId: String(foundCust.id),
              internalCompanyId: companyId
                ? String(companyId)
                : p.internalCompanyId,
            }));
          } else if (preferredLeadId) {
            const foundLead = lds.find(
              (l) => String(l.id) === String(preferredLeadId),
            );
            if (foundLead) {
              setCurrentLead(foundLead);
              const companyId = recordInternalCompanyId(foundLead);
              setForm((p) => ({
                ...p,
                leadId: String(foundLead.id),
                customerId: null,
                internalCompanyId: companyId
                  ? String(companyId)
                  : p.internalCompanyId,
              }));
            }
          } else {
            const foundLead = lds.find((l) => String(l.id) === String(urlId));
            if (foundLead) {
              setCurrentLead(foundLead);
              const companyId = recordInternalCompanyId(foundLead);
              setForm((p) => ({
                ...p,
                leadId: String(foundLead.id),
                customerId: null,
                internalCompanyId: companyId
                  ? String(companyId)
                  : p.internalCompanyId,
              }));
            } else {
              const fallbackCust = custs.find(
                (c) => String(c.id) === String(urlId),
              );
              if (fallbackCust) {
                setCurrentCustomer(fallbackCust);
                const companyId = recordInternalCompanyId(fallbackCust);
                setForm((p) => ({
                  ...p,
                  leadId: null,
                  customerId: String(fallbackCust.id),
                  internalCompanyId: companyId
                    ? String(companyId)
                    : p.internalCompanyId,
                }));
              }
            }
          }
        }
        setLoading(false);
      },
    );
  }, []);
  // </ai-section>

  // <ai-section name="main-form-derived-state-and-actions">
  const setF = useCallback(
    (k, v) => {
      markDirty();
      setForm((p) => ({ ...p, [k]: v }));
    },
    [markDirty],
  );

  // Toggle approval — reset approvedById khi tắt
  const toggleApproval = useCallback(() => {
    setForm((p) => ({
      ...p,
      isRequiredApproval: !p.isRequiredApproval,
      approvedById: !p.isRequiredApproval ? p.approvedById : null, // giữ nếu bật, clear nếu tắt
    }));
  }, []);

  const handleSelectTemplate = async (templateId) => {
    setF("templateId", templateId || null);
  };

  // templateKey classifies templates by module — actual enum values are
  // plural ("contracts" | "quotations" | "payroll" | "tasks" | "other",
  // confirmed live via JsField/DiagnoseContractTemplateFilter.js, 2026-09-22
  // — same bug found and fixed in ContractCreateForm.js's identical helper,
  // which was passing "contract" instead of "contracts"). This call site had
  // the same mismatch: "quotation" (singular) matched ZERO records tagged
  // "quotations". Templates without templateKey at all predate the field and
  // stay visible everywhere until manually tagged. The currently selected
  // template is always kept so editing an existing record never blanks it.
  const matchesTemplateModule = (t, key, selectedId) =>
    !t.templateKey || t.templateKey === key || String(t.id) === String(selectedId);

  const filteredTemplates = useMemo(
    () =>
      templates
        .filter((t) => matchesTemplateModule(t, "quotations", form.templateId))
        .filter(
          (t) =>
            !form.internalCompanyId ||
            !t.internalCompanyId ||
            String(t.internalCompanyId) === String(form.internalCompanyId),
        ),
    [templates, form.internalCompanyId, form.templateId],
  );

  const projectOptions = useMemo(
    () =>
      [...projects].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      ),
    [projects],
  );
  // The header is VND (INV-1): foreign-currency services are converted to it
  // for the services footer and the totals. There is no header currency
  // picker; it used to follow the parent quotation / the case.
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

  const packageTotals = useMemo(
    () => calcPackageTotals(form.packageSubTotal, form.packageVatRate, selectedCurrency),
    [form.packageSubTotal, form.packageVatRate, selectedCurrency],
  );

  const handlePricingModeChange = (mode) => {
    const nextMode = isPackagePricing(mode)
      ? PRICING_MODE_PACKAGE
      : PRICING_MODE_LINE;
    if (nextMode === form.pricingMode) return;
    // Each mode keeps its own rows/appliedCombos/package totals, parked in
    // this ref while the other mode is active — switching still keeps a
    // Line-priced quotation from mixing with combo/package rows (each mode
    // only ever sees its own list), but a round trip (Line -> Combo ->
    // Line) now restores exactly what was there instead of losing it.
    modeStateParkRef.current[form.pricingMode] = {
      rows,
      appliedCombos,
      packageSubTotal: form.packageSubTotal,
      packageVatRate: form.packageVatRate,
    };
    const restored = modeStateParkRef.current[nextMode];
    setRows(restored?.rows || []);
    setAppliedCombos(restored?.appliedCombos || []);
    setForm((p) => ({
      ...p,
      pricingMode: nextMode,
      packageSubTotal: restored?.packageSubTotal || 0,
      packageVatRate: restored?.packageVatRate ?? VAT_DEFAULT,
    }));
  };

  const setPackageField = (key, value) =>
    setForm((p) => ({ ...p, [key]: value }));

  // Shared by applyCombo/applyAdhocCombo: combo pricing on the Quotation is
  // always stored in VND, so a combo whose own packageSubTotal is quoted in
  // a different currency needs converting before it lands in the Package
  // Subtotal field.
  const convertComboSubTotalToVnd = async (subTotal, comboCurrencyId, vndId) => {
    if (!comboCurrencyId || !vndId || comboCurrencyId === vndId) {
      return { convertedSubTotal: subTotal, wasConverted: false };
    }
    const rates = await fetchExchangeRatesForConversion([comboCurrencyId], vndId);
    const matched = pickConversionRate(rates, comboCurrencyId, vndId, null);
    if (matched?.rate > 0) {
      return { convertedSubTotal: Math.round(subTotal * matched.rate), wasConverted: true };
    }
    message.warning(
      tr("No exchange rate from the combo's currency to VND — the original amount is kept; check the rates."),
    );
    return { convertedSubTotal: subTotal, wasConverted: false };
  };

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
    const { convertedSubTotal, wasConverted: comboWasConverted } = await convertComboSubTotalToVnd(
      parseNum(combo.packageSubTotal),
      comboCurrencyId,
      vndId,
    );

    // Applying a combo while already in package mode APPENDS its rows
    // alongside any previously-applied combos (each combo keeps its own
    // section, independently removable via _comboInstanceId — see
    // removeAppliedCombo). Applying a combo while still in line pricing
    // mode instead clears every existing row and forces package pricing —
    // mixing line-priced rows with package-priced rows in the same
    // document is exactly what pricing-mode switches are meant to prevent.
    const wasPackageMode = isPackagePricing(form.pricingMode);
    const comboInstanceId = `combo-${runtimeExtractId(combo)}-${Date.now()}`;

    // Transitioning from line pricing to package pricing (this quotation's
    // very first combo) used to just discard every existing line row —
    // "mixing" is still not allowed, but a service that already had a real
    // typed price shouldn't vanish when the quotation switches modes; fold
    // its VND-converted value into the starting packageSubTotal instead.
    let existingLineContributionVnd = 0;
    let foldedExistingRows = rows;
    if (!wasPackageMode && rows.length) {
      const targetCurrency = findCurrencyById(currencies, vndId) || defaultCurrencyObject();
      const neededIds = Array.from(new Set(
        rows
          .map((row) => extractCurrencyId(currencyFromRecord(row, currencies, targetCurrency)))
          .filter((id) => id && id !== vndId),
      ));
      const foldRates = neededIds.length ? await fetchExchangeRatesForConversion(neededIds, vndId) : [];
      // (Not merged with a persistent `exchangeRates` cache — that state
      // lives in the separate ServicesTable component, out of reach here;
      // freshly fetched rates for exactly the currencies needed are
      // sufficient on their own.)
      const mergedFoldRates = foldRates;
      foldedExistingRows = rows.map((row) => {
        if (!row?.serviceName?.trim()) return { ...row, basePrice: 0, vat: 0 };
        const rowCurrency = currencyFromRecord(row, currencies, targetCurrency);
        const amounts = calcLine(row.basePrice, row.quantity || 1, row.vat, rowCurrency);
        const matched = isSameCurrency(rowCurrency, targetCurrency)
          ? { rate: 1 }
          : pickConversionRate(mergedFoldRates, rowCurrency, targetCurrency, null);
        const contributionVnd = matched?.rate ? Math.round(amounts.subTotal * matched.rate) : 0;
        existingLineContributionVnd += contributionVnd;
        return { ...row, basePrice: 0, vat: 0, _packageBasePrice: contributionVnd };
      });
    }

    // quotationServices rows created from this form always resolve to
    // quantity: 1 (buildServicePricingPayload hardcodes quantity: 1 for
    // package mode, and the call site in handleSubmit's `lines` builder
    // always passes quantity: 1 too), so a combo item's quantity > 1 is
    // represented as that many duplicate rows.
    const newRows = [];
    const skippedDuplicateNames = [];
    // Existing rows stay on the quotation either way (folded / merged into
    // this combo below), so a combo item duplicating one of them is skipped.
    const dedupeBaseline = [...rows];
    items.forEach((item) => {
      const svc = item.services || {};
      if (findDuplicateServiceRow(dedupeBaseline, { serviceId: svc.id, serviceName: svc.serviceName })) {
        skippedDuplicateNames.push(svc.serviceName || `#${svc.id}`);
        return;
      }
      dedupeBaseline.push({ serviceId: svc.id ? String(svc.id) : null, serviceName: svc.serviceName || "" });
      const unitCount = Math.max(1, parseInt(item.quantity, 10) || 1);
      for (let i = 0; i < unitCount; i++) {
        newRows.push({
          _id: Date.now() + Math.random(),
          projectServiceId: null,
          // The direct serviceComboItems.serviceId FK first — the nested
          // "services" relation frequently fails to resolve, and falling
          // back to svc.id alone left this null whenever that happened.
          serviceId: extractId(item.serviceId) ? String(extractId(item.serviceId)) : (svc.id ? String(svc.id) : null),
          basePrice: 0,
          currencyId: vndId ? String(vndId) : null,
          currency: vndId ? String(vndId) : null,
          vat: 0,
          serviceName: svc.serviceName || item.serviceName || "",
          serviceType: svc.serviceType || item.serviceType || "",
          description: svc.description || item.description || "",
          catalogService: svc,
          catalogServiceId: svc.id || null,
          catalogBasePrice: svc.basePrice ?? null,
          _comboInstanceId: comboInstanceId,
          _comboCatalogId: runtimeExtractId(combo),
          _comboName: combo.comboName || "",
          // Immutable per-line standalone-price snapshot, captured from this
          // exact serviceComboItems record — getComboLineIndividualPrice
          // reads this first instead of re-matching against the live
          // catalog by service id (that re-match is fragile: the services
          // relation can fail to resolve, silently pairing a row with the
          // WRONG item's price — see its own comment).
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
      message.warning(tr("Skipped {0} service(s) already on the quotation: {1}", { 0: skippedDuplicateNames.length, 1: skippedDuplicateNames.join(", ") }));
    }
    if (!newRows.length) return;

    // Combos never merge into one blended pool — this combo's own amount
    // (its converted total, plus any pre-existing line rows folded in on
    // the very first combo applied) is tracked independently on its own
    // rows/appliedCombos entry, and the quotation's packageSubTotal is
    // simply the sum of every applied combo's own amount (see
    // updateComboAmount, which edits one combo's amount without touching
    // any other).
    // Line/Combo sync: standalone services join this combo — their value
    // (_packageBasePrice: the folded VND line price, or the package share
    // they already added in Combo pricing) becomes part of its amount.
    const mergeResult = mergeStandaloneIntoCombo(
      foldedExistingRows,
      { instanceId: comboInstanceId, catalogId: runtimeExtractId(combo), name: combo.comboName || "", currency: defaultCurrencyObject() },
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
    // Merged values moved into comboOwnAmount (package mode: they were
    // already counted in packageSubTotal).
    setPackageField(
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
    // The flat VAT % field is shared across every combo on the quotation,
    // so only the first combo applied seeds it — later combos leave
    // whatever rate is already there untouched.
    if (appliedCombos.length === 0) {
      setPackageField("packageVatRate", combo.packageVatRate || 0);
    }
    setForm((p) => ({
      ...p,
      pricingMode: PRICING_MODE_PACKAGE,
      ...(vndId ? { currencyId: String(vndId) } : {}),
    }));
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
    message.success(tr("Combo \"{0}\" applied.", { 0: combo.comboName }));
  };

  // Ad-hoc combo — a one-off bundle of services grouped under a single flat
  // package price, built directly inside the Add Service modal (unlike
  // applyCombo above, this is NOT backed by a serviceCombos catalog record:
  // _comboCatalogId stays null, only comboName carries the traceability
  // data). Mirrors applyCombo's row-building.
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
    const { convertedSubTotal, wasConverted: comboWasConverted } = await convertComboSubTotalToVnd(
      packageSubTotal,
      comboCurrencyId,
      vndId,
    );

    const wasPackageMode = isPackagePricing(form.pricingMode);
    // See applyCombo's own comment: fold any pre-existing line rows' VND
    // value into the starting packageSubTotal on this same line->package
    // transition, instead of discarding them.
    let existingLineContributionVnd = 0;
    let foldedExistingRows = rows;
    if (!wasPackageMode && rows.length) {
      const targetCurrency = findCurrencyById(currencies, vndId) || defaultCurrencyObject();
      const neededIds = Array.from(new Set(
        rows
          .map((row) => extractCurrencyId(currencyFromRecord(row, currencies, targetCurrency)))
          .filter((id) => id && id !== vndId),
      ));
      const foldRates = neededIds.length ? await fetchExchangeRatesForConversion(neededIds, vndId) : [];
      // (Not merged with a persistent `exchangeRates` cache — that state
      // lives in the separate ServicesTable component, out of reach here;
      // freshly fetched rates for exactly the currencies needed are
      // sufficient on their own.)
      const mergedFoldRates = foldRates;
      foldedExistingRows = rows.map((row) => {
        if (!row?.serviceName?.trim()) return { ...row, basePrice: 0, vat: 0 };
        const rowCurrency = currencyFromRecord(row, currencies, targetCurrency);
        const amounts = calcLine(row.basePrice, row.quantity || 1, row.vat, rowCurrency);
        const matched = isSameCurrency(rowCurrency, targetCurrency)
          ? { rate: 1 }
          : pickConversionRate(mergedFoldRates, rowCurrency, targetCurrency, null);
        const contributionVnd = matched?.rate ? Math.round(amounts.subTotal * matched.rate) : 0;
        existingLineContributionVnd += contributionVnd;
        return { ...row, basePrice: 0, vat: 0, _packageBasePrice: contributionVnd };
      });
    }
    const newRows = [];
    const skippedDuplicateNames = [];
    // Existing rows stay on the quotation either way (folded / merged into
    // this combo below), so a combo item duplicating one of them is skipped.
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
      for (let i = 0; i < unitCount; i++) {
        newRows.push({
          _id: Date.now() + Math.random(),
          projectServiceId: null,
          serviceId: item.serviceId ? String(item.serviceId) : null,
          basePrice: 0,
          currencyId: vndId ? String(vndId) : null,
          currency: vndId ? String(vndId) : null,
          vat: 0,
          serviceName: item.serviceName || "",
          serviceType: item.serviceType || "",
          description: item.description || "",
          catalogService: null,
          catalogServiceId: item.serviceId || null,
          catalogBasePrice: null,
          _saveToCatalog: !!item.saveToCatalog,
          _comboInstanceId: adhocComboId,
          _comboCatalogId: null,
          _comboName: comboName,
          // See applyCombo's matching comment: immutable per-line
          // standalone-price snapshot, read by getComboLineIndividualPrice.
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
      message.warning(tr("Skipped {0} service(s) already on the quotation: {1}", { 0: skippedDuplicateNames.length, 1: skippedDuplicateNames.join(", ") }));
    }
    if (!newRows.length) return;

    // See applyCombo's matching comment: no merge into one pool — this
    // combo's own amount is tracked independently on its own rows/
    // appliedCombos entry.
    // Line/Combo sync: standalone services join this combo — their value
    // (_packageBasePrice: the folded VND line price, or the package share
    // they already added in Combo pricing) becomes part of its amount.
    const mergeResult = mergeStandaloneIntoCombo(
      foldedExistingRows,
      { instanceId: adhocComboId, catalogId: null, name: comboName, currency: defaultCurrencyObject() },
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
    // Merged values moved into comboOwnAmount (package mode: they were
    // already counted in packageSubTotal).
    setPackageField(
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
      setPackageField("packageVatRate", packageVatRate);
    }
    setForm((p) => ({
      ...p,
      pricingMode: PRICING_MODE_PACKAGE,
      ...(vndId ? { currencyId: String(vndId) } : {}),
    }));
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
    // Deferred, same as the per-service saveToCatalog flag: the actual
    // serviceCombos/serviceComboItems writes only happen once the quotation
    // is confirmed created (handleSubmit's tail), using whichever rows from
    // this combo instance still have a real serviceId then.
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
  // price contribution (packageSubTotal is a running sum across every
  // applied combo — see applyCombo/applyAdhocCombo — so removing one
  // subtracts back only the amount that combo itself added).
  const removeAppliedCombo = (instanceId) => {
    const entry = appliedCombos.find((c) => c.instanceId === instanceId);
    if (!entry) return;
    markDirty();
    // Services merged into this combo (Line/Combo sync) are part of it and
    // go with it; say so, since they were added separately.
    const mergedGoing = rows.filter((r) => r._comboInstanceId === instanceId && r._mergedIntoCombo);
    if (mergedGoing.length) {
      message.info(
        tr("Also removed {0} service(s) merged into this combo: {1}", { 0: mergedGoing.length, 1: mergedGoing.map((r) => r.serviceName || tr("Service")).join(", ") }),
      );
    }
    setRows((prev) => prev.filter((r) => r._comboInstanceId !== instanceId));
    setPackageField(
      "packageSubTotal",
      Math.max(parseNum(form.packageSubTotal) - entry.convertedAmount, 0),
    );
    setAppliedCombos((prev) => prev.filter((c) => c.instanceId !== instanceId));
  };

  // Combos never merge into one blended pool — each applied combo keeps its
  // own independently-editable amount. Editing one combo's amount here only
  // touches that combo's own entry/rows, then re-sums packageSubTotal; it
  // never rewrites another combo's amount.
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

  const handleProjectChange = async (projectId) => {
    const nextProjectId = extractId(projectId);
    if (!nextProjectId) {
      setForm((p) => ({ ...p, projectId: null }));
      return;
    }

    let project =
      projects.find(
        (item) => String(extractId(item?.id)) === String(nextProjectId),
      ) || null;
    if (!project) {
      project = await fetchRecord("projects:get", nextProjectId, {
        appends: ["customers", "customer", "internalCompany", "lawyer", "assignees"],
      });
    }
    if (project) {
      setProjects((prev) => mergeRecordById(prev, project));
    }

    const customerId = recordCustomerId(project);
    const companyId = recordInternalCompanyId(project);
    const lawyerId = recordLawyerId(project);

    if (customerId) {
      let foundCustomer = customers.find(
        (item) => String(extractId(item?.id)) === String(customerId),
      );
      if (!foundCustomer) {
        foundCustomer = await fetchRecord("customers:get", customerId);
      }
      if (foundCustomer) {
        setCurrentCustomer(foundCustomer);
        setCustomers((prev) => mergeRecordById(prev, foundCustomer));
      }
    }

    setForm((p) => ({
      ...p,
      projectId: String(nextProjectId),
      leadId: customerId ? null : p.leadId,
      customerId: customerId ? String(customerId) : p.customerId,
      internalCompanyId: companyId ? String(companyId) : p.internalCompanyId,
      lawyerId: lawyerId ? String(lawyerId) : p.lawyerId,
      assignedLawyerId: lawyerId ? String(lawyerId) : p.assignedLawyerId,
    }));
  };

  const refreshLeads = useCallback(async () => {
    const list = await fetchAll("lead:list");
    setLeads(list);
    return list;
  }, []);

  const refreshCustomers = useCallback(async () => {
    const list = await fetchAll("customers:list");
    setCustomers(list);
    return list;
  }, []);

  const refreshTemplates = useCallback(async () => {
    const list = await fetchAll("template:list");
    setTemplates(list);
    return list;
  }, []);

  const openCreatePopup = useCallback(
    async (viewKey, refreshFn, options = {}) => {
      const { beforeIds, onCreated } = options;
      const beforeIdSet = beforeIds ? new Set(beforeIds.map(String)) : null;
      const opened = await openPopupViewByUid(viewKey);
      if (opened && refreshFn) {
        // Guard against the 3 scheduled retries below all firing onCreated: once a
        // record is selected, later retries must not overwrite a user's subsequent
        // manual choice.
        let selectedCreatedId = null;
        const runRefreshAndSelect = async () => {
          if (selectedCreatedId) return;
          try {
            const updated = await refreshFn();
            if (selectedCreatedId) return;
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
              if (created) {
                selectedCreatedId = String(created.id);
                onCreated(String(created.id), created, updated);
              }
            }
          } catch (error) {
            console.warn(
              "[QuotationCreateForm] quick-create refresh failed",
              error,
            );
          }
        };
        setTimeout(runRefreshAndSelect, 1200);
        setTimeout(runRefreshAndSelect, 3500);
        setTimeout(runRefreshAndSelect, 7000);
      }
    },
    [],
  );

  // Mirrors CaseCreateForm.js's onAddFromService: the picker only ever adds a brand-new row
  // (never edits an existing row's service — see the parity design spec §5.1). `value` carries
  // the exact same field shape the old __service__-merge branch of updateRow used to consume.
  const addRowFromService = async (value) => {
    if (findDuplicateServiceRow(rows, { serviceId: value.serviceId, serviceName: value.serviceName })) {
      message.warning(tr("This service is already on the quotation."));
      return;
    }
    markDirty();
    // No mixing Line/Combo pricing on one quotation: once already in
    // package mode, a newly added service is package-included ($0 on its
    // own row) and its typed price folds into packageSubTotal instead,
    // same as a combo's own price already does — otherwise the price the
    // lawyer just typed would be silently discarded and Total Amount would
    // never move for it.
    const wasPackageMode = isPackagePricing(form.pricingMode);
    let packageContributionVnd = 0;
    if (wasPackageMode) {
      const vndId = extractCurrencyId(findDefaultCurrency(currencies)?.id);
      const targetCurrency = findCurrencyById(currencies, vndId) || defaultCurrencyObject();
      const rowCurrency = currencyFromRecord(value, currencies, targetCurrency);
      const amounts = calcLine(value.basePrice, 1, value.vat ?? 0, rowCurrency);
      // (No persistent `exchangeRates` cache here — that state lives in the
      // separate ServicesTable component — so fetch fresh for this one
      // currency instead.)
      let matched = isSameCurrency(rowCurrency, targetCurrency) ? { rate: 1 } : null;
      if (!matched) {
        const rates = await fetchExchangeRatesForConversion([extractCurrencyId(rowCurrency)], vndId);
        matched = pickConversionRate(rates, rowCurrency, targetCurrency, null);
      }
      if (matched?.rate) {
        packageContributionVnd = Math.round(amounts.subTotal * matched.rate);
      } else if (!isSameCurrency(rowCurrency, targetCurrency)) {
        message.warning(tr("Missing exchange rate {0} → VND — this service is not in the total yet; check the rates.", { 0: getCurrencyCode(rowCurrency) }));
      }
    }
    setRows((p) => [
      ...p,
      {
        _id: Date.now(),
        projectServiceId: value.projectServiceId || null,
        serviceId: value.serviceId,
        basePrice: wasPackageMode ? 0 : value.basePrice,
        currencyId: value.currencyId ? String(value.currencyId) : null,
        currency: value.currency || null,
        vat: wasPackageMode ? 0 : (value.vat ?? 0),
        serviceName: value.serviceName,
        serviceType: value.serviceType || "",
        description: value.description || "",
        catalogService: value.catalogService || null,
        catalogServiceId: value.catalogServiceId || value.serviceId || null,
        catalogBasePrice: value.catalogBasePrice ?? value.basePrice ?? null,
        _saveToCatalog: !!value.saveToCatalog,
        _packageBasePrice: wasPackageMode ? packageContributionVnd : 0,
      },
    ]);
    if (wasPackageMode && packageContributionVnd) {
      setPackageField("packageSubTotal", parseNum(form.packageSubTotal) + packageContributionVnd);
    }
  };
  // Adds a service INTO an already-applied combo's section (triggered by that
  // section's own "+ Add service" button) rather than as an untagged row.
  // Priced at 0 — "included in combo" — per user decision: this service rides
  // along on the combo's existing package price, it does not add its own charge.
  const onAddServiceToCombo = (instanceId, value) => {
    if (findDuplicateServiceRow(rows, { serviceId: value.serviceId, serviceName: value.serviceName })) {
      message.warning(tr("This service is already on the quotation."));
      return;
    }
    const siblingRow = rows.find((r) => r._comboInstanceId === instanceId);
    const comboEntry = appliedCombos.find((c) => c.instanceId === instanceId);
    const newRow = {
      _id: Date.now(),
      projectServiceId: value.projectServiceId || null,
      serviceId: value.serviceId,
      basePrice: 0,
      currencyId: value.currencyId ? String(value.currencyId) : null,
      currency: value.currency || null,
      vat: 0,
      serviceName: value.serviceName,
      serviceType: value.serviceType || "",
      description: value.description || "",
      catalogService: value.catalogService || null,
      catalogServiceId: value.catalogServiceId || value.serviceId || null,
      catalogBasePrice: value.catalogBasePrice ?? value.basePrice ?? null,
      _saveToCatalog: !!value.saveToCatalog,
      _comboInstanceId: instanceId,
      _comboCatalogId: siblingRow?._comboCatalogId ?? null,
      _comboName: siblingRow?._comboName || comboEntry?.comboName || null,
    };
    markDirty();
    // Insert right after this combo's own last row, not at the end of the
    // whole list — appending unconditionally would land the new row after
    // a later-applied combo's rows, breaking that combo's section
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
  };
  const deleteRow = (id) => {
    markDirty();
    const row = rows.find((r) => r._id === id);
    const packageBasePrice = parseNum(row?._packageBasePrice);
    if (isPackagePricing(form.pricingMode) && packageBasePrice) {
      setPackageField("packageSubTotal", Math.max(parseNum(form.packageSubTotal) - packageBasePrice, 0));
    }
    setRows((p) => p.filter((r) => r._id !== id));
  };
  const updateRow = (id, field, value) => {
    markDirty();
    setRows((p) =>
      p.map((r) => {
        if (r._id !== id) return r;
        if (field === "__service__")
          return {
            ...r,
            projectServiceId:
              r.projectServiceId || value.projectServiceId || null,
            serviceId: value.serviceId,
            basePrice: value.basePrice,
            currencyId: value.currencyId
              ? String(value.currencyId)
              : r.currencyId,
            currency: value.currency || r.currency || null,
            vat: value.vat ?? r.vat,
            serviceName: value.serviceName,
            serviceType: value.serviceType || "",
            description: value.description || "",
            catalogService: value.catalogService || r.catalogService || null,
            catalogServiceId:
              value.catalogServiceId ||
              value.serviceId ||
              r.catalogServiceId ||
              null,
            catalogBasePrice:
              value.catalogBasePrice ??
              value.basePrice ??
              r.catalogBasePrice ??
              null,
          };
        return { ...r, [field]: value };
      }),
    );
  };

  const handleAddNewService = async (data) => {
    const currency =
      findCurrencyById(currencies, data.currencyId) || selectedCurrency;
    return {
      id: null,
      serviceName: data.name,
      serviceType: data.serviceType || null,
      basePrice: data.price,
      currencyId:
        extractCurrencyId(data.currencyId) || extractCurrencyId(currency),
      currency,
      description: data.description || "",
      vat: parseNum(data.vat),
      catalogServiceId: null,
      catalogBasePrice: null,
      catalogService: null,
      saveToCatalog: !!data.saveToCatalog,
    };
  };
  // </ai-section>

  // <ai-section name="main-form-submit-transaction">
  const handleSubmit = async () => {
    if (!form.internalCompanyId) {
      message.warning(tr("Please select Internal Issuing Company"));
      return;
    }
    if (!form.leadId && !form.customerId) {
      message.warning(tr("Please select Related Lead or Customer"));
      return;
    }
    if (currencies.length && !form.currencyId) {
      message.warning(tr("Please select Quotation Currency"));
      return;
    }
    if (form.quotationKind === "supplement" && !form.parentId) {
      message.warning(
        tr("Please select or pass the main quotation before creating a supplementary quotation."),
      );
      return;
    }
    if (rows.length === 0) {
      message.warning(tr("Please add at least 1 service"));
      return;
    }
    const packageMode = isPackagePricing(form.pricingMode);
    if (
      rows.find(
        (r) => !r.serviceId && !r.projectServiceId && !r.serviceName?.trim(),
      )
    ) {
      message.warning(tr("Please select service information"));
      return;
    }
    if (!packageMode && rows.find((r) => parseNum(r.basePrice) <= 0)) {
      message.warning(tr("Please fill in all service information"));
      return;
    }
    if (packageMode && parseNum(form.packageSubTotal) <= 0) {
      message.warning(tr("Please enter combo subtotal"));
      return;
    }

    // Nếu yêu cầu xét duyệt nhưng chưa chọn người duyệt → cảnh báo (không block, vì approvedById là optional)
    if (form.isRequiredApproval && !form.approvedById) {
      message.info(
        tr("Note: You have not selected an approver. Quotation will be created with pending status."),
      );
    }

    setSubmittingState(true);
    try {
      setSubmitStep(tr("Creating quotation..."));
      // The header is VND (INV-1) — see selectedCurrency.
      const submitCurrency = selectedCurrency;
      const lines = rows.map((r) => ({
        ...r,
        currencyId:
          extractCurrencyId(r.currencyId) ||
          extractCurrencyId(submitCurrency) ||
          null,
        ...buildServicePricingPayload({
          pricingMode: form.pricingMode,
          basePrice: r.basePrice,
          quantity: 1,
          vat: r.vat,
          packageSubTotal: form.packageSubTotal,
          packageVatRate: form.packageVatRate,
          currency: findCurrencyById(currencies, r.currencyId) || submitCurrency,
          packageCurrency: submitCurrency,
        }),
      }));

      for (const line of lines) {
        if (line.projectServiceId && line.serviceId) {
          try {
            await ctx.api.request({
              url: "projectServices:update",
              method: "POST",
              params: { filterByTk: line.projectServiceId },
              data: { serviceId: parseInt(line.serviceId, 10) },
            });
          } catch (error) {
            console.warn(
              "[QuotationCreateForm] Could not backfill serviceId on projectService",
              error,
            );
          }
        }
      }

      let lineTotals = calcRowsTotals(lines);
      let quotationFinancialSummary = null;
      if (!packageMode) {
        setSubmitStep(tr("Checking quotation exchange rates..."));
        const preliminarySummary = buildQuotationFinancialSummary({
          rows: lines,
          currencies,
          baseCurrency: submitCurrency,
          packageMode,
        });
        const rateCurrencyIds = getConversionSourceCurrencyIds(
          preliminarySummary.groups,
          submitCurrency,
        );
        const quotationExchangeRates = rateCurrencyIds.length
          ? await fetchExchangeRatesForConversion(
              rateCurrencyIds,
              extractCurrencyId(submitCurrency),
            )
          : [];
        quotationFinancialSummary = buildQuotationFinancialSummary({
          rows: lines,
          currencies,
          baseCurrency: submitCurrency,
          exchangeRates: quotationExchangeRates,
          packageMode,
        });
        if (!quotationFinancialSummary.converted.canConvert) {
          throw new Error(
            tr("Missing exchange rate for quotation total: {0}", { 0: formatMissingRatePairs(
              quotationFinancialSummary.missing,
              submitCurrency,
            ) }),
          );
        }
        lineTotals = quotationFinancialSummary.converted;
      }
      const totals = packageMode
        ? calcPackageTotals(form.packageSubTotal, form.packageVatRate, selectedCurrency)
        : lineTotals;

      // ── approvedAt: ghi nhận datetime lúc tạo nếu isRequiredApproval = true ──
      const approvedAt = form.isRequiredApproval
        ? new Date().toISOString()
        : null;
      const projectId = form.projectId ? parseInt(form.projectId, 10) : null;
      const parentId = form.parentId ? parseInt(form.parentId, 10) : null;
      const quotationKind =
        form.quotationKind || (parentId ? "supplement" : "main");
      const quotationTitle =
        quotationKind === "supplement"
          ? `Supplementary quotation${popupContext?.projectService?.serviceName ? ` - ${popupContext.projectService.serviceName}` : ""}`
          : "Quotation";
      const quotationStatus = "new";
      const projectServiceStatus = form.isRequiredApproval
        ? "quote_pending_approval"
        : quoteStatusToServiceStatus(quotationStatus);

      const qRes = await ctx.api.request({
        url: "quotations:create",
        method: "POST",
        data: {
          quotationKind,
          parentId,
          title: quotationTitle,
          internalCompanyId: parseInt(form.internalCompanyId),
          leadId: form.leadId ? parseInt(form.leadId) : null,
          customerId: form.customerId ? parseInt(form.customerId) : null,
          projectId,
          userId: form.userId ? parseInt(form.userId) : null,
          lawyerId:
            form.assignedLawyerId || form.lawyerId
              ? parseInt(form.assignedLawyerId || form.lawyerId)
              : null,
          templateId: form.templateId ? parseInt(form.templateId) : null,
          description: form.description || null,
          serviceDescription: form.serviceDescription || null,
          currencyId: extractCurrencyId(submitCurrency) || null,
          status: quotationStatus,
          pricingMode: packageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
          packageSubTotal: packageMode ? totals.subTotal : null,
          packageVatRate: packageMode ? parseNum(form.packageVatRate) : null,
          subTotal: totals.subTotal,
          vatAmount: totals.vatAmount,
          totalAmount: totals.totalAmount,
          // ── Approval fields ──
          isRequiredApproval: form.isRequiredApproval,
          approvedById:
            form.isRequiredApproval && form.approvedById
              ? parseInt(form.approvedById)
              : null,
          approvedAt: approvedAt,
          createdById: currentUser?.id || null,
          updatedById: currentUser?.id || null,
        },
      });

      const quotationId = qRes?.data?.data?.id || qRes?.data?.id;
      if (!quotationId)
        throw new Error(tr("Could not retrieve quotation id after creation"));
      const createdQuotation = qRes?.data?.data ||
        qRes?.data || {
          id: quotationId,
          quotationKind,
          parentId,
          title: quotationTitle,
          internalCompanyId: parseInt(form.internalCompanyId),
          leadId: form.leadId ? parseInt(form.leadId) : null,
          customerId: form.customerId ? parseInt(form.customerId) : null,
          projectId,
          lawyerId:
            form.assignedLawyerId || form.lawyerId
              ? parseInt(form.assignedLawyerId || form.lawyerId)
              : null,
          templateId: form.templateId ? parseInt(form.templateId) : null,
          currencyId: extractCurrencyId(submitCurrency) || null,
          status: quotationStatus,
          pricingMode: packageMode ? PRICING_MODE_PACKAGE : PRICING_MODE_LINE,
          packageSubTotal: packageMode ? totals.subTotal : null,
          packageVatRate: packageMode ? parseNum(form.packageVatRate) : null,
          subTotal: totals.subTotal,
          vatAmount: totals.vatAmount,
          totalAmount: totals.totalAmount,
        };
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        setSubmitStep(tr("Saving service {0}/{1}...", { 0: i + 1, 1: lines.length }));
        const svcMeta = svcOpts.find(
          (s) => String(serviceOptionServiceId(s)) === String(l.serviceId),
        );
        const serviceType = l.serviceType || serviceOptionType(svcMeta) || null;
        const description =
          l.description || serviceOptionDescription(svcMeta) || null;
        const quotationServiceData = {
          quotationId,
          serviceId: l.serviceId,
          serviceName: l.serviceName || null,
          serviceType: serviceType,
          description: description,
          basePrice: l.basePrice,
          quantity: l.quantity,
          currencyId: l.currencyId || null,
          currency: l.currencyId || null,
          vat: l.vat,
          subTotal: l.subTotal,
          vatAmount: l.vatAmount,
          totalAmount: l.totalAmount,
          pricingMode: l.pricingMode,
          packageSubTotal: l.packageSubTotal,
          packageVatRate: l.packageVatRate,
          packageVatAmount: l.packageVatAmount,
          packageTotalAmount: l.packageTotalAmount,
          // Combo traceability — null for manually-added rows. Both comboId
          // (raw FK column) and serviceCombo (the belongsTo relation field
          // itself) are sent for compatibility, mirroring
          // CaseCreateForm.js's projectServices convention.
          comboId: l._comboCatalogId ? parseInt(l._comboCatalogId, 10) : null,
          serviceCombo: l._comboCatalogId ? parseInt(l._comboCatalogId, 10) : null,
          comboName: l._comboName || null,
        };
        let qsRes;
        try {
          qsRes = await ctx.api.request({
            url: "quotationServices:create",
            method: "POST",
            data: lineWritePayload(quotationServiceData),
          });
        } catch (error) {
          // quotationServices may not have comboId/serviceCombo/comboName
          // configured yet — retry without them rather than failing the
          // whole submit.
          console.warn("Retrying quotationService without combo fields:", error);
          const fallback = { ...quotationServiceData };
          delete fallback.comboId;
          delete fallback.serviceCombo;
          delete fallback.comboName;
          qsRes = await ctx.api.request({
            url: "quotationServices:create",
            method: "POST",
            data: lineWritePayload(fallback),
          });
        }
        const quotationServiceId = qsRes?.data?.data?.id || qsRes?.data?.id;
        const targetProjectServiceId =
          l.projectServiceId ||
          (lines.length === 1 ? form.projectServiceId : null);
        if (targetProjectServiceId) {
          try {
          await ctx.api.request({
            url: "projectServices:update",
            method: "POST",
            params: { filterByTk: targetProjectServiceId },
            // links the case line to the new quotation line: its content
            // must go with it (the thread spreads this write's content)
            data: lineWritePayload({
              quotationId,
              quotationServiceId,
              quotationServices: quotationServiceId,
              serviceId: l.serviceId ? parseInt(l.serviceId, 10) : null,
              serviceName: l.serviceName || null,
              serviceType: serviceType || null,
              description: description || null,
              basePrice: l.basePrice,
              quantity: l.quantity,
              currencyId: l.currencyId || null,
              currencies: l.currencyId || null,
              vat: l.vat,
              subTotal: l.subTotal,
              vatAmount: l.vatAmount,
              totalAmount: l.totalAmount,
              pricingMode: l.pricingMode,
              packageSubTotal: l.packageSubTotal,
              packageVatRate: l.packageVatRate,
              packageVatAmount: l.packageVatAmount,
              packageTotalAmount: l.packageTotalAmount,
              billingMode: isPackagePricing(l.pricingMode)
                ? "packageIncluded"
                : "lineBillable",
              financialSourceType: "quotation",
              status: projectServiceStatus,
            }),
          });
          } catch (linkError) {
            // e.g. the case line belongs to a billed contract: say why, and
            // skip its contract lines (they would be refused the same way)
            message.warning(apiErrorText(linkError, tr("Could not link the case line to the quotation.")));
            console.warn("[QuotationCreateForm] Could not link projectService:", linkError);
            continue;
          }

          try {
            const csListRes = await ctx.api.request({
              url: "contractServices:list",
              params: {
                filter: JSON.stringify({
                  projectServiceId: { $eq: targetProjectServiceId },
                }),
                pageSize: 10,
              },
            });
            const matchedCSList = csListRes?.data?.data || [];
            for (const matchedCS of matchedCSList) {
              const contractServiceId = extractId(matchedCS.id);
              if (contractServiceId) {
                const contractServicePayload = {
                  quotationServiceId,
                  quotationServices: quotationServiceId,
                  serviceId: l.serviceId ? parseInt(l.serviceId, 10) : null,
                  ServiceId: l.serviceId ? parseInt(l.serviceId, 10) : null,
                  services: l.serviceId ? parseInt(l.serviceId, 10) : null,
                  serviceName: l.serviceName || null,
                  serviceType: serviceType || null,
                  description: description || null,
                  basePrice: l.basePrice,
                  quantity: l.quantity,
                  currencyId: l.currencyId || null,
                  currency: l.currencyId || null,
                  vat: l.vat,
                  subTotal: l.subTotal,
                  vatAmount: l.vatAmount,
                  totalAmount: l.totalAmount,
                  pricingMode: l.pricingMode,
                  packageSubTotal: l.packageSubTotal,
                  packageVatRate: l.packageVatRate,
                  packageVatAmount: l.packageVatAmount,
                  packageTotalAmount: l.packageTotalAmount,
                };
                Object.keys(contractServicePayload).forEach((key) => {
                  if (contractServicePayload[key] === undefined)
                    delete contractServicePayload[key];
                });
                await ctx.api.request({
                  url: `contractServices:update?filterByTk=${contractServiceId}`,
                  method: "POST",
                  data: linkedLineFollowUpPayload(contractServicePayload),
                });
                const targetContractId =
                  extractId(matchedCS.contractId) ||
                  extractId(matchedCS.contracts);
                if (targetContractId) {
                  await localSyncContractHeaderFromServices(targetContractId);
                }
              }
            }
          } catch (contractSyncError) {
            message.warning(apiErrorText(contractSyncError, tr("Could not sync the contract lines.")));
            console.warn(
              "[QuotationCreateForm] Could not sync contract services:",
              contractSyncError,
            );
          }
        }
      }

      if (projectId && quotationKind === "main") {
        const projectUpdateData = {
          quotationId,
          // Cases' "Currency" field is a belongsTo association named
          // "currencies", not a "currencyId" scalar — sending "currencyId"
          // is a silently-ignored unknown key on this collection.
          currencies: extractCurrencyId(submitCurrency) || null,
          currencyId: extractCurrencyId(submitCurrency) || null,
          // line pricing: the case's totals are the database's
          // (trg_money_project_header); a combo's are not
          ...(packageMode ? {
            subTotal: totals.subTotal,
            vatAmount: totals.vatAmount,
            totalAmount: totals.totalAmount,
          } : {}),
        };
        await ctx.api
          .request({
            url: "projects:update",
            method: "POST",
            params: { filterByTk: projectId },
            data: projectUpdateData,
          })
          .catch(async (error) => {
            const fallback = { ...projectUpdateData };
            delete fallback.currencyId;
            delete fallback.currencies;
            console.warn(
              "[QuotationCreateForm] Retrying project sync without currencyId",
              error,
            );
            await ctx.api
              .request({
                url: "projects:update",
                method: "POST",
                params: { filterByTk: projectId },
                data: fallback,
              })
              .catch((fallbackError) =>
                console.warn(
                  "[QuotationCreateForm] Could not link main quotation to project",
                  fallbackError,
                ),
              );
          });
      }

      emitQuickCreateCreated("quotations", createdQuotation);
      message.success(tr("Quotation created successfully!"));
      isDirtyRef.current = false;

      // The user already opted in per-row (the "Also save to the shared
      // catalog" checkbox in the Create New Service form, checked at the
      // moment they typed the name) — nothing to ask here, just carry out
      // what they already chose, now that the quotation is confirmed
      // created. Deferred to this point (rather than writing immediately
      // when the checkbox was checked) so deleting the row or abandoning
      // the quotation before submit never leaves a "phantom" catalog entry.
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
          if (svcOpts.some((s) => serviceNameKey(serviceOptionName(s)) === serviceNameKey(r.serviceName))) continue;
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
                    price: r.basePrice || 0,
                    vat: r.vat || 0,
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

      // Same deferred-write idea, one level up: for each ad-hoc combo whose
      // "Also save this combo to the shared catalog" was checked, create
      // serviceCombos + one serviceComboItems row per member service that
      // now has a real serviceId (either it was catalog-picked to begin
      // with, or it's a custom item saved via newServiceIdByRowId above -
      // every custom item auto-saves when the combo checkbox is checked).
      // An item still ends up without a serviceId only if its name already
      // matched an existing catalog entry (skipped to avoid a duplicate,
      // see the dedup check above) or its own services:create call failed -
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

      setSubmittingState(false);
      setSubmitStep("");
      if (!(await closePopupAfterSubmit())) {
        message.warning(tr("Cannot close this popup from the current runtime."));
      }
      return;
    } catch (e) {
      message.error(tr("Error: ") + (e?.message || tr("Please try again")));
    }
    setSubmittingState(false);
    setSubmitStep("");
  };
  // </ai-section>

  // <ai-section name="main-form-render">
  if (loading)
    return React.createElement(
      "div",
      { style: { textAlign: "center", padding: 80 } },
      React.createElement(Spin, { size: "large" }),
    );

  const selStyle = { ...inp(), cursor: "pointer" };

  return React.createElement(
    "div",
    {
      style: {
        fontFamily: FONT,
        color: C.text,
        background: C.bgCard,
        width: "100%",
        padding: 20,
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
          marginBottom: 12,
        },
      },
      React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setGuideOpen(true),
          style: {
            padding: "8px 14px",
            borderRadius: 6,
            border: `1px solid ${C.border}`,
            background: C.bgCard,
            color: C.text,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONT,
          },
        },
        tr("Guide"),
      ),
    ),

    React.createElement(
      Card,
      null,
      React.createElement(CardHeader, { title: tr("Quotation Information") }),
      React.createElement(
        "div",
        { style: { padding: 0 } },

        // Công ty
        React.createElement(
          "div",
          {
            style: {
              marginBottom: 18,
            },
          },
          React.createElement(
            Field,
            { label: tr("Internal Issuing Company"), required: true },
            React.createElement(
              "select",
              {
                value: form.internalCompanyId || "",
                onChange: (e) => {
                  setF("internalCompanyId", e.target.value || null);
                  setRows([]);
                  setF("templateId", null);
                },
                style: {
                  ...selStyle,
                  fontWeight: 500,
                  fontSize: 13,
                },
              },
              React.createElement(
                "option",
                { value: "" },
                tr("— Select company —"),
              ),
              ...internalCompanies.map((c) =>
                React.createElement(
                  "option",
                  { key: c.id, value: c.id },
                  c.companyName || c.name || tr("Company #{0}", { 0: c.id }),
                ),
              ),
            ),
          ),
        ),

        // Lead + Customer + Luật sư phụ trách (3 cột)
        React.createElement(
          "div",
          { style: { marginBottom: 18 } },
          React.createElement(
            Field,
            { label: tr("Related Case"), hint: "optional" },
            React.createElement(
              "select",
              {
                value: form.projectId || "",
                onChange: (e) => handleProjectChange(e.target.value || null),
                style: {
                  ...selStyle,
                  fontWeight: 500,
                  fontSize: 13,
                },
              },
              React.createElement("option", { value: "" }, tr("-- Select case --")),
              ...projectOptions.map((project) =>
                React.createElement(
                  "option",
                  { key: project.id, value: project.id },
                  projectLabel(project),
                ),
              ),
            ),
          ),
        ),

        React.createElement(
          Grid,
          { cols: 3, gap: 16, mb: 16 },
          React.createElement(
            Field,
            {
              label: tr("Related Lead"),
              hint: !form.customerId ? "1 of 2 required" : "optional",
            },
            React.createElement(LeadDropdown, {
              leads,
              value: form.leadId,
              onChange: (v) => {
                setF("leadId", v);
                if (v) setF("customerId", null);
              },
              currentLead,
              onAddNew: () =>
                openCreatePopup("leadCreate", refreshLeads, {
                  beforeIds: leads.map((l) => l.id),
                  onCreated: (id) => {
                    setF("leadId", id);
                    setF("customerId", null);
                  },
                }),
            }),
          ),
          React.createElement(
            Field,
            {
              label: tr("Related Customer"),
              hint: !form.leadId ? "1 of 2 required" : "optional",
            },
            React.createElement(CustomerDropdown, {
              customers,
              value: form.customerId,
              onChange: (v) => {
                setF("customerId", v);
                if (v) setF("leadId", null);
              },
              currentCustomer,
              onAddNew: () =>
                openCreatePopup("customerCreate", refreshCustomers, {
                  beforeIds: customers.map((c) => c.id),
                  onCreated: (id) => {
                    setF("customerId", id);
                    setF("leadId", null);
                  },
                }),
            }),
          ),
          React.createElement(
            Field,
            { label: tr("Assigned Lawyer"), hint: "optional" },
            React.createElement(LawyerPicker, {
              lawyers,
              value: form.assignedLawyerId,
              onChange: (v) => setF("assignedLawyerId", v),
            }),
          ),
        ),

        // ── APPROVAL SECTION ──
        // Nằm dưới 2 cột trên, trước Điều khoản & Template
        React.createElement(
          "div",
          { style: { marginBottom: 16 } },
          React.createElement(ApprovalSection, {
            isRequired: form.isRequiredApproval,
            approvedById: form.approvedById,
            lawyers,
            onToggle: toggleApproval,
            onSelectApprover: (v) => setF("approvedById", v),
          }),
        ),

        // Điều khoản + Template
        React.createElement(
          Grid,
          { cols: 1, gap: 16, mb: 16 },
          React.createElement(
            Field,
            {
              label: tr("Quotation Template"),
              hint: !form.internalCompanyId
                ? tr("select company first")
                : undefined,
            },
            React.createElement(
              "div",
              { style: { position: "relative", minWidth: 0 } },
              React.createElement(
                "select",
                {
                  value: form.templateId || "",
                  onChange: (e) => handleSelectTemplate(e.target.value || null),
                  style: {
                    ...selStyle,
                    opacity: !form.internalCompanyId ? 0.45 : 1,
                    cursor: !form.internalCompanyId ? "not-allowed" : "pointer",
                    background: !form.internalCompanyId ? "#f3f4f6" : "#fff",
                    minWidth: 0,
                    paddingRight: 82,
                  },
                  disabled: !form.internalCompanyId,
                },
                React.createElement(
                  "option",
                  { value: "" },
                  !form.internalCompanyId
                    ? tr("— Select company first —")
                    : tr("— Select template —"),
                ),
                ...filteredTemplates.map((t) =>
                  React.createElement(
                    "option",
                    { key: t.id, value: t.id },
                    t.templateName || t.name,
                  ),
                ),
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openCreatePopup(
                      "quotationTemplateCreate",
                      refreshTemplates,
                      {
                        beforeIds: templates.map((t) => t.id),
                        onCreated: (id) => handleSelectTemplate(id),
                      },
                    );
                  },
                  style: {
                    border: `1px dashed ${C.primary}`,
                    borderRadius: 5,
                    background: "#fff",
                    color: C.primary,
                    cursor: "pointer",
                    fontFamily: FONT,
                    fontSize: 11,
                    fontWeight: 700,
                    height: 24,
                    lineHeight: "22px",
                    padding: "0 8px",
                    position: "absolute",
                    right: 7,
                    top: "50%",
                    transform: "translateY(-50%)",
                    whiteSpace: "nowrap",
                  },
                },
                tr("+ New Template"),
              ),
            ),
          ),
        ),

        React.createElement(
          Field,
          { label: tr("Short Description"), hint: "optional" },
          React.createElement(AutoTextarea, {
            value: form.description,
            onChange: (v) => setF("description", v),
            placeholder: tr("Quotation description..."),
            minRows: 2,
          }),
        ),
      ),
    ),

    React.createElement(
      Card,
      null,
      React.createElement(ServicesTable, {
        rows,
        svcOpts,
        companyId: form.internalCompanyId,
        onUpdate: updateRow,
        onAddFromService: addRowFromService,
        onDelete: deleteRow,
        onAddNewService: handleAddNewService,
        pricingMode: form.pricingMode,
        currencies,
        currencyOptions,
        selectedCurrency,
        packageSubTotal: form.packageSubTotal,
        packageVatRate: form.packageVatRate,
        packageTotals,
        onPricingModeChange: handlePricingModeChange,
        onPackageChange: setPackageField,
        onCurrencyChange: (value) => setF("currencyId", value || null),
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
      AntButton
        ? React.createElement(
            AntButton,
            {
              type: "primary",
              loading: submitting,
              onClick: handleSubmit,
            },
            tr("Submit"),
          )
        : React.createElement(
            "div",
            {
              onClick: submitting ? null : handleSubmit,
              style: {
                padding: "10px 36px",
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                background: submitting ? "#f3f4f6" : C.primary,
                color: submitting ? "#9ca3af" : "#fff",
                fontFamily: FONT,
              },
            },
            submitting ? tr("Processing...") : tr("Submit"),
          ),
    ),

    guideOpen &&
      React.createElement(
        Modal,
        {
          title: null,
          open: guideOpen,
          onCancel: () => setGuideOpen(false),
          footer: null,
          width: 920,
        },
        React.createElement(QuotationTutorialPanel, null),
      ),
  );
  // </ai-section>
};
// </ai-section>

// <ai-section name="runjs-entrypoint">
ctx.render(React.createElement(QuotationCreateForm, null));
// </ai-section>
