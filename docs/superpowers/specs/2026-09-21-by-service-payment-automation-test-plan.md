# Test Plan — Contract → Case → Payment Request → Payment/Invoice

Date: 2026-09-21

Covers the full contract-to-payment pipeline plus the unified contract payment data model automation (`docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md`) after all fixes/revisions through 2026-09-21: catch-up trigger for By Service tasks done before a contract exists, the mirror fix for By Case (a task already done before being linked to an installment), priority/due-date/note defaults on PR creation, removal of the `contractType` gate on the `isPaymentTrigger` checkbox, and the `ListView`/`ServiceSection` prop-threading bug fix in `TaskManagement.js`. Retainer was checked and confirmed to have no equivalent gap.

**Phần A** below is the real end-to-end pipeline (Contract → Case → tasks → Payment Request → Payment/Invoice) — start here. **Phần B** is the detailed, component-level automation checks already covered earlier this session — use it if Phần A surfaces something that needs narrowing down.

Check each box after verifying on the dev environment.

---

# Phần A — Quy trình đầy đủ: Contract → Case → PR → Payment/Invoice

Test toàn bộ vòng đời thật, không chỉ riêng phần trigger tự động. Mỗi flow đi từ lúc tạo Hợp đồng cho tới lúc có Payment/Invoice thật được tạo ra và liên kết đúng ngược lại Payment Request.

## A1 — Full pipeline: By Case

- [ ] **Tạo Contract** type By Case, đủ 2-3 đợt thanh toán (vd 30%/30%/40%), 1 đợt có set sẵn dueDate lúc tạo. Không còn chọn `triggerType` trong UI (cột "Trigger" đã bị bỏ — 2026-09-21, §6j) — mọi đợt tự động `triggerType='on_task_done'`.
- [ ] Sau khi lưu hợp đồng, xác nhận `contractPaymentSchedules` có đủ số dòng đúng %, và mỗi dòng đã tự tạo 1 `paymentRequests` tương ứng, tất cả `status='pending'`, `conditionMet=false` (không còn `on_signed` active-ngay từ UI này nữa).
- [ ] **Tạo Case** từ Contract đó → xác nhận `projects.contractId` đúng, `contractServices`/`projectServices` được đồng bộ đủ.
- [ ] Vào Task Detail của case, chọn đúng "Đợt thanh toán sẽ kích hoạt khi Done" cho từng đợt → đánh dấu task Done → PR của đợt đó chuyển `conditionMet=true`, và nếu có dueDate thì `status='active'`.
- [ ] Set `dueDate` cho các PR còn `pending` (chưa có sẵn) → xác nhận tự chuyển `active`.
- [ ] (Không thuộc luồng UI hiện tại, chỉ để xác nhận SQL chưa bị phá vỡ) `on_signed`/`on_case_done` vẫn còn được hỗ trợ nếu set trực tiếp qua `contractPaymentSchedules:update`/`tasks:update` — không bắt buộc test lại trong nhóm này trừ khi nghi ngờ hồi quy.
- [ ] Vào **Finance → Payment Request** → mở 1 PR đã `active` → xác nhận hiển thị đủ: Title, Contract link, Requested Amount, Priority, Due Date, Request Note (tự sinh đúng nội dung đợt).
- [ ] Bấm nút **"Create Payment"** trên PR đó → xác nhận:
  - [ ] 1 record `Payment` mới được tạo, số tiền khớp `requestedAmount`.
  - [ ] PR tự cập nhật `createdPayment` trỏ đúng về Payment vừa tạo.
  - [ ] Trạng thái PR chuyển sang phù hợp (`converted` hoặc trạng thái cuối tương ứng — ghi lại giá trị thực tế quan sát được).
- [ ] Nếu quy trình yêu cầu Invoice: tạo Invoice tương tự, xác nhận `createdInvoice` trỏ đúng, số tiền/khách hàng (`customerId`) khớp với Contract.
- [ ] Vào lại Contract detail (`ContractPaymentScheduleDetailBlock.js`) → xác nhận cột "Requested"/trạng thái từng đợt hiển thị đúng theo PR đã tạo Payment.

