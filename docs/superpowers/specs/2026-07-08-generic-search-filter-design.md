# Generic Search/Filter Block — Design Spec

## Bối cảnh

Repo hiện có 3 JS Field block filter độc lập (`JsField/JsStatusFilter.js`,
`JsField/JsProjectFilter.js`, `JsField/JsLeadFilter.js`), tất cả đều phục vụ
module `legalReference`. Cả 3 dùng chung một khuôn mẫu: một `CONFIG` object ở
đầu file (targetBlockUid, tableName, các nhóm filter với `enable`/`filterKey`)
rồi áp filter lên block đích qua
`ctx.engine.getModel(targetBlockUid).resource.addFilterGroup(key, filter)`.

Vấn đề: mỗi lần cần filter cho một module mới (Case, Contract, Quotation,
Task, Document...), phải copy nguyên file rồi viết lại tay các hàm build
filter, các hook fetch options, và phần render — dù logic bên dưới gần như
giống hệt nhau.

## Mục tiêu

Tạo một file JS block mẫu — `JsField/GenericSearchFilter.js` — mà việc thêm
filter cho module mới chỉ cần sửa một `CONFIG` object khai báo (filter type,
field, label, nguồn dữ liệu...), không cần viết thêm logic JS nào. Toàn bộ
phần "engine" bên dưới CONFIG dùng chung cho mọi module.

## Ngoài phạm vi (non-goals)

- Không migrate 3 file filter cũ (`JsStatusFilter.js`, `JsProjectFilter.js`,
  `JsLeadFilter.js`) sang engine mới — chúng tiếp tục phục vụ `legalReference`
  như hiện tại, không đổi.
- Không làm UI "advanced panel" thu gọn/mở rộng — layout là 1 thanh flex-wrap
  duy nhất.
- Không hỗ trợ overdue-preset kiểu cứng (today/tomorrow/4-days-later) như
  `JsProjectFilter` — filter ngày chỉ ở dạng khoảng từ-đến (range) generic.
- Không xử lý phân trang/persist filter qua URL — phạm vi chỉ là áp filter
  lên block đích qua `resource.addFilterGroup`.

## Mô hình triển khai

`JsField/GenericSearchFilter.js` là **file mẫu dùng chung**. Để dùng cho một
module cụ thể:

1. Copy toàn bộ nội dung file.
2. Dán vào một JS Field/Action block mới trong Nocobase, gắn trên trang của
   module đó.
3. Sửa duy nhất object `CONFIG` ở đầu file (UID, tên collection, danh sách
   filter).
4. Không sửa bất kỳ dòng nào bên dưới comment `// ===== ENGINE — KHÔNG SỬA
   BÊN DƯỚI DÒNG NÀY =====`.

Đây là bản mở rộng của pattern `POPUP_VIEW_UIDS` đã dùng trong
`CaseCreateForm.js`/`ContractCreateForm.js`/`QuotationCreateForm.js` — một
config block khai báo ở đầu file, phần còn lại là logic thuần.

## Schema CONFIG

```js
const CONFIG = {
  targetBlockUid: '',      // UID block table/kanban/list cần lọc — bắt buộc
  tableName: '',            // tên collection, vd "cases", "contracts"
  extraFilter: {},          // filter luôn áp dụng ngầm (optional)

  filters: [
    // type: 'status' — buttons/select trạng thái, có đếm số lượng
    {
      type: 'status',
      key: 'status',                 // định danh duy nhất trong mảng filters
      field: 'status',               // field trên tableName
      label: 'Trạng thái',
      options: [
        { value: 'toDo', label: 'Chưa làm' },
        { value: 'inProgress', label: 'Đang làm' },
        { value: 'done', label: 'Hoàn thành' },
      ],
      showCounts: true,              // mặc định true; đặt false để tắt count
    },

    // type: 'relation' — dropdown chọn 1 giá trị từ 1 collection khác
    {
      type: 'relation',
      key: 'company',
      field: 'internalCompanyId',    // field FK trên tableName
      relationKey: null,             // optional — xem ghi chú bên dưới
      label: 'Công ty',
      placeholder: 'Tất cả',
      width: 180,
      source: {
        collection: 'internalCompany',
        labelFields: ['shortName', 'name'], // thử lần lượt, field đầu có giá trị dùng làm label
        excludeValues: [],                   // optional — loại bỏ id khỏi options
        sort: 'createdAt',
      },
    },

    // type: 'search' — free-text search nhiều field ($iLike)
    {
      type: 'search',
      key: 'search',
      label: 'Tìm kiếm',
      fields: ['title', 'code', 'description'],
      placeholder: 'Tìm theo tên, mã...',
    },

    // type: 'dateRange' — khoảng ngày từ-đến trên 1 field
    {
      type: 'dateRange',
      key: 'signedDate',
      field: 'signedDate',
      label: 'Ngày ký',
    },
  ],

  currentUserScope: {
    enable: false,
    userFields: ['createdById'],   // field scalar (FK phẳng tới users) so trực tiếp với userId hiện tại
    relationFields: [              // optional — field quan hệ không có FK phẳng
      { field: 'assignees', targetKey: 'userId' }, // so qua assignees.userId
    ],
    emptyWhenUnknown: true,
    validateFields: true,
  },
};
```

