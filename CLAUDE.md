# components-law — Nocobase Legal Practice Management

Hệ thống quản lý công ty luật xây dựng trên nền tảng **Nocobase** (low-code, plugin-based). Code trong repo này là các **JS Field/Action blocks** chạy bên trong Nocobase runtime — không phải standalone app.

## Tài liệu tham khảo chi tiết (đọc khi cần)

- [nocobase-docs/runjs-ctx-api.md](nocobase-docs/runjs-ctx-api.md) — **Toàn bộ ctx API** (ctx.sql, ctx.on/off, ctx.modal, ctx.getVar, import ESM/UMD...)
- [nocobase-docs/field-types-collections.md](nocobase-docs/field-types-collections.md) — Field types, collection types, relation types
- [nocobase-docs/workflows.md](nocobase-docs/workflows.md) — Workflow triggers, nodes, tích hợp với JS block
- [nocobase-docs/document-system.md](nocobase-docs/document-system.md) — Document system
- [nocobase-docs/document-inline-edit-upload-grouping-pattern.md](nocobase-docs/document-inline-edit-upload-grouping-pattern.md) — Pattern chuẩn cho inline-edit metadata (Table view) + gom nhóm multi-file upload thành folder; đọc trước khi thêm/sửa 2 tính năng này ở bất kỳ file document nào (Library.js, CaseDocument.js, CustomerDocument.js, ...)
- [nocobase-docs/library-js-architecture-reference.md](nocobase-docs/library-js-architecture-reference.md) — Tổng kết toàn bộ kiến trúc/business logic/UI-UX của Library.js (permission model, navigation, CRUD flows, components) — dùng làm chuẩn khi tối ưu/đồng bộ CaseDocument.js hoặc file document khác

---

## Cấu trúc thư mục

```
All Module/          # Business modules (Case, Contract, Quotation, Task, Document, Note)
JsField/             # Custom JS Field/Action blocks tái sử dụng
pgsql/               # PostgreSQL trigger functions (activity log, auto-set, protect fields)
nocobase-docs/       # Tài liệu Nocobase đã distill (đọc khi cần, không load tự động)
```

---

## Nocobase Runtime API (`ctx`)

Mọi JS block đều nhận `ctx` là interface chính. Không dùng `fetch()` hay `import` trực tiếp.

### HTTP / Data
```javascript
// List
const r = await ctx.api.request({
  url: "collectionName:list",          // hoặc :get, :create, :update, :destroy
  params: {
    pageSize: 500, page: 1,
    appends: ["relation1", "relation2"],
    filter: JSON.stringify({ field: { $eq: value } })
  }
});
const rows = r?.data?.data || [];
const total = r?.data?.meta?.count;

// Create / Update
await ctx.api.request({
  url: "collectionName:create",
  method: "POST",
  data: { field1: v1, field2: v2 }
});
```

### UI / Navigation
```javascript
ctx.openView(viewUid, {
  mode: "dialog",          // dialog | drawer | window
  size: "large",           // large | middle | small
  title: "Tiêu đề",
  params: { filterbytk: recordId },
  inputArgs: { customKey: value }
});

ctx.message.success("Thành công");
ctx.message.error("Lỗi");
```

### Record / Form
```javascript
ctx.record          // record hiện tại trong block (read-only)
ctx.form            // Ant Design form instance
await ctx.form.validateFields()
ctx.form.getFieldsValue(true)

// Chỉ dùng trong JsField block:
ctx.getValue()      // giá trị field hiện tại
ctx.setValue(v)     // set giá trị field
```

### Thư viện & Utilities
```javascript
ctx.React                          // React (hooks: useState, useEffect, useCallback, useMemo, useRef)
ctx.antd                           // Ant Design components
ctx.importAsync("https://cdn...")  // Load ESM module (ưu tiên)
ctx.requireAsync("https://cdn...") // Load UMD/AMD module
ctx.sql(`SELECT ...`, [params])    // Query SQL trực tiếp (dùng khi API không đủ)
ctx.on(event, handler)             // Lắng nghe Nocobase event
ctx.off(event, handler)            // Hủy lắng nghe
ctx.getVar("name")                 // Lấy variable từ workflow/block context
ctx.logger                         // Console logger
ctx.exit() / ctx.exitAll()         // Dừng thực thi block
```

### Reload / Filter block
```javascript
// Reload một block theo UID
const model = ctx.engine.getModel(blockUid);
model.resource.refresh();

// Áp filter lên block
model.resource.addFilterGroup("filterKey", { field: { $eq: val } });
model.resource.removeFilterGroup("filterKey");
```

---

## Cấu trúc JS Block

```javascript
// Mọi block đều là module tự-thực thi, nhận ctx
const { React, antd } = ctx;
const { useState, useEffect } = React;
const { Button, message } = antd;

function MyComponent() {
  const [data, setData] = useState([]);

  useEffect(() => {
    ctx.api.request({ url: "collection:list", params: { pageSize: 100 } })
      .then(r => setData(r?.data?.data || []));
  }, []);

  // ctx.render hỗ trợ JSX, DOM node, hoặc HTML string
  return <Button onClick={() => {}}>Click</Button>;
}

ctx.render(<MyComponent />);
```