## A2 — Full pipeline: By Service

- [ ] **Tạo Contract** type By Service, 2 service (giá cố định khác nhau, vd 10tr và 20tr).
- [ ] **Tạo Case** từ Contract → trong modal Sample Tasks, tick `isPaymentTrigger` cho 1-2 task mỗi service.
- [ ] Đánh dấu Done đủ task trigger của **service A** → xác nhận PR tự tạo (`status='active'` ngay, `priority='high'`, `dueDate`=+7 ngày, `requestNote` liệt kê đúng task).
- [ ] Service B **chưa** Done hết task trigger → xác nhận **chưa** có PR nào cho service B.
- [ ] Đánh dấu Done nốt task còn lại của service B → PR thứ 2 tự tạo, số tiền khớp đúng giá service B.
- [ ] Vào **Finance → Payment Request** → xác nhận có đúng 2 PR, mỗi PR đúng dữ liệu, đúng liên kết `projectServiceId`/`contractServiceId`/`contractId`.
- [ ] Bấm **"Create Payment"** cho từng PR → xác nhận Payment tạo đúng số tiền, PR cập nhật `createdPayment`, trạng thái PR chuyển đúng.
- [ ] Nếu có Invoice: tạo Invoice cho 1 trong 2 PR, xác nhận liên kết đúng, không ảnh hưởng PR còn lại.
- [ ] Tổng kiểm: cộng dồn số tiền các Payment đã tạo từ case này, đối chiếu đúng tổng giá trị 2 service trong Contract.

## A3 — Full pipeline: Case tạo trước, Contract tạo sau (By Service)

Cơ chế gắn Contract vào Case đã có sẵn: khi tạo Contract MỚI, field "Case" trên `ContractCreateForm.js` cho chọn 1 Case có sẵn — thao tác này set `projects.contractId`, đúng sự kiện `trg_by_service_contract_linked_catches_up_done_tasks` đang lắng nghe.

- [ ] **Tạo Case** — **không chọn hợp đồng nào** (bỏ trống Contract lúc tạo). Thêm 1-2 service trực tiếp vào case (ad-hoc hoặc từ catalog).
- [ ] Trong Task Detail/Task Management, tick `isPaymentTrigger` cho task của 1 service.
- [ ] Đánh dấu Done đủ task trigger đó → xác nhận **chưa có PR nào** (vì `projects.contractId` còn null — kiểm tra qua `DiagnoseCaseByServiceTrigger.js`).
- [ ] **Tạo Contract mới** type By Service → ở field "Case", chọn đúng Case vừa tạo ở trên → lưu hợp đồng.
- [ ] Ngay sau khi lưu, xác nhận `projects.contractId` đã được set, và **PR tự động được tạo** cho service đã đủ điều kiện từ trước (nhờ catch-up trigger) — đủ `priority/dueDate/requestNote` như A2.
- [ ] Với service còn lại (chưa Done task trigger lúc này) → tiếp tục đánh dấu Done sau khi đã có hợp đồng → xác nhận PR tạo bình thường qua trigger tasks-status (không cần catch-up nữa vì hợp đồng đã có sẵn).
- [ ] Từ đây tiếp tục như A2: Create Payment cho từng PR, đối chiếu tổng tiền.

## A4 — Full pipeline: Case tạo trước, Contract tạo sau (By Case) — vá lỗ hổng 2026-09-21

Trước bản vá này, task đã Done rồi mới được gán vào 1 đợt thanh toán (vì lúc Done chưa có hợp đồng để chọn) sẽ **không bao giờ** tự activate được, do trigger cũ chỉ bắt sự kiện đổi `status`, không bắt sự kiện gán `paymentRequestId`. Đã thêm trigger `by_case_task_linked_activates_payment_request` để vá — test case này xác nhận bản vá hoạt động đúng.