**`currentUserScope` hỗ trợ 2 kiểu điều kiện, kết hợp bằng `$or`:**
- `userFields`: field scalar (FK phẳng tới `users`, vd `createdById`,
  `projectManagerId`) — so trực tiếp `{ field: { $eq: userId } }`.
- `relationFields` (optional): field quan hệ không có cột FK phẳng (vd
  `assignees` → `lawyers`, giống cơ chế `relationKey` của filter type
  `relation`) — mỗi entry `{ field, targetKey }` build
  `{ field: { targetKey: { $eq: userId } } }`. `targetKey` là field trên
  record liên quan dùng để so với `userId` hiện tại (thường là `userId` nếu
  quan hệ trỏ tới 1 bảng nhân sự như `lawyers` có sẵn field `userId` liên
  kết tới `users`), mặc định `'id'` nếu không set.

Bổ sung này thay thế phần "không hỗ trợ scope qua quan hệ" trong bản v1 ban
đầu — được thêm khi module Case cần tái tạo đúng logic "Meet Any" của Data
scope gốc (`createdById` HOẶC `projectManagerId` HOẶC `assignees.userId`
bằng current user), xác nhận qua chính "My Cases" — cơ chế cũ trong
`JsProjectFilter.js` (`assigneeRelationField`) vẫn là tài liệu tham khảo,
nhưng giờ generic hoá được qua `relationFields` mà không cần các tham số
phức tạp như `assigneeRelationValueSource`/`assigneeRelationTargetField`.

Ràng buộc:

- `key` phải duy nhất trong `filters[]` (dùng để build filterKey nội bộ:
  `` `${tableName}-${key}-filter` ``).
- `type` chỉ nhận 1 trong 4 giá trị: `status`, `relation`, `search`,
  `dateRange`. Type không hợp lệ → engine log cảnh báo console và bỏ qua
  entry đó (không crash toàn block).
- `filters` có thể rỗng hoặc chứa nhiều entry cùng `type` (vd 2 dropdown
  relation khác field).

## Kiến trúc engine

### Helper thuần (tái dùng nguyên từ 3 file cũ, không đổi hành vi)

- `extractId(value)` — lấy id từ object/scalar.
- `normalizeFilterId(value)` — ép về number nếu là numeric string.
- `uniqueFilterIds(values)` — dedupe danh sách id.
- `isEmptyFilter(filter)` — object rỗng hay không.
- `combineFilters(...filters)` — gộp nhiều filter bằng `$and`, bỏ qua filter
  rỗng.
- `getNoRecordFilter()` — `{ id: { $eq: -1 } }`, dùng khi cần "không trả về
  gì" (fallback `currentUserScope.emptyWhenUnknown`).
- `getCurrentUserFromCtx()` / `getResponseRecord(res)` — resolve current user
  qua `ctx.currentUser` hoặc `auth:check`.

### `buildFilterFor(filterDef, value)`

Hàm switch theo `filterDef.type`, trả về Nocobase filter object (hoặc `{}`
nếu value rỗng/"all"):

| type | Input value | Output filter |
|---|---|---|
| `status` | `'all'` hoặc status key | `{}` nếu `'all'`, ngược lại `{ [field]: value }` |
| `relation` | id được chọn hoặc `undefined` | `{}` nếu rỗng, ngược lại `{ [field]: value }` — hoặc `{ [field]: { [relationKey]: value } }` nếu `relationKey` được set |
| `search` | chuỗi tìm kiếm | `{}` nếu rỗng sau `trim()`, ngược lại `{ $or: fields.map(f => ({ [f]: { $iLike: `%${q}%` } })) }` |
| `dateRange` | `{ from, to }` (ISO string hoặc rỗng) | `{}` nếu cả 2 rỗng; ngược lại `$and` gồm `{ [field]: { $gte: from } }` (nếu có `from`) và `{ [field]: { $lte: to } }` (nếu có `to`) |

**`relationKey` (optional, chỉ áp dụng cho `type: 'relation'`):** đa số quan hệ
`belongsTo` có sẵn cột FK phẳng trên `tableName` (vd `internalCompanyId`) nên
filter trực tiếp `{ field: id }` là đủ. Một số quan hệ (vd `Assignees` trên
collection `leads`) không có cột FK phẳng, chỉ filter được qua association
lồng nhau — set `relationKey: 'id'` để engine build
`{ field: { relationKey: id } }` thay vì filter phẳng. Mặc định không set
(giữ hành vi phẳng như cũ).

### `applyFilterGroup(filterKey, filter)`

Giữ nguyên cơ chế hiện có:

```js
const target = ctx.engine?.getModel(CONFIG.targetBlockUid);
if (!target) return;
target.resource.addFilterGroup(filterKey, filter);
await target.resource.refresh();
```

Mỗi filter trong `CONFIG.filters` có filterKey riêng, áp độc lập lên cùng
`targetBlockUid` — Nocobase tự AND các filter-group lại khi resource refresh
(đúng cơ chế 3 file cũ đang dùng, không thay đổi).

