# OnlyOffice In-Browser Editing Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let luật sư sửa trực tiếp một file `.docx` sinh ra từ Task Template Generate flow ngay trong trình duyệt (thay vì chỉ xem read-only), lưu lại thành một document/attachment mới mỗi lần đóng trình soạn thảo, giữ toàn bộ lịch sử phiên bản.

**Architecture:** Một Nocobase plugin server-side (`plugin-onlyoffice`) đăng ký 2 action (`onlyoffice:getConfig`, `onlyoffice:callback`) để cầu nối giữa Nocobase và một container OnlyOffice Document Server CE riêng. Frontend (`TaskDetailView.js`) thêm action "Sửa trực tuyến" mở modal nhúng `DocsAPI.DocEditor`; khi luật sư đóng trình soạn thảo, Document Server tự gọi callback về plugin, plugin tải file đã sửa và tạo bản ghi `documents`/`attachments` mới nối vào chuỗi version qua `previousVersionId`/`rootDocumentId`/`versionNumber`.

**Tech Stack:** Nocobase plugin (Node.js, CommonJS — không dùng TypeScript để giữ nhất quán với phần còn lại của dự án là JS thuần, không cần build step), Node built-in `crypto` cho JWT HS256 (không thêm dependency `jsonwebtoken`), Node built-in `node:test` cho unit test, OnlyOffice Document Server CE (Docker), React/Ant Design trong `TaskDetailView.js` theo pattern hiện có của file.

**Spec:** [docs/superpowers/specs/2026-08-18-onlyoffice-editing-plugin-design.md](../specs/2026-08-18-onlyoffice-editing-plugin-design.md)

## Global Constraints

- Không dùng `fetch()` trực tiếp trong code frontend (JS block) — chỉ `ctx.api.request()`. Code plugin (backend, chạy trong Node process của Nocobase) KHÔNG bị ràng buộc này — dùng `fetch` built-in của Node là bình thường.
- Frontend không được `import` — chỉ `ctx.React`, `ctx.antd`, `ctx.requireAsync()`, `ctx.importAsync()`.
- Mọi số tiền/hiển thị VND, status label lấy từ `STATUS_CFG` — không áp dụng cho task này (không đụng tới trường tiền/status).
- `JWT_SECRET` chỉ tồn tại phía server (plugin + container Document Server) — không bao giờ gửi xuống frontend.
- `document.url`/`editorConfig.callbackUrl` trong config OnlyOffice phải dùng hostname nội bộ docker network (`NOCOBASE_INTERNAL_URL`), không dùng domain public.
- Phân quyền hành động dựa trên hệ thống Role/Permission có sẵn của Nocobase (Admin UI) — không viết logic kiểm tra quyền tuỳ biến trong code (theo convention đã thống nhất của dự án).

---

## Task 1: Data model — thêm field version-chain vào collection `documents`

**Files:**
- Không có file code — thao tác qua Nocobase Admin UI (collection `documents`).
- Verify: chạy SQL qua pgAdmin (người dùng tự chạy, giống pattern các file trong `pgsql/`).

**Interfaces:**
- Produces: 3 cột mới trên bảng `documents` mà Task 3 (plugin) và Task 5/6 (frontend) sẽ đọc/ghi: `previousVersionId` (bigint, nullable), `rootDocumentId` (bigint, nullable), `versionNumber` (integer, mặc định 1).

- [ ] **Step 1: Thêm field `previousVersionId`**

Vào Nocobase Admin UI → Collections → `documents` → Configure fields → Add field:
- Field type: **Number** (interface: Number, không dùng Integer riêng vì Nocobase Number field lưu dạng bigint tương thích với các cột id khác trong bảng)
- Name: `previousVersionId`
- Title hiển thị: "Phiên bản trước"
- Không bắt buộc (not required), không có giá trị mặc định.

- [ ] **Step 2: Thêm field `rootDocumentId`**

Cùng cách trên:
- Field type: Number
- Name: `rootDocumentId`
- Title: "Bản gốc (chuỗi phiên bản)"
- Không bắt buộc, không giá trị mặc định.

- [ ] **Step 3: Thêm field `versionNumber`**

- Field type: Number
- Name: `versionNumber`
- Title: "Số phiên bản"
- Default value: `1`

- [ ] **Step 4: Verify bằng SQL**

Chạy qua pgAdmin PSQL Tool:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'documents'
  AND column_name IN ('previousVersionId', 'rootDocumentId', 'versionNumber');
```

Expected: 3 dòng kết quả, đúng tên cột (camelCase, có dấu ngoặc kép khi query), `versionNumber` có `column_default` là `1`.

- [ ] **Step 5: Xác nhận `documentType` không cần thêm giá trị enum**

`documentType` trên `documents` là cột `character varying(50)` tự do (không phải enum) — đã xác nhận qua các giá trị hiện có `"File mẫu"`, `"Generated"` được ghi trực tiếp từ code (`TaskDetailView.js:14301`, `AutoCreateTaskFromTemplate.sql:164`). Giá trị mới `"Edited"` (Task 3 dùng) không cần thao tác Admin UI gì thêm. Không cần bước hành động — chỉ ghi nhận để Task 3 không mất công thêm option enum không tồn tại.

---

## Task 2: Plugin scaffold + pure-logic modules (JWT, version key, version chain, config builder)

**Files:**
- Create: `plugin-onlyoffice/package.json`
- Create: `plugin-onlyoffice/src/server/jwt.js`
- Create: `plugin-onlyoffice/src/server/versionKey.js`
- Create: `plugin-onlyoffice/src/server/versioning.js`
- Create: `plugin-onlyoffice/src/server/config.js`
- Test: `plugin-onlyoffice/src/server/__tests__/jwt.test.js`
- Test: `plugin-onlyoffice/src/server/__tests__/versionKey.test.js`
- Test: `plugin-onlyoffice/src/server/__tests__/versioning.test.js`
- Test: `plugin-onlyoffice/src/server/__tests__/config.test.js`

**Interfaces:**
- Produces (dùng bởi Task 3):
  - `jwt.js`: `signConfig(payload: object, secret: string): string`, `verifyToken(token: string, secret: string): object | null`
  - `versionKey.js`: `buildVersionKey(documentId: string|number): string`, `parseVersionKey(key: string): { documentId: string, timestamp: number } | null`
  - `versioning.js`: `computeNextVersion(currentDoc: { id, rootDocumentId, versionNumber }): { rootDocumentId, previousVersionId, versionNumber }`
  - `config.js`: `buildEditorConfig({ documentId, fileName, fileUrl, callbackUrl, secret }): object` (config đã ký JWT, có field `token`)

Đây là repo Node.js độc lập (không phải JS block Nocobase) — không bị ràng buộc "single-file constraint" của `CLAUDE.md`, nên tách file bình thường theo trách nhiệm.

- [ ] **Step 1: Tạo `package.json`**

```json
{
  "name": "plugin-onlyoffice",
  "version": "0.1.0",
  "private": true,
  "main": "src/server/index.js",
  "scripts": {
    "test": "node --test src/server/__tests__"
  }
}
```

- [ ] **Step 2: Viết test thất bại cho `jwt.js`**

`plugin-onlyoffice/src/server/__tests__/jwt.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { signConfig, verifyToken } = require('../jwt');