- [ ] **Tạo Case** — không chọn hợp đồng nào. Thêm task vào case (không cần dịch vụ đặc biệt gì, vì By Case không cần `projectServiceId`).
- [ ] Đánh dấu 1 task **Done** ngay khi case chưa có hợp đồng — xác nhận `tasks.paymentRequestId` vẫn `null` (vì chưa có gì để chọn), không có PR nào liên quan.
- [ ] **Tạo Contract mới** type By Case, đủ 2-3 đợt, ít nhất 1 đợt `triggerType='on_task_done'` **có sẵn dueDate** → ở field "Case" chọn đúng Case vừa tạo ở trên → lưu hợp đồng.
- [ ] Xác nhận `contractPaymentSchedules` + `paymentRequests` được tạo đủ như A1 (PR của đợt `on_task_done` đang `status='pending'`, `conditionMet=false`).
- [ ] Quay lại **task đã Done từ trước đó** → mở Task Detail → chọn đúng PR/đợt vừa tạo ở field "Đợt thanh toán sẽ kích hoạt khi Done" (giờ đã có option để chọn vì hợp đồng đã tồn tại).
- [ ] Ngay sau khi chọn (chỉ đổi `paymentRequestId`, task **không** đổi `status` vì đã Done từ trước) → xác nhận PR đó **tự động chuyển `conditionMet=true`**, và vì đã có sẵn dueDate → `status='active'` ngay (nhờ trigger mới `by_case_task_linked_activates_payment_request`).
- [ ] Biến thể: lặp lại nhưng đợt đó **chưa** có dueDate lúc tạo hợp đồng → sau khi chọn liên kết, PR chuyển `conditionMet=true` nhưng vẫn `pending` → set dueDate sau → xác nhận chuyển `active` (qua trigger due-date có sẵn, không đổi).
- [ ] Từ đây tiếp tục Create Payment như A1.

## A5 — Edge case: PR bị từ chối (rejected)

- [ ] Với 1 PR đang `active`, thử chuyển trạng thái sang `rejected` (nếu có action này trên UI) → xác nhận không tạo Payment/Invoice nào, và không có tác dụng phụ nào khác lên task/service liên quan.

## Retainer — đã xác nhận không cần test case-first riêng

Đã đọc lại code (`JsField/Workflow/CreateContractBillingPlansWorkflow.js`) xác nhận billing Retainer chạy hoàn toàn theo lịch (`contractBillingPlans.nextBillingDate`), không tham chiếu `projects`/`tasks` ở đâu cả — thứ tự tạo Case trước/sau Contract không ảnh hưởng. Không cần test case-first riêng cho Retainer.

---

# Phần B — Chi tiết cơ chế tự động (đã test ở mức component)

## Nhóm 1 — Luồng cơ bản By Service

- [ ] Contract type = **By Service**, 1 service giá cố định (vd 10tr). Tạo Case từ hợp đồng.
- [ ] Trong modal "Sample tasks" lúc tạo Case, tick `isPaymentTrigger` cho 1 task template.
- [ ] Sau khi tạo case, task thật có `projectServiceId` + `isPaymentTrigger=true` đúng (`JsField/DiagnoseCaseByServiceTrigger.js`).
- [ ] Đánh dấu task đó **Done** → PR mới tạo có:
  - [ ] `status = 'active'` ngay lập tức (không qua `'pending'`)
  - [ ] `priority = 'high'`
  - [ ] `dueDate` = thời điểm tạo + 7 ngày
  - [ ] `requestNote` = "Yêu cầu thanh toán tự động của các task: {tên task} từ ngày tạo {ngày}"
  - [ ] `requestedAmount` đúng giá service

## Nhóm 2 — Logic AND (nhiều task cùng trigger 1 service)

- [ ] Tick `isPaymentTrigger` cho 2 task cùng service → Done 1 task → **chưa** có PR.
- [ ] Done nốt task còn lại → PR tạo đúng lúc này, `requestNote` liệt kê **cả 2** tên task.

## Nhóm 3 — Idempotency

- [ ] Mở lại task đã Done rồi đánh dấu Done lại → **không** tạo PR thứ 2 cho cùng service.

## Nhóm 4 — Catch-up (task Done trước khi có hợp đồng)