### `useCurrentUserScope()`

Generalize nguyên logic từ `JsStatusFilter.js`/`JsProjectFilter.js`: resolve
`currentUser` qua `auth:check`, validate từng field trong
`CONFIG.currentUserScope.userFields` còn tồn tại trên `CONFIG.tableName`
bằng 1 API call thử (bỏ field lỗi thay vì throw), build filter theo
`userFields`, fallback `getNoRecordFilter()` khi
`emptyWhenUnknown` và không resolve được userId.

### `useRelationOptions(filterDef)`

Hook generic thay cho `useCompanies`/`useUsers` cũ — với mỗi filter
`type: 'relation'`, fetch `filterDef.source.collection` (`pageSize: 500`,
`sort: filterDef.source.sort`), map thành `{ value, label }` với label lấy
theo thứ tự `filterDef.source.labelFields` (field đầu có giá trị non-empty
được dùng), loại bỏ id nằm trong `filterDef.source.excludeValues`.

### `useStatusCounts(activeValues, currentUserScopeFilter)`

Generalize `useStats` cũ. Chỉ chạy cho các filter `type: 'status'` có
`showCounts !== false`. Với mỗi filter status đó, với mỗi option, gọi:

```js
ctx.api.request({
  url: `${CONFIG.tableName}:list`,
  params: {
    pageSize: 1,
    filter: JSON.stringify(combineFilters(
      CONFIG.extraFilter,
      currentUserScopeFilter,
      ...otherActiveFilters,   // filter hiện tại của MỌI filter khác (không phải chính status filter này)
      buildFilterFor(statusFilterDef, option.value),
    )),
  },
});
```

Kết quả lưu vào `counts[filterKey][optionValue]`, hiển thị trong label của
Select option (`"Đang làm (12)"`).

### Đăng ký reload

```js
useEffect(() => {
  const engine = ctx.engine || ctx.app;
  if (!engine) return;
  if (!engine.__nocobaseReloaders) engine.__nocobaseReloaders = new Set();
  engine.__nocobaseReloaders.add(refetchCounts);
  return () => engine.__nocobaseReloaders.delete(refetchCounts);
}, [refetchCounts]);
```

Giữ đúng contract với `JsField/JsActionReloadData.js` (nút "Reload data"
trigger lại mọi filter block đã đăng ký vào `__nocobaseReloaders`).

## UI

Một thanh ngang `display: flex; flex-wrap: wrap; gap: 12px`, mỗi entry trong
`CONFIG.filters` render 1 control theo `type`, thứ tự đúng thứ tự khai báo
trong mảng:

- `status` → `Select` (size small), option label kèm count nếu
  `showCounts !== false`.
- `relation` → `Select` `allowClear showSearch`, width theo
  `filterDef.width` (mặc định 180).
- `search` → `Input.Search` `allowClear enterButton`, `flex: 1, minWidth: 200`.
- `dateRange` → 2 `DatePicker` (từ/đến) đặt cạnh nhau trong 1 nhóm.

Không có toggle thu gọn/mở rộng — nếu số filter nhiều, hàng tự wrap xuống
dòng tiếp theo (CSS flex-wrap).

Trạng thái loading (options relation đang fetch, hoặc counts đang tính) hiển
thị `<Spin size="small" />` thay chỗ control tương ứng, không chặn toàn bộ
thanh filter.

## Edge cases

- `targetBlockUid` rỗng hoặc không resolve được model → `applyFilterGroup` no-op,
  log `console.warn`, không throw.
- `filters: []` → chỉ còn thanh trống (hoặc không render gì nếu
  `currentUserScope.enable` cũng false) — không lỗi.
- Field khai báo sai chính tả trong `filters[].field`/`fields` → API trả lỗi
  ở lần gọi đầu tiên khi user tương tác với đúng filter đó; lỗi được bắt và
  log, không crash các filter khác (mỗi hàm áp filter đều wrap try/catch độc
  lập theo đúng pattern hiện có trong 3 file cũ).
- `currentUserScope.validateFields: true` nhưng field không tồn tại → field
  đó bị loại khỏi `userFields` hiệu lực (không throw), giữ đúng hành vi cũ.
- Nhiều filter cùng `type: 'relation'` trỏ cùng 1 `source.collection` — mỗi
  filter fetch độc lập (không cache chung giữa các entry) để tránh coupling
  giữa các filter — chấp nhận đánh đổi thêm 1-2 API call thay vì thêm cơ chế
  cache phức tạp không cần thiết ở v1.

## Kế hoạch xác minh

- `node --check JsField/GenericSearchFilter.js` sau khi viết xong.
- Không có Nocobase runtime thật để chạy trong session này — không thể test
  UI trực tiếp trong trình duyệt. Sau khi user dán file vào 1 block thật với
  `targetBlockUid`/`tableName`/`filters` cụ thể, cần user tự xác nhận trên
  UI Nocobase thật (đổi status, đổi relation, gõ search, chọn date range,
  bấm "Reload data") trước khi coi là hoàn tất cho module đó.