test('signConfig produces a 3-part token and verifyToken recovers the payload', () => {
  const payload = { hello: 'world' };
  const token = signConfig(payload, 'secret123');
  assert.equal(token.split('.').length, 3);
  const recovered = verifyToken(token, 'secret123');
  assert.deepEqual(recovered, payload);
});

test('verifyToken rejects a token signed with a different secret', () => {
  const token = signConfig({ a: 1 }, 'secret123');
  assert.equal(verifyToken(token, 'wrong-secret'), null);
});

test('verifyToken rejects a tampered payload', () => {
  const token = signConfig({ a: 1 }, 'secret123');
  const [h, , s] = token.split('.');
  const tamperedPayload = Buffer.from(JSON.stringify({ a: 999 })).toString('base64url');
  const tampered = `${h}.${tamperedPayload}.${s}`;
  assert.equal(verifyToken(tampered, 'secret123'), null);
});

test('verifyToken rejects malformed tokens', () => {
  assert.equal(verifyToken('not-a-jwt', 'secret123'), null);
  assert.equal(verifyToken('', 'secret123'), null);
  assert.equal(verifyToken(null, 'secret123'), null);
});
```

- [ ] **Step 3: Chạy test, xác nhận fail vì `../jwt` chưa tồn tại**

Run: `cd plugin-onlyoffice && node --test src/server/__tests__/jwt.test.js`
Expected: FAIL với lỗi `Cannot find module '../jwt'`

- [ ] **Step 4: Viết `jwt.js`**

```js
const crypto = require('crypto');

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function signConfig(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerPart = base64url(JSON.stringify(header));
  const payloadPart = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerPart}.${payloadPart}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${headerPart}.${payloadPart}.${signature}`;
}

function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signature] = parts;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${headerPart}.${payloadPart}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payloadPart, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

module.exports = { signConfig, verifyToken };
```

- [ ] **Step 5: Chạy lại test, xác nhận pass**

Run: `node --test src/server/__tests__/jwt.test.js`
Expected: PASS (4 tests)

- [ ] **Step 6: Viết test cho `versionKey.js`**

`plugin-onlyoffice/src/server/__tests__/versionKey.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildVersionKey, parseVersionKey } = require('../versionKey');

test('buildVersionKey embeds the document id and a timestamp', () => {
  const key = buildVersionKey('12345');
  assert.match(key, /^doc_12345_\d+$/);
});

test('parseVersionKey recovers documentId and timestamp from a valid key', () => {
  const parsed = parseVersionKey('doc_12345_1700000000000');
  assert.deepEqual(parsed, { documentId: '12345', timestamp: 1700000000000 });
});

test('parseVersionKey returns null for malformed keys', () => {
  assert.equal(parseVersionKey('not-a-key'), null);
  assert.equal(parseVersionKey('doc_abc_123'), null);
  assert.equal(parseVersionKey(null), null);
});
```

- [ ] **Step 7: Chạy test, xác nhận fail (module chưa tồn tại)**

Run: `node --test src/server/__tests__/versionKey.test.js`
Expected: FAIL với lỗi `Cannot find module '../versionKey'`

- [ ] **Step 8: Viết `versionKey.js`**

```js
function buildVersionKey(documentId) {
  return `doc_${documentId}_${Date.now()}`;
}

function parseVersionKey(key) {
  if (typeof key !== 'string') return null;
  const match = /^doc_(\d+)_(\d+)$/.exec(key);
  if (!match) return null;
  return { documentId: match[1], timestamp: Number(match[2]) };
}

module.exports = { buildVersionKey, parseVersionKey };
```

- [ ] **Step 9: Chạy lại, xác nhận pass**

Run: `node --test src/server/__tests__/versionKey.test.js`
Expected: PASS (3 tests)

- [ ] **Step 10: Viết test cho `versioning.js`**

`plugin-onlyoffice/src/server/__tests__/versioning.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeNextVersion } = require('../versioning');

test('computeNextVersion increments from the root document (no prior versionNumber)', () => {
  const result = computeNextVersion({ id: '100', rootDocumentId: null, versionNumber: null });
  assert.deepEqual(result, { rootDocumentId: '100', previousVersionId: '100', versionNumber: 2 });
});

test('computeNextVersion increments from a later version in the chain', () => {
  const result = computeNextVersion({ id: '105', rootDocumentId: '100', versionNumber: 3 });
  assert.deepEqual(result, { rootDocumentId: '100', previousVersionId: '105', versionNumber: 4 });
});

test('computeNextVersion throws when given no document', () => {
  assert.throws(() => computeNextVersion(null), /currentDoc is required/);
});
```

- [ ] **Step 11: Chạy test, xác nhận fail**

Run: `node --test src/server/__tests__/versioning.test.js`
Expected: FAIL với lỗi `Cannot find module '../versioning'`

- [ ] **Step 12: Viết `versioning.js`**

```js
function computeNextVersion(currentDoc) {
  if (!currentDoc) throw new Error('currentDoc is required');
  const rootDocumentId = currentDoc.rootDocumentId || currentDoc.id;
  const versionNumber = (currentDoc.versionNumber || 1) + 1;
  return {
    rootDocumentId,
    previousVersionId: currentDoc.id,
    versionNumber,
  };
}

module.exports = { computeNextVersion };
```

- [ ] **Step 13: Chạy lại, xác nhận pass**

Run: `node --test src/server/__tests__/versioning.test.js`
Expected: PASS (3 tests)

- [ ] **Step 14: Viết test cho `config.js`**