- [ ] Tạo Case **không** gắn hợp đồng → checkbox trigger vẫn **hiện** (không còn gate theo contractType) nhưng chưa có tác dụng gì.
- [ ] Set `isPaymentTrigger=true` cho 1 task, đánh dấu Done (case chưa có hợp đồng) → chưa có PR nào (vì chưa có `contractId`).
- [ ] Gắn Contract (By Service) vào Case đó → PR tự động được tạo ngay lúc gắn hợp đồng (`trg_by_service_contract_linked_catches_up_done_tasks`), đủ `priority/dueDate/requestNote` như Nhóm 1.
- [ ] Biến thể: case có 2 service, mỗi service có task Done sẵn trước khi gắn hợp đồng → gắn hợp đồng 1 lần → **cả 2** PR đều được tạo.

## Nhóm 5 — Checkbox hiển thị mọi nơi, mọi loại hợp đồng

- [ ] `CaseCreateForm.js`: checkbox `isPaymentTrigger` hiện cho mọi loại hợp đồng, kể cả chưa có hợp đồng.
- [ ] `TaskDetailView.js` (đã hợp nhất 2026-09-21): chỉ còn **1 checkbox** "Task này là điều kiện thanh toán" cho mọi loại hợp đồng — không còn hiện 2 control tách rời như trước.
  - [ ] Case **By Case**: tick checkbox → **không** ghi `isPaymentTrigger`, chỉ hiện thêm Select "Chọn đợt thanh toán..." bên dưới. Chọn 1 đợt → ghi đúng `linkedPaymentRequestId`. Bỏ tick 1 task **đã có** đợt liên kết → xoá ngay `linkedPaymentRequestId` (set null), ẩn Select.
  - [ ] Case **By Service**: tick/bỏ tick ghi thẳng `isPaymentTrigger` như cũ, không hiện Select.
  - [ ] Case **Retainer/không hợp đồng**: tick vẫn ghi `isPaymentTrigger` (không có tác dụng gì ở backend, đúng như thiết kế) — không hiện Select.
  - [ ] Mở lại 1 task **đã có sẵn** `linkedPaymentRequestId` từ trước → checkbox tự tick sẵn, Select tự hiện với đúng giá trị đã chọn (không cần bấm gì thêm).
  - [ ] Đóng modal, mở sang task khác → trạng thái "đang hiện Select" không bị dính từ task trước (mỗi task load đúng trạng thái riêng của nó).

## Nhóm 5b — Fix hiển thị label Select (không còn hiện raw ID)

- [ ] Task đã liên kết với 1 PR **đã chuyển `active`** (không còn `pending`) → mở Task Detail → Select vẫn hiện đúng label "Đợt N - ..." thay vì hiện số ID thô.

## Nhóm 5c — TaskManagement.js: cột "Trigger Payment" đồng bộ theo loại hợp đồng (2026-09-21)

- [ ] Case **By Case**: cột "Trigger Payment" trong bảng task hiện **Select** "Chọn đợt..." (không phải checkbox) trên **mọi** row. Chọn 1 đợt → ghi đúng `linkedPaymentRequestId`, cập nhật ngay trong bảng (inline, không cần mở Task Detail). Bỏ chọn (`allowClear`) → xoá `linkedPaymentRequestId`.
- [ ] Mở lại trang / F5 → task đã có `linkedPaymentRequestId` từ trước hiện đúng label "Đợt N - ..." trong Select (không hiện ID thô), kể cả khi PR đó đã chuyển `active`.
- [ ] Case **By Service / Retainer / chưa có hợp đồng**: cột "Trigger Payment" vẫn hiện checkbox `isPaymentTrigger` như trước (không đổi hành vi).
- [ ] Tick/chọn từ `TaskManagement.js` rồi mở `TaskDetailView.js` của đúng task đó (hoặc ngược lại) → 2 màn hình phản ánh cùng 1 giá trị (cùng đọc/ghi `linkedPaymentRequestId`/`isPaymentTrigger`), không lệch nhau.
- [ ] Case đổi từ chưa-có-hợp-đồng sang có hợp đồng (hoặc đổi `contractType`) → tải lại trang → cột "Trigger Payment" chuyển đúng chế độ hiển thị (checkbox ↔ Select) theo `contractType` mới.

## Nhóm 6 — By Case (priority/note/due date mới)

