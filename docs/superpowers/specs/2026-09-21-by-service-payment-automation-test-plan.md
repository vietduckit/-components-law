# Test Plan — By Service & By Case Payment Automation

Date: 2026-09-21

Covers the unified contract payment data model (`docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md`) after all fixes/revisions through 2026-09-21: catch-up trigger for tasks done before a contract exists, priority/due-date/note defaults on PR creation, removal of the `contractType` gate on the `isPaymentTrigger` checkbox, and the `ListView`/`ServiceSection` prop-threading bug fix in `TaskManagement.js`.

Check each box after verifying on the dev environment.

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

- [ ] Case By Case: checkbox `isPaymentTrigger` **vẫn hiện** (không còn ẩn) ở cả 3 nơi (CaseCreateForm, TaskDetailView, TaskManagement); field "Đợt thanh toán sẽ kích hoạt khi Done" (By Case) **vẫn hiện đúng** riêng cho loại này.
- [ ] Case Retainer: checkbox `isPaymentTrigger` vẫn hiện (không ẩn); field "Đợt thanh toán..." **không** hiện (đúng, vì gate riêng cho field đó vẫn giữ nguyên theo `byCase`).
- [ ] Case không có hợp đồng: checkbox vẫn hiện bình thường.

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