`plugin-onlyoffice/src/server/__tests__/config.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildEditorConfig } = require('../config');
const { verifyToken } = require('../jwt');

test('buildEditorConfig produces a signed config with the given file info', () => {
  const result = buildEditorConfig({
    documentId: '42',
    fileName: 'Hop_dong.docx',
    fileUrl: 'http://nocobase:13000/storage/uploads/Hop_dong.docx',
    callbackUrl: 'http://nocobase:13000/api/onlyoffice:callback',
    secret: 'secret123',
  });
  assert.equal(result.document.title, 'Hop_dong.docx');
  assert.equal(result.document.url, 'http://nocobase:13000/storage/uploads/Hop_dong.docx');
  assert.match(result.document.key, /^doc_42_\d+$/);
  assert.equal(result.editorConfig.callbackUrl, 'http://nocobase:13000/api/onlyoffice:callback');
  assert.equal(result.editorConfig.customization.close.visible, true);
  const verified = verifyToken(result.token, 'secret123');
  assert.equal(verified.document.key, result.document.key);
});
```

- [ ] **Step 15: Chạy test, xác nhận fail**

Run: `node --test src/server/__tests__/config.test.js`
Expected: FAIL với lỗi `Cannot find module '../config'`

- [ ] **Step 16: Viết `config.js`**

```js
const { signConfig } = require('./jwt');
const { buildVersionKey } = require('./versionKey');

function buildEditorConfig({ documentId, fileName, fileUrl, callbackUrl, secret }) {
  const config = {
    document: {
      fileType: 'docx',
      key: buildVersionKey(documentId),
      title: fileName,
      url: fileUrl,
    },
    documentType: 'word',
    editorConfig: {
      callbackUrl,
      customization: {
        close: { visible: true },
      },
    },
  };
  return {
    ...config,
    token: signConfig(config, secret),
  };
}

module.exports = { buildEditorConfig };
```

- [ ] **Step 17: Chạy lại, xác nhận pass**

Run: `node --test src/server/__tests__/config.test.js`
Expected: PASS (1 test)

- [ ] **Step 18: Chạy toàn bộ test suite của plugin**

Run: `cd plugin-onlyoffice && npm test`
Expected: PASS (11 tests tổng cộng across 4 files)

- [ ] **Step 19: Commit**

```bash
git add plugin-onlyoffice/package.json plugin-onlyoffice/src/server/jwt.js plugin-onlyoffice/src/server/versionKey.js plugin-onlyoffice/src/server/versioning.js plugin-onlyoffice/src/server/config.js plugin-onlyoffice/src/server/__tests__
git commit -m "feat(plugin-onlyoffice): add pure-logic modules for JWT signing, version keys and version chains"
```

---

## Task 3: Plugin server wiring — `onlyoffice:getConfig` và `onlyoffice:callback`

**Files:**
- Create: `plugin-onlyoffice/src/server/getConfig.js`
- Create: `plugin-onlyoffice/src/server/callback.js`
- Create: `plugin-onlyoffice/src/server/index.js`

**Interfaces:**
- Consumes: `buildEditorConfig` (từ `config.js`), `verifyToken` (từ `jwt.js`), `parseVersionKey` (từ `versionKey.js`), `computeNextVersion` (từ `versioning.js`) — tất cả từ Task 2.
- Consumes (Nocobase runtime, không nằm trong repo này — chỉ tồn tại khi plugin chạy trong container thật): `app.db.getRepository(collectionName)`, `app.resourcer.registerActionHandler(name, handler)`, `app.acl.allow(resource, action, condition)`, `app.logger`.
- Produces: class `PluginOnlyoffice` (export mặc định của `index.js`) — đây là entrypoint Nocobase load khi cài plugin.

**Lưu ý quan trọng trước khi bắt đầu:** phần này KHÔNG chạy được cục bộ trong repo `components-law` (repo này không chứa mã nguồn Nocobase server) — cần một Nocobase dev instance thật (hoặc server hiện tại của người dùng) để xác nhận API `app.resourcer.registerActionHandler` / `app.acl.allow` đúng với phiên bản Nocobase đang chạy. Step 1 dưới đây là bước xác minh bắt buộc trước khi tin vào phần code còn lại.

- [ ] **Step 1: Xác minh API plugin thật trên server (verification, không phải code)**

Trên server Nocobase thật (qua SSH/docker exec), kiểm tra phiên bản `@nocobase/server` đang chạy:

```bash
docker exec -it <nocobase-container> cat node_modules/@nocobase/server/package.json | grep '"version"'
```

Đối chiếu với tài liệu Nocobase Plugin Development (`https://docs.nocobase.com/development/server/plugin`) đúng phiên bản đó để xác nhận:
1. `this.app.resourcer.registerActionHandler(actionPath, handler)` là API đúng để đăng ký 1 action riêng lẻ (không dùng `resourcer.define()` hai lần cho cùng resource `onlyoffice` — sẽ ghi đè nhau).
2. `this.app.acl.allow(resourceName, actionName, 'public')` là API đúng để cho phép 1 action không cần xác thực.

Nếu 2 API trên khác với phiên bản đang chạy, điều chỉnh `index.js` ở Step 4 cho khớp trước khi tiếp tục — đây là điểm duy nhất trong plan phụ thuộc vào việc xác minh trực tiếp trên môi trường thật thay vì suy luận từ code có sẵn trong repo.

- [ ] **Step 2: Viết `getConfig.js`**

```js
const { buildEditorConfig } = require('./config');

function getConfigHandler(app) {
  return async function getConfig(ctx, next) {
    const { documentId } = ctx.action.params.values || {};
    if (!documentId) ctx.throw(400, 'documentId is required');

    const documentRepo = app.db.getRepository('documents');
    const doc = await documentRepo.findOne({
      filterByTk: documentId,
      appends: ['fileAttachment'],
    });
    if (!doc) ctx.throw(404, 'Document not found');

    const attachments = doc.get('fileAttachment') || [];
    const attachment = [...attachments].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )[0];
    if (!attachment) ctx.throw(404, 'File not found for this document');

    const internalUrl = process.env.NOCOBASE_INTERNAL_URL;
    const docServerPublicUrl = process.env.ONLYOFFICE_DOCSERVER_PUBLIC_URL;
    const secret = process.env.ONLYOFFICE_JWT_SECRET;
    if (!internalUrl || !docServerPublicUrl || !secret) {
      ctx.throw(500, 'OnlyOffice plugin is not configured (missing env vars)');
    }

    const config = buildEditorConfig({
      documentId: doc.get('id'),
      fileName: doc.get('title') || attachment.filename,
      fileUrl: `${internalUrl}${attachment.url}`,
      callbackUrl: `${internalUrl}/api/onlyoffice:callback`,
      secret,
    });

    ctx.body = { config, docServerPublicUrl };
    await next();
  };
}

module.exports = { getConfigHandler };
```