- [ ] Tạo Contract By Case, 1 đợt thanh toán **có** set sẵn dueDate lúc tạo lịch → PR tạo ra dùng **đúng dueDate đã set** (không bị ghi đè bởi mặc định +7 ngày), `priority='high'`, `requestNote` nhắc đúng tên đợt.
- [ ] Tạo đợt thanh toán **không** set dueDate → PR tạo ra tự động có dueDate = +7 ngày kể từ lúc tạo.

## Nhóm 7 — Service không có contractServices gốc (ad-hoc)

- [ ] Thêm service thủ công (không qua catalog) vào Case By Service → tick trigger → Done → PR vẫn tạo đúng, `contractServiceId = null`, không lỗi.

## Nhóm 8 — Seed từ template

- [ ] Tick sẵn `isPaymentTrigger` ở task template (nút "Trigger" trong Sample tasks) → tạo Case mới dùng service đó → task tự sinh đã có sẵn `isPaymentTrigger=true`.

## Nhóm 9 — Hồi quy UI/backend (đảm bảo các bug đã sửa không tái diễn)

- [ ] Đánh dấu bất kỳ task nào Done → **không** còn lỗi 500 `$ne neither linkedPaymentRequestId...` (workflow cũ đã tắt).
- [ ] Trong bảng Task Management của case bất kỳ (kể cả By Case/Retainer/không hợp đồng), cột "Trigger Payment" hiện đúng checkbox, tick/không tick khớp dữ liệu thật.
- [ ] Click checkbox trực tiếp trong bảng Task Management → có gọi API `tasks:update` thật (kiểm tra Network tab), giá trị lưu đúng, không cần mở Task Detail.
- [ ] Checkbox trong Task Detail (`TaskDetailView.js`) vẫn hoạt động bình thường như trước.

## Nhóm 10 — By Case cũ (không bị ảnh hưởng)

- [ ] Test lại đầy đủ luồng By Case hiện có (tạo hợp đồng nhiều đợt, task done kích hoạt đúng đợt qua selector, case done, due date) — xác nhận vẫn hoạt động bình thường.

## Nhóm 11 — Mode split UI + gate audit + retainer "week" (2026-09-21, §6i)

- [ ] Form tạo hợp đồng: chọn "Chế độ thanh toán" = "Không định kỳ" → hiện thêm Select "Loại hợp đồng" (By Case / By Service). Chọn "Định kỳ (Retainer)" → Select "Loại hợp đồng" biến mất, `contractType` chuyển thẳng `retainer`.
- [ ] Chuyển qua lại giữa 2 chế độ nhiều lần → không mất dữ liệu đã nhập ở các field không liên quan (fee model, total amount, ...), hành vi giống hệt Select 1 tầng cũ (vì vẫn dùng chung `handleContractTypeChange`).
- [ ] Tạo hợp đồng **By Service**, billing cycle không phải multiple_payments → field "First payment" **không hiện** (trước đây có hiện, đây là lỗ hổng đã fix). Field "End date" **vẫn hiện** bình thường.
- [ ] Tạo hợp đồng **By Case**, billing cycle one_time → field "First payment" vẫn hiện như cũ (không bị ảnh hưởng bởi audit).
- [ ] Retainer: Select đơn vị lặp lại có thêm option "tuần" bên cạnh ngày/tháng/năm. Chọn "tuần", nhập số chu kỳ → ngày thanh toán kế tiếp tính đúng (+N×7 ngày) trên UI preview.
- [ ] Sau khi tạo hợp đồng Retainer đơn vị "tuần" → workflow "Retainer billing plans - auto-create next payment request" chạy đúng, `nextBillingDate` cộng đúng 7×N ngày mỗi chu kỳ (không cần sửa gì backend, chỉ xác nhận `dayjs` nhận "week" đúng như kỳ vọng).
- [ ] Retainer đơn vị "năm", ngày bắt đầu = 29/02 (năm nhuận) → ngày thanh toán kế tiếp tự động về 28/02 năm sau (không nhuận), cả trên UI preview lẫn `nextBillingDate` do workflow tính.

