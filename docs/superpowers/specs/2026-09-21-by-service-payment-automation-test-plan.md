# Test Plan — Contract → Case → Payment Request → Payment/Invoice

Date: 2026-09-21

Covers the full contract-to-payment pipeline plus the unified contract payment data model automation (`docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md`) after all fixes/revisions through 2026-09-21: catch-up trigger for By Service tasks done before a contract exists, the mirror fix for By Case (a task already done before being linked to an installment), priority/due-date/note defaults on PR creation, removal of the `contractType` gate on the `isPaymentTrigger` checkbox, and the `ListView`/`ServiceSection` prop-threading bug fix in `TaskManagement.js`. Retainer was checked and confirmed to have no equivalent gap.

**Phần A** below is the real end-to-end pipeline (Contract → Case → tasks → Payment Request → Payment/Invoice) — start here. **Phần B** is the detailed, component-level automation checks already covered earlier this session — use it if Phần A surfaces something that needs narrowing down.

Check each box after verifying on the dev environment.

---

# Phần A — Quy trình đầy đủ: Contract → Case → PR → Payment/Invoice

Test toàn bộ vòng đời thật, không chỉ riêng phần trigger tự động. Mỗi flow đi từ lúc tạo Hợp đồng cho tới lúc có Payment/Invoice thật được tạo ra và liên kết đúng ngược lại Payment Request.

## A1 — Full pipeline: By Case

- [ ] **Tạo Contract** type By Case, đủ 2-3 đợt thanh toán (vd 30%/30%/40%), mỗi đợt chọn `triggerType` khác nhau (`on_signed`/`on_task_done`/`on_case_done`), 1 đợt có set sẵn dueDate lúc tạo.
- [ ] Sau khi lưu hợp đồng, xác nhận `contractPaymentSchedules` có đủ số dòng đúng %, và mỗi dòng đã tự tạo 1 `paymentRequests` tương ứng (`status='pending'` hoặc `'active'` nếu là `on_signed` + có dueDate).
- [ ] **Tạo Case** từ Contract đó → xác nhận `projects.contractId` đúng, `contractServices`/`projectServices` được đồng bộ đủ.
- [ ] Với đợt `on_task_done`: vào Task Detail của case, chọn đúng "Đợt thanh toán sẽ kích hoạt khi Done" → đánh dấu task Done → PR của đợt đó chuyển `conditionMet=true`, và nếu có dueDate thì `status='active'`.
- [ ] Với đợt `on_case_done`: đánh dấu hết toàn bộ task trong case (case tự chuyển Done) → PR của đợt `on_case_done` tự `conditionMet=true`.
- [ ] Set `dueDate` cho các PR còn `pending` (chưa có sẵn) → xác nhận tự chuyển `active`.
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

- [ ] `CaseCreateForm.js` / `TaskManagement.js`: checkbox `isPaymentTrigger` hiện cho mọi loại hợp đồng, kể cả chưa có hợp đồng.
- [ ] `TaskDetailView.js` (đã hợp nhất 2026-09-21): chỉ còn **1 checkbox** "Task này là điều kiện thanh toán" cho mọi loại hợp đồng — không còn hiện 2 control tách rời như trước.
  - [ ] Case **By Case**: tick checkbox → **không** ghi `isPaymentTrigger`, chỉ hiện thêm Select "Chọn đợt thanh toán..." bên dưới. Chọn 1 đợt → ghi đúng `linkedPaymentRequestId`. Bỏ tick 1 task **đã có** đợt liên kết → xoá ngay `linkedPaymentRequestId` (set null), ẩn Select.
  - [ ] Case **By Service**: tick/bỏ tick ghi thẳng `isPaymentTrigger` như cũ, không hiện Select.
  - [ ] Case **Retainer/không hợp đồng**: tick vẫn ghi `isPaymentTrigger` (không có tác dụng gì ở backend, đúng như thiết kế) — không hiện Select.
  - [ ] Mở lại 1 task **đã có sẵn** `linkedPaymentRequestId` từ trước → checkbox tự tick sẵn, Select tự hiện với đúng giá trị đã chọn (không cần bấm gì thêm).
  - [ ] Đóng modal, mở sang task khác → trạng thái "đang hiện Select" không bị dính từ task trước (mỗi task load đúng trạng thái riêng của nó).

## Nhóm 5b — Fix hiển thị label Select (không còn hiện raw ID)

- [ ] Task đã liên kết với 1 PR **đã chuyển `active`** (không còn `pending`) → mở Task Detail → Select vẫn hiện đúng label "Đợt N - ..." thay vì hiện số ID thô.

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
