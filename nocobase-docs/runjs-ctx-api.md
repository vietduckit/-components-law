# RunJS — Ctx API Complete Reference
Source: https://docs.nocobase.com/runjs/

## Execution Environment

- Top-level `await` được hỗ trợ — không cần bọc IIFE
- `ctx.render()` hỗ trợ **JSX**, DOM node, hoặc HTML string (không bắt buộc dùng `React.createElement`)
- Global injected: `window`, `document`, `navigator`, `ctx`

## ctx — Toàn bộ API

### Data / Field
| Property | Mô tả |
|---|---|
| `ctx.getValue()` | Lấy giá trị field hiện tại (JsField block) |
| `ctx.setValue(v)` | Set giá trị field (JsField block) |
| `ctx.getVar(name)` | Lấy biến từ workflow hoặc block context |
| `ctx.model` | Model của block hiện tại |
| `ctx.blockModel` | Block-level model (alias của ctx.model thường) |
| `ctx.collection` | Tên collection hiện tại |
| `ctx.collectionField` | Field definition của field hiện tại |
| `ctx.dataSource` | Data source hiện tại |
| `ctx.record` | Record hiện tại trong block |

### HTTP / Database
| Property | Mô tả |
|---|---|
| `ctx.api.request(config)` | REST API client (xem CLAUDE.md) |
| `ctx.request(config)` | Alias ngắn hơn của ctx.api.request |
| `ctx.sql(query, params?)` | Truy vấn SQL trực tiếp (chỉ dùng khi thực sự cần) |

### UI / Navigation
| Property | Mô tả |
|---|---|
| `ctx.render(jsx\|dom\|html)` | Render vào container của block |
| `ctx.element` | DOM container reference của block |
| `ctx.openView(uid, options)` | Mở view/popup (xem CLAUDE.md) |
| `ctx.modal` | Ant Design modal instance |
| `ctx.message` | Toast: `.success()`, `.error()`, `.warning()`, `.info()` |
| `ctx.notification` | Notification panel (khác với message toast) |

### Libraries
| Property | Mô tả |
|---|---|
| `ctx.React` | React library (hooks đầy đủ) |
| `ctx.antd` | Ant Design components |
| `ctx.importAsync(url)` | Load ESM module từ URL/package name |
| `ctx.requireAsync(url)` | Load UMD/AMD module từ URL/package name |

### Events
| Property | Mô tả |
|---|---|
| `ctx.on(event, handler)` | Lắng nghe event của Nocobase |
| `ctx.off(event, handler)` | Hủy lắng nghe |

### i18n
| Property | Mô tả |
|---|---|
| `ctx.i18n` | i18n instance |
| `ctx.t(key)` | Translate string |

### Control Flow
| Property | Mô tả |
|---|---|
| `ctx.exit()` | Dừng thực thi block hiện tại |
| `ctx.exitAll()` | Dừng tất cả block đang chạy |
| `ctx.logger` | Console logger với namespace |

## Render Examples

```javascript
// JSX (được hỗ trợ chính thức — không cần React.createElement)
ctx.render(<button onClick={() => ctx.message.success('ok')}>Click</button>);

// React Component với JSX
function MyComp() {
  const [n, setN] = ctx.React.useState(0);
  return <button onClick={() => setN(n+1)}>Count: {n}</button>;
}
ctx.render(<MyComp />);

// DOM node
const div = document.createElement('div');
div.textContent = 'Hello';
ctx.render(div);

// HTML string
ctx.render('<h2 style="color:red">Hello</h2>');
```

## Import Examples

```javascript
// ESM (ưu tiên dùng cách này)
const { default: dayjs } = await ctx.importAsync('dayjs');
const Quill = await ctx.importAsync('https://cdn.jsdelivr.net/npm/quill@2.0.3/+esm');

// UMD/AMD
const _ = await ctx.requireAsync('lodash');
```

## ctx.sql — Direct SQL

```javascript
// Chỉ dùng khi API không đủ (ví dụ: complex JOIN, aggregation)
const result = await ctx.sql(`
  SELECT id, name FROM projects WHERE status = $1
`, ['inProgress']);
// result: array of row objects
```

## ctx.on / ctx.off — Events

```javascript
// Lắng nghe khi record được save
ctx.on('record:save', (record) => {
  console.log('Saved:', record);
});

// Cleanup khi block unmount
ctx.on('unmount', () => {
  ctx.off('record:save', handler);
});
```

## Nocobase API — Filter/Params Reference

```javascript
await ctx.api.request({
  url: "collection:list",          // :list | :get | :create | :update | :destroy
  method: "GET",                   // GET mặc định cho list/get, POST cho create
  params: {
    pageSize: 200,
    page: 1,
    appends: ["relation1", "relation2.nestedRel"],
    fields: ["id", "name", "status"],       // Chỉ lấy các field cần
    filter: JSON.stringify({ ... }),
    sort: ["-createdAt", "name"],           // - = DESC
  },
  data: { ... }                    // Body cho create/update
});

// Response shape
// { data: { data: [...], meta: { count, totalPage, page, pageSize } } }
// Hoặc cho :get/:create/:update: { data: { data: {...} } }
```

## Swagger API Docs (self-hosted)

Truy cập tại: `http://localhost:13000/admin/settings/api-doc/documentation`

Namespace:
- `/api/swagger:get` — tất cả
- `/api/swagger:get?ns=core` — core APIs
- `/api/swagger:get?ns=collections` — collection APIs
- `/api/swagger:get?ns=collections/{name}` — API của 1 collection cụ thể