## Nhóm 12 — By Case: gắn nhãn dịch vụ cho từng đợt thanh toán (2026-09-21, §6h)

- [ ] **Yêu cầu trước khi test**: đã tạo 2 collection trung gian `contractPaymentScheduleServices` (`contractPaymentScheduleId`, `contractServiceId`) và `paymentRequestServices` (`paymentRequestId`, `contractServiceId`) qua Admin UI — chạy `JsField/DiagnoseServiceTaggedInstallments.js` để xác nhận đúng tên field trước khi test nhóm này.
- [ ] Tạo hợp đồng By Case, 2 dịch vụ (A, B), Payment Schedule 3 đợt 30/30/40% → mỗi đợt hiện Select "Service" (multi-select) với options = đúng 2 dịch vụ đã chọn ở trên.
- [ ] Gán Đợt 1 + Đợt 2 → Dịch vụ A, Đợt 3 → Dịch vụ B. Submit → kiểm tra `contractPaymentScheduleServices:list` có đúng 3 dòng (2 dòng trỏ Đợt 1/2 → A, 1 dòng trỏ Đợt 3 → B).
- [ ] 3 Payment Requests tự tạo (do trigger `on_insert`) → `paymentRequestServices:list` có đúng dòng tương ứng copy từ `contractPaymentScheduleServices` (đúng `paymentRequestId` ↔ `contractServiceId`).
- [ ] Tạo Case từ hợp đồng trên → task thuộc dịch vụ A (trong `TaskDetailView.js` và `TaskManagement.js`) chỉ thấy Đợt 1, Đợt 2 trong Select "Chọn đợt..." — **không** thấy Đợt 3.
- [ ] Task thuộc dịch vụ B chỉ thấy Đợt 3 — không thấy Đợt 1, Đợt 2.
- [ ] Task đã link sẵn 1 đợt, sau đó đổi task sang dịch vụ khác (nếu nghiệp vụ cho phép) → mở lại Task Detail/Task Management, đợt cũ **vẫn hiện** trong Select (không bị rớt mất, không hiện raw ID) dù không còn khớp filter theo dịch vụ mới.

## Nhóm 12b — Service bắt buộc, bỏ fallback "mọi dịch vụ" (2026-09-21, §6m)

- [ ] Cột "Service" trong bảng Payment Schedule hiện dấu `*` đỏ, width rộng hơn trước (đủ hiện nhiều tag cùng lúc, không còn bị cắt gọn "+N").
- [ ] Để trống Service ở 1 đợt rồi bấm Submit → bị chặn với thông báo "Please select at least one service for every payment installment." (không cho tạo hợp đồng).
- [ ] Hợp đồng By Case tạo **trước** revision này (không có dòng nào trong `paymentRequestServices` cho các PR cũ, do untagged) → mọi task **không còn thấy** các đợt đó trong Select nữa (đảo ngược so với hành vi cũ — đây là thay đổi có chủ đích, không phải hồi quy).
- [ ] Đợt được tag 2 dịch vụ (vd Đợt 1 → [A, B]) → task thuộc A **và** task thuộc B đều thấy Đợt 1 trong Select (đúng logic OR, không phải AND).

## Nhóm 13 — Bỏ cột Trigger, thu hẹp Billing cycle, English labels (2026-09-21, §6j)

- [ ] Form tạo hợp đồng By Case, bảng Payment Schedule: **không còn** cột "Trigger" (thứ tự cột hiện tại: Installment, Content, % Payment, Service, Due Date, Amount).
- [ ] Tạo hợp đồng mới, vài đợt thanh toán → mở lại record `contractPaymentSchedules` vừa tạo → xác nhận mọi đợt đều có `triggerType='on_task_done'` (không còn `on_signed` mặc định như trước).
- [ ] Select "Billing cycle" (chỉ hiện với By Case) chỉ còn 2 option: "One time", "Multiple payments" — không còn Monthly/Quarterly/Milestone/Manual.
- [ ] Field đầu tiên trong "Contract information" hiện tên "Payment mode" (options: "Non-recurring", "Recurring (Retainer)") thay vì tiếng Việt. Khi chọn "Non-recurring", field thứ 2 hiện tên "Contract type" (options: "By case", "By Service").
- [ ] Toàn bộ luồng PR tự động (A1, Nhóm 1, Nhóm 6, Nhóm 12) test lại bình thường với `triggerType='on_task_done'` mặc định — không có hồi quy nào so với khi còn chọn được `triggerType` thủ công.