Ghi chú: `fileAttachment` là quan hệ `belongsToMany` (đã xác nhận qua Network tab khi debug preview trước đó trong dự án — `fileAttachment: [{id:1040,...}]`), nên luôn là mảng; lấy attachment mới nhất theo `createdAt`, giống hệt pattern `ORDER BY a."createdAt" DESC LIMIT 1` trong `pgsql/AutoCreateTaskFromTemplate.sql`.

- [ ] **Step 3: Viết `callback.js`**

```js
const path = require('path');
const fs = require('fs/promises');
const { verifyToken } = require('./jwt');
const { parseVersionKey } = require('./versionKey');
const { computeNextVersion } = require('./versioning');

function callbackHandler(app) {
  return async function callback(ctx, next) {
    const body = ctx.request.body || {};
    const secret = process.env.ONLYOFFICE_JWT_SECRET;
    const verified = verifyToken(body.token, secret);
    if (!verified) {
      ctx.status = 403;
      ctx.body = { error: 1 };
      return;
    }

    if (body.status !== 2) {
      ctx.body = { error: 0 };
      return;
    }

    const parsedKey = parseVersionKey(body.key);
    if (!parsedKey) {
      ctx.status = 400;
      ctx.body = { error: 1 };
      return;
    }

    try {
      const documentRepo = app.db.getRepository('documents');
      const attachmentRepo = app.db.getRepository('attachments');

      const currentDoc = await documentRepo.findOne({
        filterByTk: parsedKey.documentId,
        appends: ['fileAttachment'],
      });
      if (!currentDoc) {
        ctx.status = 404;
        ctx.body = { error: 1 };
        return;
      }

      const existingAttachments = currentDoc.get('fileAttachment') || [];
      const currentAttachment = [...existingAttachments].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      )[0];
      if (!currentAttachment) throw new Error('No source attachment on current document');

      const response = await fetch(body.url);
      if (!response.ok) throw new Error(`Failed to download edited file: ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());

      // Ghi file vật lý cạnh file gốc (cùng thư mục storage đang dùng),
      // tên file mới tránh đụng độ — mirror cách attachments.path/url của
      // Nocobase local storage engine đã xác nhận trong dự án (baseUrl
      // "/storage/uploads").
      const dir = path.dirname(currentAttachment.path);
      const ext = currentAttachment.extname || path.extname(currentAttachment.filename || '');
      const newFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const newPath = path.join(dir, newFilename);
      await fs.writeFile(newPath, buffer);

      const newAttachment = await attachmentRepo.create({
        values: {
          title: currentDoc.get('title'),
          filename: newFilename,
          extname: ext,
          size: buffer.length,
          mimetype: currentAttachment.mimetype,
          path: newPath,
          url: currentAttachment.url.replace(currentAttachment.filename, newFilename),
          storageId: currentAttachment.storageId,
          createdById: currentDoc.get('updatedById'),
          updatedById: currentDoc.get('updatedById'),
        },
      });

      const { rootDocumentId, previousVersionId, versionNumber } = computeNextVersion(
        currentDoc.get(),
      );

      await documentRepo.create({
        values: {
          title: currentDoc.get('title'),
          documentType: 'Edited',
          folderId: currentDoc.get('folderId'),
          taskId: currentDoc.get('taskId'),
          collectionName: currentDoc.get('collectionName'),
          customerId: currentDoc.get('customerId'),
          moduleScope: currentDoc.get('moduleScope'),
          storageType: currentDoc.get('storageType'),
          createdById: currentDoc.get('createdById'),
          updatedById: currentDoc.get('updatedById'),
          previousVersionId,
          rootDocumentId,
          versionNumber,
          fileAttachment: [{ id: newAttachment.get('id') }],
        },
      });

      ctx.body = { error: 0 };
    } catch (err) {
      app.logger.error('[plugin-onlyoffice] callback failed', err);
      ctx.status = 500;
      ctx.body = { error: 1 };
    }
    await next();
  };
}

module.exports = { callbackHandler };
```

- [ ] **Step 4: Viết `index.js` (entrypoint plugin)**

```js
const { Plugin } = require('@nocobase/server');
const { getConfigHandler } = require('./getConfig');
const { callbackHandler } = require('./callback');

class PluginOnlyoffice extends Plugin {
  async load() {
    this.app.resourcer.registerActionHandler('onlyoffice:getConfig', getConfigHandler(this.app));
    this.app.resourcer.registerActionHandler('onlyoffice:callback', callbackHandler(this.app));
    // Document Server gọi callback không mang session Nocobase — cho qua
    // auth middleware, JWT verify bên trong callback.js là chốt chặn thật.
    this.app.acl.allow('onlyoffice', 'callback', 'public');
  }
}

module.exports = PluginOnlyoffice;
```

- [ ] **Step 5: Xác minh cú pháp bằng Node (không cần Nocobase runtime)**

Run: `node -e "require('./plugin-onlyoffice/src/server/getConfig.js'); require('./plugin-onlyoffice/src/server/callback.js'); console.log('syntax ok')"`
Expected: in ra `syntax ok` (require `@nocobase/server` trong `index.js` sẽ lỗi module-not-found ở bước này vì package chưa cài — bình thường, vì `index.js` chỉ load được khi nằm trong `storage/plugins/` của Nocobase thật; đây chỉ là kiểm tra cú pháp 2 file logic chính không phụ thuộc `@nocobase/server`).

- [ ] **Step 6: Commit**

```bash
git add plugin-onlyoffice/src/server/getConfig.js plugin-onlyoffice/src/server/callback.js plugin-onlyoffice/src/server/index.js
git commit -m "feat(plugin-onlyoffice): wire up getConfig and callback resourcer actions"
```

---

## Task 4: Deployment doc — docker-compose, nginx, biến môi trường

**Files:**
- Create: `plugin-onlyoffice/DEPLOYMENT.md`

**Interfaces:** Không có — tài liệu vận hành, người dùng tự áp dụng thủ công trên server (giống pattern các file `.sql` trong `pgsql/` được commit vào repo nhưng chạy tay qua pgAdmin).

- [ ] **Step 1: Viết `plugin-onlyoffice/DEPLOYMENT.md`**

```markdown
# Triển khai plugin-onlyoffice