> **ctx.render() hỗ trợ JSX chính thức** — có thể dùng JSX hoặc `React.createElement()` tùy ý.

---

## Filter Syntax

```javascript
// Operators
{ field: { $eq: v } }           // bằng
{ field: { $ne: v } }           // khác
{ field: { $in: [a, b] } }      // trong mảng
{ field: { $notIn: [a, b] } }   // ngoài mảng
{ field: { $between: [a, b] } } // khoảng
{ field: { $includes: str } }   // contains (string)
{ rel: { id: { $eq: id } } }    // nested relation

// Kết hợp
{ $and: [ { f1: { $eq: 1 } }, { f2: { $eq: 2 } } ] }
{ $or:  [ { f1: { $eq: 1 } }, { f2: { $eq: 2 } } ] }
```

---

## Collections (bảng chính)

| Collection | Mô tả |
|---|---|
| `projects` / cases | Hồ sơ / vụ án |
| `tasks` | Công việc trong hồ sơ |
| `subtasks` | Công việc con |
| `quotations` | Báo giá |
| `quotationServices` | Dịch vụ trong báo giá |
| `contracts` | Hợp đồng |
| `contractServices` | Dịch vụ trong hợp đồng |
| `documents` | Tài liệu / file |
| `folders` | Thư mục tài liệu |
| `customers` | Khách hàng / công ty |
| `users` | Luật sư / nhân viên |
| `services` | Danh mục dịch vụ |
| `legalReference` | Văn bản pháp luật |
| `internalTemplate` | Mẫu nội bộ |

---

## Status Configs

Mỗi module có object `STATUS_CFG` dạng:
```javascript
const STATUS_CFG = {
  toDo:       { label: "Cần làm",      color: "#595959", bg: "#f5f5f5", border: "#d9d9d9" },
  inProgress: { label: "Đang làm",     color: "#0958d9", bg: "#e6f4ff", border: "#91caff" },
  done:       { label: "Hoàn thành",   color: "#389e0d", bg: "#f6ffed", border: "#b7eb8f" },
  cancelled:  { label: "Hủy",          color: "#8c8c8c", bg: "#fafafa", border: "#d9d9d9" },
};
// Áp dụng: <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
```

---

## Tài chính (Financial)

```javascript
const PRICING_MODE_LINE    = "line";        // Tính theo từng dòng
const PRICING_MODE_PACKAGE = "package";     // Trọn gói
const PRICING_MODE_SCOPE   = "scopeOnly";   // Chỉ phạm vi, không tính tiền

// Các hàm helper (xem CaseServices.js, CaseCreateForm.js)
parseNum(v)                 // Chuỗi → số (bỏ format)
fmtVND(v)                  // Số → "1.000.000 ₫"
isPackagePricing(record)   // boolean
inferVatRate(sub, vat, fb) // Tính % VAT từ số tiền
```

---

## PostgreSQL Triggers (pgsql/)

Mọi activity log được ghi bởi **trigger**, không phải app code:
- `log_activity_documents.sql` — theo dõi INSERT/UPDATE/DELETE trên documents
- `resolve_display_value.sql` — resolve label của relation fields
- `compact_document_share_activity.sql` — gộp các log chia sẻ liên tiếp
- `ProtectRelationalFields.sql` — bảo vệ trường quan hệ

Pattern trigger:
```sql
CREATE OR REPLACE FUNCTION fn_log_activity_documents()
RETURNS TRIGGER AS $$
BEGIN
  -- resolve parent (case / task / contract / quotation)
  -- insert into activity_log
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Patterns phổ biến

```javascript
// Avatar từ tên
const initials = name => name.trim().split(/\s+/).map(w => w[0]).slice(0,2).join("").toUpperCase();
const avatarBg = name => { const cs=["#2563eb","#7c3aed","#059669",...]; let h=0; for(let c of name) h=(h*31+name.charCodeAt(0))%cs.length; return cs[h]; };

// Format ngày
const fmtDate = d => { if(!d) return "—"; const dt=new Date(d); return `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`; };

// Safe parse
const safeNum = v => parseFloat(String(v).replace(/[^\d.-]/g,"")) || 0;
```

---

## View UIDs

View UIDs là chuỗi 8–12 ký tự alphanumeric được hardcode (ví dụ `"v44ehxkcghx"`). Khi thêm navigation mới, lấy UID từ Nocobase UI > View Settings > UID.

---

## Quy tắc khi viết code mới

1. Không dùng `fetch()` — chỉ dùng `ctx.api.request()` hoặc `ctx.request()`
2. JSX được hỗ trợ — dùng JSX hoặc `React.createElement()` đều được
3. Không import trực tiếp — dùng `ctx.React`, `ctx.antd`, `ctx.importAsync()`, `ctx.requireAsync()`
4. Activity log = trigger SQL, không ghi từ JS
5. Mọi số tiền hiển thị theo định dạng VND
6. Status label + màu lấy từ `STATUS_CFG` object, không hardcode inline
7. Dùng `ctx.sql()` chỉ khi cần query phức tạp không làm được qua API (complex JOIN, aggregation)