## Nhóm 14 — TaskManagement.js: popup chọn đợt thanh toán (2026-09-22, §6n)

- [ ] Cột "Trigger Payment" của task By Case hiện 1 nút nhỏ (không phải Select có mũi tên) — click vào mở popup "Chọn đợt thanh toán".
- [ ] Popup liệt kê đủ các đợt hợp lệ (đúng theo dịch vụ của task, giống filter cũ) — mỗi đợt hiện đủ: tên đầy đủ (không bị cắt "..."), số tiền định dạng có dấu chấm ngăn cách, hạn thanh toán (nếu có), status, và tag tên dịch vụ (không phải id thô).
- [ ] Click vào 1 đợt trong popup → chọn ngay và đóng popup, cột hiện đúng tên đợt vừa chọn (ellipsis + tooltip nếu quá dài).
- [ ] Đợt đang được chọn hiện viền xanh nổi bật trong popup khi mở lại.
- [ ] Bấm "Bỏ chọn" trong popup → xoá `linkedPaymentRequestId`, đóng popup, nút trở lại "Chọn đợt...".
- [ ] Task không có đợt nào hợp lệ (do filter theo dịch vụ) → popup hiện thông báo trống thay vì danh sách rỗng im lặng.
- [ ] `disabled` (task không có quyền edit) → nút không click được, không mở popup.

## Nhóm 15 — Retainer: Trigger Payment không còn hiện control vô tác dụng (2026-09-22, §6s)

- [ ] Tạo/mở Case thuộc hợp đồng Retainer → cột "Trigger Payment" trong `TaskManagement.js` hiện text xám "Not applicable — auto on schedule", **không** hiện checkbox.
- [ ] Mở `TaskDetailView.js` của cùng task đó → hiện text "Not applicable — Retainer billing runs automatically on its own schedule.", **không** hiện checkbox/Select nào.
- [ ] By Case và By Service: xác nhận không có gì thay đổi so với trước (chỉ Retainer bị ảnh hưởng bởi thay đổi này).

## Nhóm 16 — PaymentCreateBlock.js: tổng Retainer, tag dịch vụ, outStandingAmount/paymentStatus (2026-09-22, §6u)

- [ ] Mở form tạo Payment từ 1 Payment Request của hợp đồng Retainer (có `contractBillingPlans` active) → "Contract value"/tổng hợp đồng hiện đúng bằng `totalAmount` của billing plan đang active, không còn dựa vào `monthlyFee × retainerDuration` (cột đã bị xoá khỏi DB).
- [ ] Mở form tạo Payment từ 1 Payment Request của hợp đồng By Case đã tag dịch vụ (§6h) → thanh tóm tắt phía trên bảng đợt thanh toán hiện đúng tên (các) dịch vụ được tag cho Payment Request đó ("Service(s): ...").
- [ ] Payment Request không có tag dịch vụ nào (dữ liệu cũ trước §6h) → không hiện dòng "Service(s)" (không hiện rỗng/lỗi).
- [ ] Với mọi hợp đồng đã chọn (Retainer/By Case/By Service, cả nhánh bảng đợt thanh toán lẫn nhánh tổng hợp) → hiện đúng Tag trạng thái thanh toán của hợp đồng (Unpaid/Partial/Paid, đúng màu) và dòng "Outstanding: ..." lấy trực tiếp từ `contracts.outStandingAmount`.
- [ ] Chọn hợp đồng qua "By contract" (không qua Payment Request) → vẫn hiện đúng Tag trạng thái + Outstanding; không hiện "Service(s)" (vì không có Payment Request cụ thể để tra tag).
- [ ] Đổi Mode (By invoice/By contract/Manual) hoặc chọn hợp đồng khác → "Service(s)" cũ được xoá, không bị "dính" tag của hợp đồng/Payment Request trước đó.