## 1. Thêm container OnlyOffice Document Server vào docker-compose.yml (trên server)

\`\`\`yaml
services:
  nocobase:
    environment:
      - ONLYOFFICE_DOCSERVER_PUBLIC_URL=https://editor.yourdomain.com
      - ONLYOFFICE_JWT_SECRET=${ONLYOFFICE_JWT_SECRET}
      - NOCOBASE_INTERNAL_URL=http://nocobase:13000
    networks: [law-network]

  onlyoffice-documentserver:
    image: onlyoffice/documentserver:latest
    restart: unless-stopped
    environment:
      - JWT_ENABLED=true
      - JWT_SECRET=${ONLYOFFICE_JWT_SECRET}
    volumes:
      - onlyoffice_data:/var/www/onlyoffice/Data
    networks: [law-network]
    # KHÔNG publish port trực tiếp — chỉ qua reverse proxy

networks:
  law-network:
    driver: bridge

volumes:
  onlyoffice_data: {}
\`\`\`

Thêm `ONLYOFFICE_JWT_SECRET=<chuỗi ngẫu nhiên dài>` vào file `.env` cạnh `docker-compose.yml`.

## 2. Nginx — thêm subdomain cho Document Server

Thêm 1 server block mới cho `editor.yourdomain.com`, `proxy_pass` tới `onlyoffice-documentserver:80`. Cấp TLS bằng certbot như domain chính — cần thêm DNS A record cho subdomain trước.

## 3. Cài plugin vào Nocobase

Giai đoạn đầu (để lặp code nhanh không cần rebuild image):

\`\`\`bash
# Trên server, mount thư mục plugin vào container
docker cp plugin-onlyoffice <nocobase-container>:/app/nocobase/storage/plugins/plugin-onlyoffice
docker exec -it <nocobase-container> yarn nocobase pm add plugin-onlyoffice
docker exec -it <nocobase-container> yarn nocobase pm enable plugin-onlyoffice
docker restart <nocobase-container>
\`\`\`

Khi ổn định, chuyển sang build `plugin-onlyoffice` vào custom Nocobase image thay vì `docker cp` mỗi lần deploy.

## 4. Kiểm tra sau khi deploy

\`\`\`bash
# Document Server đã lên chưa
curl -I https://editor.yourdomain.com/healthcheck

# Plugin đã đăng ký action chưa (sẽ trả 401/403 vì chưa auth — vậy là route tồn tại)
curl -I https://law.yourdomain.com/api/onlyoffice:getConfig
\`\`\`
```

- [ ] **Step 2: Commit**

```bash
git add plugin-onlyoffice/DEPLOYMENT.md
git commit -m "docs(plugin-onlyoffice): add deployment guide for docker-compose and nginx"
```

---

## Task 5: Frontend — action "Sửa trực tuyến" + `OnlineEditModal`

**Files:**
- Modify: `All Module/Task/TaskDetailView.js:1561` (thêm field vào `BASE_DOCUMENT_FILE_FIELDS`)
- Modify: `All Module/Task/TaskDetailView.js:13795-13796` (thêm state)
- Modify: `All Module/Task/TaskDetailView.js:14589` (thêm component `OnlineEditModal` trước `renderFileList`)
- Modify: `All Module/Task/TaskDetailView.js:14634-14732` (thêm action item + handler trong `fileActionItems`/`handleFileActionClick`)
- Modify: `All Module/Task/TaskDetailView.js:16035-16046` (render `OnlineEditModal` cạnh `TaskTemplateGenerateModal`)

**Interfaces:**
- Consumes: action `onlyoffice:getConfig` (Task 3) qua `apiReq("onlyoffice:getConfig", "POST", { documentId })`.
- Consumes: `apiReq`, `TASK_FILE_ACTION_ICONS`, `reloadAttachments` — đã tồn tại trong file.
- Produces: component `OnlineEditModal({ doc, onClose, onSaved })` — dùng lại ở Task 6 không cần, chỉ Task 5.

- [ ] **Step 1: Thêm field version-chain vào `BASE_DOCUMENT_FILE_FIELDS`**

Tại dòng 1561, sửa:

```js
    const BASE_DOCUMENT_FILE_FIELDS =
      "id,title,documentCode,documentType,batchId,collectionName,sourceCollectionName,sourceTaskId,sourceRecordId,sourceProjectId,recordId,googleDriveUrl,note,createdAt,updatedAt,createdById,updatedById,uploadedById,isDeleted,folderId,caseId,taskId,subTaskId,moduleScope,storageType,legalStudyId,legalReferenceId,internalCompanyId,movedToLegalReferenceAt,movedToLegalReferenceById,fileIndex,variableConfig,variableConfigMode,sourceProjectTemplateId";
```

thành:

```js
    const BASE_DOCUMENT_FILE_FIELDS =
      "id,title,documentCode,documentType,batchId,collectionName,sourceCollectionName,sourceTaskId,sourceRecordId,sourceProjectId,recordId,googleDriveUrl,note,createdAt,updatedAt,createdById,updatedById,uploadedById,isDeleted,folderId,caseId,taskId,subTaskId,moduleScope,storageType,legalStudyId,legalReferenceId,internalCompanyId,movedToLegalReferenceAt,movedToLegalReferenceById,fileIndex,variableConfig,variableConfigMode,sourceProjectTemplateId,previousVersionId,rootDocumentId,versionNumber";
```

- [ ] **Step 2: Thêm state cho modal mới**

Tại dòng 13795-13796, sửa:

```js
      const [generateTarget, setGenerateTarget] = useState(null);
      const [configureTarget, setConfigureTarget] = useState(null);
```

thành:

```js
      const [generateTarget, setGenerateTarget] = useState(null);
      const [configureTarget, setConfigureTarget] = useState(null);
      const [editOnlineTarget, setEditOnlineTarget] = useState(null);
```

- [ ] **Step 3: Thêm component `OnlineEditModal` trước `renderFileList`**

Chèn ngay trước dòng `const renderFileList = (` (dòng 14590):

```js
      // ── OnlineEditModal — nhúng OnlyOffice DocsAPI.DocEditor để sửa
      // trực tiếp file .docx trong trình duyệt (thay vì chỉ preview
      // read-only qua Office Online iframe). Xem
      // docs/superpowers/specs/2026-08-18-onlyoffice-editing-plugin-design.md
      let _onlyOfficeLoadPromise = null;
      const loadOnlyOfficeAsync = (docServerPublicUrl) => {
        if (_onlyOfficeLoadPromise) return _onlyOfficeLoadPromise;
        const apiUrl = `${docServerPublicUrl.replace(/\/$/, "")}/web-apps/apps/api/documents/api.js`;
        _onlyOfficeLoadPromise = ctx.requireAsync(apiUrl).then((lib) => {
          // api.js của OnlyOffice không có wrapper UMD/AMD chuẩn — nó chỉ
          // gán window.DocsAPI. Thử lấy từ return value của requireAsync
          // trước (đúng theo tài liệu ctx), fallback sang window.DocsAPI
          // nếu requireAsync trả về rỗng — CẦN kiểm tra thủ công trên
          // trình duyệt thật ở bước sau, vì đây là script bên thứ 3 không
          // theo pattern UMD như Quill (xem loadQuillAsync ở trên).
          const DocsAPI = lib?.DocsAPI || (typeof window !== "undefined" && window.DocsAPI);
          if (!DocsAPI) throw new Error("DocsAPI not found after loading OnlyOffice api.js");
          return DocsAPI;
        });
        return _onlyOfficeLoadPromise;
      };

      const OnlineEditModal = ({ doc, onClose, onSaved }) => {
        const { Modal } = antd;
        const [loading, setLoading] = useState(true);
        const [saving, setSaving] = useState(false);
        const [error, setError] = useState(null);
        const containerRef = useRef(null);
        const editorRef = useRef(null);
        const containerId = useMemo(
          () => `onlyoffice-editor-${extractId(doc?.id) || "x"}`,
          [doc?.id],
        );

        useEffect(() => {
          let cancelled = false;
          (async () => {
            try {
              const res = await apiReq("onlyoffice:getConfig", "POST", {
                documentId: extractId(doc.id),
              });
              const { config, docServerPublicUrl } = res?.data || {};
              if (!config || !docServerPublicUrl) throw new Error("Invalid config response");
              const DocsAPI = await loadOnlyOfficeAsync(docServerPublicUrl);
              if (cancelled) return;
              editorRef.current = new DocsAPI.DocEditor(containerId, {
                ...config,
                events: {
                  onRequestClose: () => {
                    setSaving(true);
                    editorRef.current?.destroyEditor?.();
                    setTimeout(() => {
                      onSaved?.();
                      onClose?.();
                    }, 2500);
                  },
                },
              });
              setLoading(false);
            } catch (e) {
              if (!cancelled) {
                setError(e.message || "Không thể mở trình soạn thảo");
                setLoading(false);
              }
            }
          })();
          return () => {
            cancelled = true;
            editorRef.current?.destroyEditor?.();
          };
        }, [doc?.id]);

        return React.createElement(
          Modal,
          {
            title: `Sửa trực tuyến — ${doc?.title || ""}`,
            open: true,
            onCancel: onClose,
            centered: true,
            width: "96vw",
            bodyStyle: { padding: 0, height: "88vh" },
            footer: null,
            destroyOnClose: true,
          },
          saving &&
            React.createElement(
              "div",
              { style: { padding: 24, textAlign: "center", fontFamily: FONT } },
              "Đang lưu phiên bản mới...",
            ),
          error &&
            React.createElement(
              "div",
              { style: { padding: 24, color: "#cf1322", fontFamily: FONT } },
              error,
            ),
          !saving &&
            !error &&
            React.createElement("div", {
              id: containerId,
              style: { width: "100%", height: "100%" },
            }),
        );
      };

```

- [ ] **Step 4: Thêm action "Sửa trực tuyến" vào `fileActionItems` + handler**

Tại dòng 14653-14659 (ngay sau action `"generate_variables"`), sửa:

```js
              canEdit &&
                ext === ".docx" &&
                effectiveVariableConfig.length > 0 && {
                  key: "generate_variables",
                  icon: TASK_FILE_ACTION_ICONS.preview,
                  label: "Điền biến & Generate",
                },
```

thành:

```js
              canEdit &&
                ext === ".docx" &&
                effectiveVariableConfig.length > 0 && {
                  key: "generate_variables",
                  icon: TASK_FILE_ACTION_ICONS.preview,
                  label: "Điền biến & Generate",
                },
              canEdit &&
                ext === ".docx" && {
                  key: "edit_online",
                  icon: TASK_FILE_ACTION_ICONS.edit,
                  label: "Sửa trực tuyến",
                },
```

Tại dòng 14729-14731 (ngay sau nhánh `"generate_variables"` trong `handleFileActionClick`), sửa:

```js
              if (key === "generate_variables") {
                setGenerateTarget(f);
              }
            };
```

thành:

```js
              if (key === "generate_variables") {
                setGenerateTarget(f);
              }
              if (key === "edit_online") {
                setEditOnlineTarget(f);
              }
            };
```

- [ ] **Step 5: Render `OnlineEditModal` cạnh `TaskTemplateGenerateModal`**

Tại dòng 16047 (ngay trước `configureTarget &&`), sửa:

```js
          configureTarget &&
            React.createElement(DocumentVariableConfigModal, {
              key: "configure-variables-modal",
              doc: configureTarget,
              onClose: () => setConfigureTarget(null),
              onSaved: () => {
                reloadAttachments();
              },
            }),
        );
      }
    };
```

thành:

```js
          configureTarget &&
            React.createElement(DocumentVariableConfigModal, {
              key: "configure-variables-modal",
              doc: configureTarget,
              onClose: () => setConfigureTarget(null),
              onSaved: () => {
                reloadAttachments();
              },
            }),
          editOnlineTarget &&
            React.createElement(OnlineEditModal, {
              key: "edit-online-modal",
              doc: editOnlineTarget,
              onClose: () => setEditOnlineTarget(null),
              onSaved: () => {
                reloadAttachments();
                setCmtRefreshTrigger((v) => v + 1);
              },
            }),
        );
      }
    };
```

- [ ] **Step 6: Kiểm tra thủ công trên trình duyệt thật (bắt buộc — phụ thuộc môi trường sống)**

Đây là bước không thể tự động hoá trong repo này. Sau khi deploy plugin (Task 3+4) lên server thật:
1. Mở Task có file `.docx` đã Generate, bấm "Sửa trực tuyến".
2. Mở DevTools Console, xác nhận KHÔNG có lỗi `DocsAPI not found`.
3. Nếu có lỗi đó: `ctx.requireAsync` không capture được `window.DocsAPI` (script OnlyOffice không theo chuẩn UMD như Quill). Sửa `loadOnlyOfficeAsync` để tự chèn thẻ `<script>` thay vì dùng `ctx.requireAsync`:

```js
const loadOnlyOfficeAsync = (docServerPublicUrl) => {
  if (_onlyOfficeLoadPromise) return _onlyOfficeLoadPromise;
  const apiUrl = `${docServerPublicUrl.replace(/\/$/, "")}/web-apps/apps/api/documents/api.js`;
  _onlyOfficeLoadPromise = new Promise((resolve, reject) => {
    if (window.DocsAPI) return resolve(window.DocsAPI);
    const script = document.createElement("script");
    script.src = apiUrl;
    script.onload = () => (window.DocsAPI ? resolve(window.DocsAPI) : reject(new Error("DocsAPI not found after script load")));
    script.onerror = () => reject(new Error("Failed to load OnlyOffice api.js"));
    document.body.appendChild(script);
  });
  return _onlyOfficeLoadPromise;
};
```

4. Xác nhận editor OnlyOffice hiển thị đầy đủ trong modal, sửa được nội dung.

- [ ] **Step 7: Commit**

```bash
git add "All Module/Task/TaskDetailView.js"
git commit -m "feat(TaskDetailView): add Sửa trực tuyến action embedding OnlyOffice editor"
```

---

## Task 6: Frontend — chỉ hiện bản mới nhất + "Xem lịch sử phiên bản"

**Files:**
- Modify: `All Module/Task/TaskDetailView.js:13833-13834` (lọc bản đã bị supersede khỏi danh sách chính)
- Modify: `All Module/Task/TaskDetailView.js:13795-13797` (thêm state cho modal lịch sử)
- Modify: `All Module/Task/TaskDetailView.js:14590` (thêm component `VersionHistoryModal`)
- Modify: `All Module/Task/TaskDetailView.js:14634-14732` (thêm action "Xem lịch sử phiên bản")
- Modify: `All Module/Task/TaskDetailView.js:16047` (render `VersionHistoryModal`)

**Interfaces:**
- Consumes: `allFiles` (đã có trong scope — toàn bộ document của task, bao gồm mọi phiên bản vì callback ở Task 3 tạo document mới gắn cùng `taskId`), field `previousVersionId`/`rootDocumentId`/`versionNumber` (Task 1 + Task 5 Step 1).
- Không cần gọi thêm API — lịch sử phiên bản suy ra hoàn toàn từ `allFiles` đã fetch sẵn.

- [ ] **Step 1: Lọc bản đã bị supersede khỏi danh sách file chính**

Tại dòng 13833-13834, sửa:

```js
      const allFiles = item._files || [];
      const attachmentFiles = allFiles.filter((file) => !file.isDeleted);
```

thành:

```js
      const allFiles = item._files || [];
      // Mỗi lần sửa trực tuyến (OnlineEditModal) tạo 1 document mới nối
      // chuỗi qua previousVersionId — ẩn các bản đã bị thay thế khỏi danh
      // sách chính, chỉ giữ bản mới nhất mỗi chuỗi. Xem đầy đủ lịch sử qua
      // action "Xem lịch sử phiên bản".
      const supersededDocumentIds = new Set(
        allFiles
          .map((file) => file.previousVersionId)
          .filter(Boolean)
          .map((id) => String(extractId(id) || id)),
      );
      const attachmentFiles = allFiles
        .filter((file) => !file.isDeleted)
        .filter((file) => !supersededDocumentIds.has(String(extractId(file.id) || file.id)));
```

- [ ] **Step 2: Thêm state cho modal lịch sử**

Tại dòng 13795-13797 (đã sửa ở Task 5 Step 2), sửa:

```js
      const [generateTarget, setGenerateTarget] = useState(null);
      const [configureTarget, setConfigureTarget] = useState(null);
      const [editOnlineTarget, setEditOnlineTarget] = useState(null);
```

thành:

```js
      const [generateTarget, setGenerateTarget] = useState(null);
      const [configureTarget, setConfigureTarget] = useState(null);
      const [editOnlineTarget, setEditOnlineTarget] = useState(null);
      const [versionHistoryTarget, setVersionHistoryTarget] = useState(null);
```

- [ ] **Step 3: Thêm component `VersionHistoryModal`**

Chèn ngay sau `OnlineEditModal` (cuối khối vừa thêm ở Task 5 Step 3, trước `const renderFileList = (`):

```js
      const VersionHistoryModal = ({ doc, allFiles, onClose }) => {
        const { Modal, Empty } = antd;
        const rootId = String(extractId(doc?.rootDocumentId) || extractId(doc?.id) || doc?.id);
        const chain = allFiles
          .filter((file) => {
            const fileRootId = String(
              extractId(file.rootDocumentId) || extractId(file.id) || file.id,
            );
            return fileRootId === rootId;
          })
          .sort((a, b) => (b.versionNumber || 1) - (a.versionNumber || 1));

        return React.createElement(
          Modal,
          {
            title: `Lịch sử phiên bản — ${doc?.title || ""}`,
            open: true,
            onCancel: onClose,
            footer: null,
            width: 480,
          },
          chain.length === 0
            ? React.createElement(Empty, { description: "Không có lịch sử phiên bản" })
            : React.createElement(
                "div",
                { style: { display: "flex", flexDirection: "column", gap: 8 } },
                ...chain.map((f) => {
                  const att = getPrimaryAttachment(f);
                  const fullUrl = getFullUrl(att?.url || att?.preview);
                  return React.createElement(
                    "div",
                    {
                      key: f.id,
                      style: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        border: "1px solid #f0f0f0",
                        borderRadius: 6,
                        fontFamily: FONT,
                        fontSize: 13,
                      },
                    },
                    React.createElement(
                      "span",
                      null,
                      `Phiên bản ${f.versionNumber || 1}${String(extractId(f.id)) === String(extractId(doc?.id)) ? " (hiện tại)" : ""} — ${fmtDate(f.createdAt)}`,
                    ),
                    React.createElement(
                      "a",
                      { href: fullUrl || undefined, target: "_blank", rel: "noreferrer" },
                      "Tải xuống",
                    ),
                  );
                }),
              ),
        );
      };

```

- [ ] **Step 4: Thêm action "Xem lịch sử phiên bản" vào `fileActionItems`**

Tại dòng đã thêm ở Task 5 Step 4 (action `edit_online`), sửa:

```js
              canEdit &&
                ext === ".docx" && {
                  key: "edit_online",
                  icon: TASK_FILE_ACTION_ICONS.edit,
                  label: "Sửa trực tuyến",
                },
```

thành:

```js
              canEdit &&
                ext === ".docx" && {
                  key: "edit_online",
                  icon: TASK_FILE_ACTION_ICONS.edit,
                  label: "Sửa trực tuyến",
                },
              ext === ".docx" &&
                (f.versionNumber > 1 || f.rootDocumentId) && {
                  key: "version_history",
                  icon: TASK_FILE_ACTION_ICONS.preview,
                  label: "Xem lịch sử phiên bản",
                },
```

Trong `handleFileActionClick`, sửa nhánh vừa thêm ở Task 5 Step 4:

```js
              if (key === "edit_online") {
                setEditOnlineTarget(f);
              }
            };
```

thành:

```js
              if (key === "edit_online") {
                setEditOnlineTarget(f);
              }
              if (key === "version_history") {
                setVersionHistoryTarget(f);
              }
            };
```

- [ ] **Step 5: Render `VersionHistoryModal`**

Tại vị trí render `OnlineEditModal` đã thêm ở Task 5 Step 5, sửa:

```js
          editOnlineTarget &&
            React.createElement(OnlineEditModal, {
              key: "edit-online-modal",
              doc: editOnlineTarget,
              onClose: () => setEditOnlineTarget(null),
              onSaved: () => {
                reloadAttachments();
                setCmtRefreshTrigger((v) => v + 1);
              },
            }),
        );
      }
    };
```

thành:

```js
          editOnlineTarget &&
            React.createElement(OnlineEditModal, {
              key: "edit-online-modal",
              doc: editOnlineTarget,
              onClose: () => setEditOnlineTarget(null),
              onSaved: () => {
                reloadAttachments();
                setCmtRefreshTrigger((v) => v + 1);
              },
            }),
          versionHistoryTarget &&
            React.createElement(VersionHistoryModal, {
              key: "version-history-modal",
              doc: versionHistoryTarget,
              allFiles,
              onClose: () => setVersionHistoryTarget(null),
            }),
        );
      }
    };
```

- [ ] **Step 6: Kiểm tra thủ công trên trình duyệt**

Sau khi sửa 1 file trực tuyến (Task 5) và version mới đã tạo: mở lại danh sách file trong Task, xác nhận chỉ còn 1 mục (bản mới nhất) thay vì 2. Bấm "Xem lịch sử phiên bản", xác nhận thấy cả 2 bản (cũ + mới), bản hiện tại có nhãn "(hiện tại)", link "Tải xuống" mở đúng file tương ứng.

- [ ] **Step 7: Commit**

```bash
git add "All Module/Task/TaskDetailView.js"
git commit -m "feat(TaskDetailView): show only latest document version, add version history view"
```

---

## Task 7: Kiểm thử end-to-end thủ công (toàn luồng)

**Files:** Không có — checklist vận hành, không tạo/sửa file.

**Interfaces:** Không có.

- [ ] **Step 1: Chạy toàn bộ checklist sau trên môi trường staging/production sau khi Task 1-6 đã deploy đầy đủ**

1. Mở 1 Task có file `.docx` đã qua "Điền biến & Generate".
2. Bấm "Sửa trực tuyến" → xác nhận editor OnlyOffice mở được, hiển thị đúng nội dung file.
3. Sửa 1 đoạn text bất kỳ, bấm nút Close của chính OnlyOffice (không phải nút X của modal).
4. Xác nhận modal hiện "Đang lưu phiên bản mới..." rồi tự đóng.
5. Xác nhận danh sách file trong Task chỉ hiện 1 mục (bản mới, không phải bản cũ trùng lặp).
6. Bấm "Xem lịch sử phiên bản" → xác nhận thấy 2 bản (gốc + bản vừa sửa), đúng thứ tự, tải được cả 2.
7. Mở lại bản mới nhất bằng "Sửa trực tuyến" lần 2, sửa tiếp, đóng → xác nhận `versionNumber` lên 3, `rootDocumentId` của cả 3 bản giống nhau (kiểm tra qua SQL nếu cần: `SELECT id, "previousVersionId", "rootDocumentId", "versionNumber" FROM documents WHERE "rootDocumentId" = <id gốc> OR id = <id gốc>;`).
8. Thử mở "Sửa trực tuyến" khi Document Server bị tắt (dừng container tạm thời) → xác nhận frontend hiện `message.error` rõ ràng thay vì treo/trắng màn hình.
9. Xác nhận file `.docx` gốc (chưa từng "Sửa trực tuyến") vẫn preview/download bình thường như trước — không có regression.

---

## Self-Review

**1. Spec coverage:** Kiến trúc + luồng vận hành (Task 3), data model (Task 1), plugin design (Task 2+3), frontend changes (Task 5+6), deployment (Task 4), error handling (Task 3 callback/getConfig try-catch + Task 7 Step 8), testing strategy (Task 2 unit test cho pure logic, Task 7 cho E2E) — mọi mục trong spec đều có task tương ứng. Table-loop rendering và number-to-words (đã deferred trong spec) không có task — đúng như phạm vi.

**2. Placeholder scan:** Không còn "TBD"/"TODO" trong code — 2 điểm phụ thuộc môi trường sống thật (API resourcer chính xác ở Task 3 Step 1, cách load `api.js` ở Task 5 Step 6) được viết thành bước xác minh cụ thể kèm code fallback đầy đủ, không phải placeholder mơ hồ.

**3. Type consistency:** `documentId` truyền dạng string/number nhất quán qua `getConfigHandler`/`buildEditorConfig`/`buildVersionKey`. `previousVersionId`/`rootDocumentId`/`versionNumber` dùng tên field giống hệt giữa Task 1 (Admin UI), Task 3 (`computeNextVersion`/`documentRepo.create`), Task 5 Step 1 (`BASE_DOCUMENT_FILE_FIELDS`), Task 6 (filter/sort logic).

Không phát hiện gap cần bổ sung task.

---

**Plan hoàn chỉnh và đã lưu tại `docs/superpowers/plans/2026-08-18-onlyoffice-editing-plugin.md`. 2 lựa chọn thực thi:**

**1. Subagent-Driven (khuyến nghị)** — dispatch 1 subagent riêng cho mỗi task, review giữa các task, lặp nhanh.

**2. Inline Execution** — thực thi trong session này qua executing-plans, chạy theo batch với checkpoint để review.

Bạn muốn theo hướng nào?

