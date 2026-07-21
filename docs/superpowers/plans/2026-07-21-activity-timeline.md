# Activity Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `JsField/ActivityTimeline.js`, a config-driven Nocobase JS block that renders a vertical audit-trail timeline for one record, reference-deployed against the `Contract` collection to match the approved mockup (`JsField/ActivityTimeline_mockup.html`).

**Architecture:** Single self-contained file (Nocobase runtime constraint — no cross-file imports for deployed blocks). All collection-specific behavior lives in one `CONFIG` object at the top of the file; everything below it is generic rendering/fetch/filter logic that reads from `CONFIG`. To deploy for a different collection later, copy the file and edit only `CONFIG`.

**Tech Stack:** React (via `ctx.React`), Ant Design (via `ctx.antd`: `Input`, `Select`, `DatePicker`), Nocobase `ctx.api.request` against the existing `activity_log` collection (already populated by DB triggers — no backend changes in this plan).

## Global Constraints

- Nocobase JS blocks must stay in exactly one file — no `import`/`require` of local modules in the deployed file (see `CLAUDE.md`, [[nocobase_single_file_constraint]]).
- No `fetch()` — only `ctx.api.request()`.
- No direct `import` in the deployed file — only `ctx.React`, `ctx.antd`, `ctx.importAsync()`, `ctx.requireAsync()`.
- This repo has **no automated test runner** (`package.json` has no test script, no jest/mocha). The existing verification tool is `check_syntax.mjs`-style Babel parsing (confirms the file is syntactically valid JSX). Pure, ctx-independent logic (formatters, description text) is verified with a throwaway Node ESM script in the repo root (matches the existing `scratch_*.js` convention already tracked in this repo), then the verified code is copied verbatim into the deployed file. Anything touching `ctx.api`/`ctx.render` can only be verified manually inside Nocobase — those steps are written out explicitly, not skipped.
- Money is always formatted as VND (`Number(...).toLocaleString('vi-VN') + ' ₫'`).
- Status/enum labels come from a config map, never hardcoded inline in JSX.

---

## Task 1: Scaffold — CONFIG, constants, icon set

**Files:**
- Create: `JsField/ActivityTimeline.js`

**Interfaces:**
- Produces: `CONFIG` (object, see below), `RECORD_ID` (number|undefined), `React`, `useState`/`useEffect`/`useMemo`/`useRef`, `Empty`/`Spin`/`Input`/`Select`/`DatePicker`/`RangePicker`, `FONT` (string), `Icons` (object of components: `Created`, `Uploaded`, `Deleted`, `Search`, `Refresh`), `ICON_BY_ACTION` (object mapping action → icon component, only for `major` actions).

- [ ] **Step 1: Create the file with `CONFIG`, base constants, and icons**

```javascript
// ==================== CONFIG ====================
// Copy this file per collection and only edit CONFIG below.
// Reference deployment: Contract (activity_log.collectionName = 'Contract').
const CONFIG = {
  collectionName: 'Contract',
  title: 'Lịch sử hoạt động hợp đồng',

  // How to fetch a human-readable title for the record this timeline is
  // embedded in (used in "Tạo mới ..." / "Xoá ..." sentences).
  recordTitleSource: {
    url: 'contracts:get',
    fields: 'id,contractCode,contractName',
    labelFn: r => (r.contractCode && r.contractName)
      ? `${r.contractCode} ${r.contractName}`
      : (r.contractName || r.contractCode || ('Hợp đồng #' + r.id)),
  },

  fieldLabels: {
    contractCode: 'Mã hợp đồng',
    contractName: 'Tên hợp đồng',
    customerName: 'Khách hàng',
    customerId: 'Khách hàng',
    lawyerId: 'Luật sư phụ trách',
    value: 'Giá trị hợp đồng',
    status: 'Trạng thái',
    signedAt: 'Ngày ký',
    issuedDate: 'Ngày bắt đầu',
    endDate: 'Ngày kết thúc',
    note: 'Ghi chú',
    documents: 'Tài liệu đính kèm',
  },

  // Logged in activity_log but not shown in the timeline UI.
  skipFields: ['batchId', 'updatedById', 'createdById'],

  actionConfig: {
    created:  { label: 'Tạo mới',  color: '#0958d9', bg: '#e6f4ff', border: '#91caff', major: true },
    updated:  { label: 'Cập nhật', color: '#0958d9', bg: '#e6f4ff', border: '#91caff', major: false },
    uploaded: { label: 'Tải lên',  color: '#722ed1', bg: '#f9f0ff', border: '#d3adf7', major: true },
    deleted:  { label: 'Xoá',      color: '#cf1322', bg: '#fff1f0', border: '#ffa39e', major: true },
  },

  enumMaps: {
    status: {
      draft: 'Nháp', pendingSign: 'Chờ ký', signed: 'Đã ký',
      active: 'Hiệu lực', terminated: 'Đã thanh lý', cancelled: 'Đã huỷ',
    },
  },

  fkResolvers: {
    lawyerId:   { url: 'lawyers:list',   fields: 'id,lawyerName',   labelFn: r => r.lawyerName || ('Luật sư #' + r.id) },
    customerId: { url: 'customers:list', fields: 'id,customerName', labelFn: r => r.customerName || ('KH #' + r.id) },
  },
};

const RECORD_ID = ctx.record?.id;
const React = ctx.React;
const { useState, useEffect, useMemo, useRef } = React;
const { Empty, Spin, Input, Select, DatePicker } = ctx.antd;
const { RangePicker } = DatePicker;

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const Icons = {
  Created: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Uploaded: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  Deleted: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#8c8c8c' }}>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Refresh: ({ className }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ marginRight: 4 }}>
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
};

const ICON_BY_ACTION = { created: Icons.Created, uploaded: Icons.Uploaded, deleted: Icons.Deleted };
```

- [ ] **Step 2: Verify the file parses as valid JSX**

Run:
```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('JsField/ActivityTimeline.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
git add JsField/ActivityTimeline.js
git commit -m "feat: scaffold ActivityTimeline config and constants"
```

---

## Task 2: Pure formatting & description logic (TDD)

**Files:**
- Create: `scratch_activity_timeline_logic.mjs` (development-only ESM module, not deployed)
- Create: `scratch_test_activity_timeline_logic.mjs` (test script for the above)
- Modify: `JsField/ActivityTimeline.js` (append, after the Task 1 code)

**Interfaces:**
- Consumes: `CONFIG` from Task 1 (same shape, duplicated locally in the scratch module for testing, then the tested code is pasted below `CONFIG` in the real file so it resolves the real `CONFIG` by closure).
- Produces: `fmtDate(iso)`, `formatDay(iso)`, `getDayKey(iso)`, `timeAgo(iso)`, `getTs(log)`, `fmtField(fieldName)`, `cleanVal(v, fieldName)`, `resolveVal(v, fieldName, fkMap)`, `getActionText(log, fkMap)` (returns `{ primary, oldVal, newVal, field }`), `avatarColor(name)`, `initials(name)`.

- [ ] **Step 1: Write the scratch logic module (this is what the tests drive)**

```javascript
// scratch_activity_timeline_logic.mjs — dev-only, mirrors the CONFIG shape
// used by JsField/ActivityTimeline.js. Not deployed; copied into the real
// file once tests pass (see scratch_test_activity_timeline_logic.mjs).
export const CONFIG = {
  fieldLabels: {
    contractCode: 'Mã hợp đồng',
    value: 'Giá trị hợp đồng',
    status: 'Trạng thái',
  },
  enumMaps: {
    status: { draft: 'Nháp', signed: 'Đã ký' },
  },
};

export const fmtDate = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const formatDay = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (isSameDay(d, today)) return 'Hôm nay';
  if (isSameDay(d, yesterday)) return 'Hôm qua';
  const raw = d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

export const getDayKey = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const timeAgo = iso => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 30) return `${days} ngày trước`;
  return fmtDate(iso).split(' ')[0];
};

export const getTs = log => log.changedAt || log.createdAt || '';

export const fmtField = f => {
  if (!f) return '';
  if (CONFIG.fieldLabels[f]) return CONFIG.fieldLabels[f];
  const formatted = f.replace(/Id$/, '').replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ')
    .trim().split(' ').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  return formatted.charAt(0).toLowerCase() + formatted.slice(1);
};

export const cleanVal = (v, fieldName) => {
  if (v === null || v === undefined || v === 'null' || v === 'undefined') return null;
  const s = String(v).replace(/<[^>]+>/g, '').trim();
  if (!s) return null;
  const enumMap = CONFIG.enumMaps[fieldName];
  if (enumMap && enumMap[s]) return enumMap[s];
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s)) return fmtDate(s);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.split('-').reverse().join('/');
  if (/^\d+(\.\d+)?$/.test(s)) return s; // keep raw for FK lookup / currency formatting
  return s;
};

export const resolveVal = (v, fieldName, fkMap) => {
  const c = cleanVal(v, fieldName);
  if (!c) return null;
  const lookup = fkMap[fieldName];
  if (lookup && lookup[c]) return lookup[c];
  if (/^\d+(\.\d+)?$/.test(c) && Number(c) > 100000) return Number(c).toLocaleString('vi-VN') + ' ₫';
  return c;
};

export const getActionText = (log, fkMap) => {
  const field = fmtField(log.fieldName || '');
  const oldVal = resolveVal(log.oldValue, log.fieldName, fkMap);
  const newVal = resolveVal(log.newValue, log.fieldName, fkMap);
  const recordLabel = `"${log.recordTitle || 'bản ghi'}"`;

  if (log.action === 'created') return { primary: `Tạo mới ${recordLabel}`, oldVal: null, newVal: null, field: null };
  if (log.action === 'deleted') return { primary: `Xoá ${field ? field.toLowerCase() : recordLabel}`, oldVal, newVal, field };
  if (log.action === 'uploaded') return { primary: `Tải lên tài liệu ${newVal ? `"${newVal}"` : ''}`.trim(), oldVal: null, newVal, field: null };
  if (oldVal && newVal) return { primary: `Cập nhật ${field.toLowerCase()}`, oldVal, newVal, field };
  if (newVal) return { primary: `Cập nhật ${field.toLowerCase()} thành "${newVal}"`, oldVal: null, newVal, field };
  if (oldVal) return { primary: `Xoá ${field.toLowerCase()}`, oldVal, newVal: null, field };
  return { primary: `Cập nhật ${field || 'bản ghi'}`, oldVal: null, newVal: null, field };
};

const AVATAR_COLORS = ['#1677ff', '#13c2c2', '#fa8c16', '#722ed1', '#eb2f96', '#52c41a'];
export const avatarColor = name => {
  let h = 0;
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
};
export const initials = name => (name || '?').trim().split(/\s+/).map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase();
```

- [ ] **Step 2: Write the test script**

```javascript
// scratch_test_activity_timeline_logic.mjs
import assert from 'assert';
import {
  fmtDate, formatDay, getDayKey, timeAgo, fmtField, cleanVal,
  resolveVal, getActionText, avatarColor, initials,
} from './scratch_activity_timeline_logic.mjs';

assert.strictEqual(fmtField('contractCode'), 'Mã hợp đồng', 'fmtField uses CONFIG.fieldLabels override');
// Unmapped fields only lowercase the very first letter (existing sentence-case
// convention copied from All Module/Project/ActivityTab.js) — later words keep
// their capitalized form, e.g. "someRandomField" -> "some Random Field".
assert.strictEqual(fmtField('someRandomField'), 'some Random Field', 'fmtField humanizes unmapped camelCase fields');

assert.strictEqual(cleanVal(null, 'status'), null, 'cleanVal returns null for null input');
assert.strictEqual(cleanVal('draft', 'status'), 'Nháp', 'cleanVal resolves enumMaps for status');
assert.strictEqual(cleanVal('2026-07-21', 'signedAt'), '21/07/2026', 'cleanVal formats plain ISO dates as dd/mm/yyyy');
assert.strictEqual(cleanVal('2026-07-21T14:32:00', 'changedAt'), '21/07/2026 14:32', 'cleanVal formats ISO datetimes as dd/mm/yyyy HH:mm');

assert.strictEqual(resolveVal('12', 'lawyerId', { lawyerId: { '12': 'Nguyễn Văn A' } }), 'Nguyễn Văn A', 'resolveVal looks up FK map by cleaned value');
assert.strictEqual(resolveVal('550000000', 'value', {}), '550.000.000 ₫', 'resolveVal formats large bare numbers as VND');
assert.strictEqual(resolveVal('5', 'value', {}), '5', 'resolveVal leaves small bare numbers (e.g. counts) unformatted');

assert.strictEqual(getDayKey('2026-07-21T14:32:00'), '2026-07-21', 'getDayKey extracts yyyy-mm-dd');

const created = getActionText({ action: 'created', recordTitle: 'HĐ-2026-014' }, {});
assert.strictEqual(created.primary, 'Tạo mới "HĐ-2026-014"', 'getActionText describes created events using recordTitle');

const updated = getActionText({ action: 'updated', fieldName: 'status', oldValue: 'draft', newValue: 'signed' }, {});
assert.strictEqual(updated.primary, 'Cập nhật trạng thái', 'getActionText describes field updates using fmtField label');
assert.strictEqual(updated.oldVal, 'Nháp', 'getActionText resolves enum-mapped old value');
assert.strictEqual(updated.newVal, 'Đã ký', 'getActionText resolves enum-mapped new value');

const uploaded = getActionText({ action: 'uploaded', newValue: 'Hợp đồng đã ký (scan).pdf' }, {});
assert.strictEqual(uploaded.primary, 'Tải lên tài liệu "Hợp đồng đã ký (scan).pdf"', 'getActionText describes uploaded events');

assert.strictEqual(initials('Nguyễn Văn A'), 'VA', 'initials takes last two words');
assert.strictEqual(typeof avatarColor('Nguyễn Văn A'), 'string', 'avatarColor returns a color string');

console.log('✅ All ActivityTimeline pure-logic tests passed');
```

- [ ] **Step 3: Run the test and confirm it passes**

Run: `node scratch_test_activity_timeline_logic.mjs`
Expected output: `✅ All ActivityTimeline pure-logic tests passed` (no assertion errors)

If any assertion fails, fix the corresponding function in `scratch_activity_timeline_logic.mjs` and re-run until green — do not skip ahead with a failing test.

- [ ] **Step 4: Copy the verified functions into `JsField/ActivityTimeline.js`**

Append the same function bodies (without `export`, and without the local `CONFIG` from the scratch module — the real file already defines the full `CONFIG` from Task 1, and these functions close over it by the same identifier) directly after the `ICON_BY_ACTION` line from Task 1:

```javascript
const fmtDate = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDay = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (isSameDay(d, today)) return 'Hôm nay';
  if (isSameDay(d, yesterday)) return 'Hôm qua';
  const raw = d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const getDayKey = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const timeAgo = iso => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 30) return `${days} ngày trước`;
  return fmtDate(iso).split(' ')[0];
};

const getTs = log => log.changedAt || log.createdAt || '';

const fmtField = f => {
  if (!f) return '';
  if (CONFIG.fieldLabels[f]) return CONFIG.fieldLabels[f];
  const formatted = f.replace(/Id$/, '').replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ')
    .trim().split(' ').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  return formatted.charAt(0).toLowerCase() + formatted.slice(1);
};

const cleanVal = (v, fieldName) => {
  if (v === null || v === undefined || v === 'null' || v === 'undefined') return null;
  const s = String(v).replace(/<[^>]+>/g, '').trim();
  if (!s) return null;
  const enumMap = CONFIG.enumMaps[fieldName];
  if (enumMap && enumMap[s]) return enumMap[s];
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s)) return fmtDate(s);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.split('-').reverse().join('/');
  if (/^\d+(\.\d+)?$/.test(s)) return s;
  return s;
};

const resolveVal = (v, fieldName, fkMap) => {
  const c = cleanVal(v, fieldName);
  if (!c) return null;
  const lookup = fkMap[fieldName];
  if (lookup && lookup[c]) return lookup[c];
  if (/^\d+(\.\d+)?$/.test(c) && Number(c) > 100000) return Number(c).toLocaleString('vi-VN') + ' ₫';
  return c;
};

const getActionText = (log, fkMap) => {
  const field = fmtField(log.fieldName || '');
  const oldVal = resolveVal(log.oldValue, log.fieldName, fkMap);
  const newVal = resolveVal(log.newValue, log.fieldName, fkMap);
  const recordLabel = `"${log.recordTitle || 'bản ghi'}"`;

  if (log.action === 'created') return { primary: `Tạo mới ${recordLabel}`, oldVal: null, newVal: null, field: null };
  if (log.action === 'deleted') return { primary: `Xoá ${field ? field.toLowerCase() : recordLabel}`, oldVal, newVal, field };
  if (log.action === 'uploaded') return { primary: `Tải lên tài liệu ${newVal ? `"${newVal}"` : ''}`.trim(), oldVal: null, newVal, field: null };
  if (oldVal && newVal) return { primary: `Cập nhật ${field.toLowerCase()}`, oldVal, newVal, field };
  if (newVal) return { primary: `Cập nhật ${field.toLowerCase()} thành "${newVal}"`, oldVal: null, newVal, field };
  if (oldVal) return { primary: `Xoá ${field.toLowerCase()}`, oldVal, newVal: null, field };
  return { primary: `Cập nhật ${field || 'bản ghi'}`, oldVal: null, newVal: null, field };
};

const AVATAR_COLORS = ['#1677ff', '#13c2c2', '#fa8c16', '#722ed1', '#eb2f96', '#52c41a'];
const avatarColor = name => {
  let h = 0;
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
};
const initials = name => (name || '?').trim().split(/\s+/).map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase();
```

- [ ] **Step 5: Verify the deployed file still parses**

Run:
```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('JsField/ActivityTimeline.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 6: Commit**

```bash
git add JsField/ActivityTimeline.js scratch_activity_timeline_logic.mjs scratch_test_activity_timeline_logic.mjs
git commit -m "feat: add tested formatting and description logic to ActivityTimeline"
```

---

## Task 3: FK resolver + activity log fetch layer

**Files:**
- Modify: `JsField/ActivityTimeline.js` (append, after Task 2's code)

**Interfaces:**
- Consumes: `CONFIG.fkResolvers`, `CONFIG.recordTitleSource`, `CONFIG.collectionName`, `getTs` (Task 2).
- Produces: `fetchFKMap()` → `Promise<Record<string, Record<string,string>>>`, `fetchRecordTitle(recordId)` → `Promise<string>`, `fetchActivityLogs(recordId)` → `Promise<Array<log>>`, `fetchAllData(recordId)` → `Promise<{ logs, fkMap, recordTitle }>` (sorted newest-first, each log annotated with `recordTitle`).

This layer calls `ctx.api`, so it cannot run in plain Node — it is verified with the Babel syntax check plus a manual trace in Task 7.

- [ ] **Step 1: Append the fetch layer**

```javascript
async function fetchFKMap() {
  const fkMap = {};
  const entries = Object.entries(CONFIG.fkResolvers);
  await Promise.all(entries.map(async ([field, src]) => {
    try {
      const res = await ctx.api.request({ url: src.url, params: { pageSize: 500, page: 1, fields: src.fields } });
      const idToLabel = {};
      (res?.data?.data || []).forEach(r => { idToLabel[String(r.id)] = src.labelFn(r); });
      fkMap[field] = idToLabel;
    } catch { fkMap[field] = {}; }
  }));
  return fkMap;
}

async function fetchRecordTitle(recordId) {
  const src = CONFIG.recordTitleSource;
  try {
    const res = await ctx.api.request({ url: src.url, params: { filterByTk: recordId, fields: src.fields } });
    const record = res?.data?.data || res?.data || {};
    return src.labelFn(record);
  } catch {
    return `#${recordId}`;
  }
}

async function fetchActivityLogs(recordId) {
  if (!recordId) return [];
  try {
    const filter = { $and: [{ collectionName: { $eq: CONFIG.collectionName } }, { recordId: { $eq: parseInt(recordId) } }] };
    const res = await ctx.api.request({
      url: 'activity_log:list',
      params: { pageSize: 500, sort: ['-changedAt'], filter: JSON.stringify(filter) },
    });
    return res?.data?.data || [];
  } catch { return []; }
}

async function fetchAllData(recordId) {
  const [fkMap, rawLogs, recordTitle] = await Promise.all([
    fetchFKMap(),
    fetchActivityLogs(recordId),
    fetchRecordTitle(recordId),
  ]);
  const logs = rawLogs
    .map(l => ({ ...l, recordTitle }))
    .sort((a, b) => new Date(getTs(b)) - new Date(getTs(a)));
  return { logs, fkMap, recordTitle };
}
```

- [ ] **Step 2: Verify the file still parses**

Run:
```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('JsField/ActivityTimeline.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
git add JsField/ActivityTimeline.js
git commit -m "feat: add FK resolver and activity_log fetch layer to ActivityTimeline"
```

---

## Task 4: Timeline CSS + presentational subcomponents

**Files:**
- Modify: `JsField/ActivityTimeline.js` (append, after Task 3's code)

**Interfaces:**
- Consumes: `CONFIG.actionConfig`, `ICON_BY_ACTION`, `getActionText`, `getTs`, `fmtDate`, `timeAgo`, `formatDay`, `avatarColor`, `initials` (Tasks 1–2).
- Produces: `AL_CSS` (string), `DayPill` (component, props `{ dayKey }`), `EventItem` (component, props `{ log, fkMap }`), `DayGroup` (component, props `{ dayKey, logs, fkMap }`).

This is the direct JSX/CSS translation of the approved mockup (`JsField/ActivityTimeline_mockup.html`), class names prefixed `al-` to avoid colliding with other blocks on the same page.

- [ ] **Step 1: Append the CSS block**

```javascript
const AL_CSS = `
.al-page { font-family: ${FONT}; }
.al-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.al-head-text { flex: 1; min-width: 0; }
.al-head-title { font-size: 14px; font-weight: 700; color: #1f1f1f; }
.al-head-sub { font-size: 11.5px; color: #8c8c8c; margin-top: 2px; }
.al-btn {
  font-family: ${FONT}; font-size: 12px; font-weight: 600; padding: 6px 12px;
  border-radius: 6px; border: 1px solid #e0e0e0; background: #fff; cursor: pointer;
  display: inline-flex; align-items: center; color: #595959;
}
.al-btn:hover:not(:disabled) { border-color: #1677ff; color: #0958d9; }
.al-btn:disabled { opacity: .6; cursor: not-allowed; }
.al-toolbar { border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px 12px; margin-bottom: 18px; display: flex; flex-direction: column; gap: 8px; }
.al-search-row { display: flex; align-items: center; gap: 8px; border: 1px solid #e0e0e0; border-radius: 6px; padding: 0 10px; }
.al-search-row .ant-input { border: none !important; box-shadow: none !important; padding-left: 0 !important; }
.al-filter-row { display: flex; gap: 8px; flex-wrap: wrap; }
.al-filter-row .ant-select-selector { border-radius: 6px !important; }
.al-timeline { position: relative; }
.al-day-group { position: relative; }
.al-day-pill {
  display: inline-flex; align-items: center; gap: 6px; background: #1f1f1f; color: #fff;
  font-size: 11px; font-weight: 700; padding: 4px 12px 4px 10px; border-radius: 20px; margin-bottom: 14px;
}
.al-day-dot { width: 5px; height: 5px; border-radius: 50%; background: #fff; opacity: .7; }
.al-event { position: relative; padding-left: 40px; padding-bottom: 22px; }
.al-event::before { content: ''; position: absolute; left: 13px; top: 22px; bottom: -4px; width: 2px; background: #f0f0f0; }
.al-marker { position: absolute; left: 0; top: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 2; background: #fff; }
.al-marker-minor { width: 14px; height: 14px; left: 6px; top: 3px; border: 2px solid #e0e0e0; }
.al-marker-dot { width: 6px; height: 6px; border-radius: 50%; }
.al-marker-major { width: 28px; height: 28px; border: 2px solid; box-shadow: 0 0 0 4px #fff; }
.al-card { border: 1px solid #e0e0e0; border-radius: 10px; padding: 11px 14px; }
.al-major .al-card { border-width: 1.5px; }
.al-card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
.al-avatar { width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fff; }
.al-who { font-size: 12.5px; font-weight: 600; color: #1f1f1f; }
.al-badge { font-size: 10.5px; font-weight: 600; padding: 2px 9px; border-radius: 20px; border: 1px solid; margin-left: auto; white-space: nowrap; }
.al-desc { font-size: 12.5px; color: #1f1f1f; line-height: 1.55; }
.al-old { color: #cf1322; text-decoration: line-through; opacity: .75; }
.al-new { color: #389e0d; font-weight: 600; }
.al-time { margin-top: 7px; display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: #8c8c8c; }
.al-dot-sep { width: 3px; height: 3px; border-radius: 50%; background: #8c8c8c; opacity: .5; }
.al-load-more { text-align: center; margin-top: 6px; padding-left: 40px; }
@keyframes al-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.al-spin { animation: al-spin 1s linear infinite; }
`;
```

- [ ] **Step 2: Append the presentational subcomponents**

```javascript
const DayPill = ({ dayKey }) => (
  <div className="al-day-pill">
    <span className="al-day-dot" />
    {`${formatDay(dayKey + 'T00:00:00')} · ${dayKey.split('-').reverse().join('/')}`}
  </div>
);

const EventItem = ({ log, fkMap }) => {
  const cfg = CONFIG.actionConfig[log.action] || CONFIG.actionConfig.updated;
  const IconCmp = ICON_BY_ACTION[log.action];
  const { primary, oldVal, newVal } = getActionText(log, fkMap);
  const who = log.changedByName || 'Hệ thống';

  return (
    <div className={`al-event ${cfg.major ? 'al-major' : 'al-minor'}`}>
      {cfg.major ? (
        <div className="al-marker al-marker-major" style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color }}>
          {IconCmp && <IconCmp />}
        </div>
      ) : (
        <div className="al-marker al-marker-minor">
          <span className="al-marker-dot" style={{ background: cfg.color }} />
        </div>
      )}
      <div className="al-card">
        <div className="al-card-top">
          <div className="al-avatar" style={{ background: avatarColor(who) }}>{initials(who)}</div>
          <span className="al-who">{who}</span>
          <span className="al-badge" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>{cfg.label}</span>
        </div>
        <div className="al-desc">
          {primary}
          {oldVal && newVal && (
            <React.Fragment>: <span className="al-old">"{oldVal}"</span> → <span className="al-new">"{newVal}"</span></React.Fragment>
          )}
        </div>
        <div className="al-time">
          <span>{fmtDate(getTs(log))}</span><span className="al-dot-sep" /><span>{timeAgo(getTs(log))}</span>
        </div>
      </div>
    </div>
  );
};

const DayGroup = ({ dayKey, logs, fkMap }) => (
  <div className="al-day-group">
    <DayPill dayKey={dayKey} />
    {logs.map(l => <EventItem key={l.id} log={l} fkMap={fkMap} />)}
  </div>
);
```

- [ ] **Step 3: Verify the file still parses**

Run:
```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('JsField/ActivityTimeline.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 4: Commit**

```bash
git add JsField/ActivityTimeline.js
git commit -m "feat: add timeline CSS and presentational components to ActivityTimeline"
```

---

## Task 5: Main component — data loading, header, timeline render

**Files:**
- Modify: `JsField/ActivityTimeline.js` (append, after Task 4's code)

**Interfaces:**
- Consumes: `CONFIG`, `RECORD_ID`, `fetchAllData` (Task 3), `DayGroup` (Task 4), `getDayKey`, `getTs` (Task 2), `Icons`, `Spin`, `Empty`.
- Produces: `ActivityTimeline` component and the `ctx.render(...)` call — this makes the block renderable end-to-end for the first time (no filters yet; that's Task 6).

- [ ] **Step 1: Append the main component (no filters yet — always shows all logs)**

```javascript
const ActivityTimeline = () => {
  const [logs, setLogs] = useState([]);
  const [fkMap, setFkMap] = useState({});
  const [loading, setLoading] = useState(true);
  const fetching = useRef(false);

  const load = async () => {
    if (!RECORD_ID || fetching.current) return;
    fetching.current = true;
    setLoading(true);
    try {
      const { logs: l, fkMap: fm } = await fetchAllData(RECORD_ID);
      setLogs(l);
      setFkMap(fm);
    } catch (e) { console.error(e); }
    setLoading(false);
    fetching.current = false;
  };

  useEffect(() => { load(); }, []);

  const visibleLogs = useMemo(
    () => logs.filter(l => !CONFIG.skipFields.includes(l.fieldName)),
    [logs],
  );

  const grouped = useMemo(() => {
    const groups = {}; const order = [];
    visibleLogs.forEach(l => {
      const key = getDayKey(getTs(l));
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(l);
    });
    return order.map(key => ({ key, logs: groups[key] }));
  }, [visibleLogs]);

  if (!RECORD_ID) {
    return <div style={{ padding: 16, fontFamily: FONT, color: '#8c8c8c' }}>Không tìm thấy record ID</div>;
  }

  return (
    <div className="al-page">
      <style dangerouslySetInnerHTML={{ __html: AL_CSS }} />
      <div className="al-head">
        <div className="al-head-text">
          <div className="al-head-title">{CONFIG.title}</div>
          {!loading && <div className="al-head-sub">{visibleLogs.length} hoạt động</div>}
        </div>
        <button className="al-btn" onClick={load} disabled={loading}>
          <Icons.Refresh className={loading ? 'al-spin' : ''} />{loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      ) : visibleLogs.length === 0 ? (
        <Empty description="Không có hoạt động nào" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '32px 0' }} />
      ) : (
        <div className="al-timeline">
          {grouped.map(g => <DayGroup key={g.key} dayKey={g.key} logs={g.logs} fkMap={fkMap} />)}
        </div>
      )}
    </div>
  );
};

ctx.render(<ActivityTimeline />);
```

- [ ] **Step 2: Verify the file still parses**

Run:
```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('JsField/ActivityTimeline.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 3: Manual smoke test in Nocobase**

Paste the current contents of `JsField/ActivityTimeline.js` into a JS block on a Contract record's detail page (any existing contract with at least one edit in its history). Confirm:
- Block renders without a red error boundary / console error.
- Header shows "Lịch sử hoạt động hợp đồng" and an activity count.
- At least one day-group pill and one event card appear, matching the visual style of `JsField/ActivityTimeline_mockup.html` (marker size/color by action, avatar, badge, description text, timestamp).
- Clicking "Làm mới" re-fetches without throwing.

If anything fails, fix it in `JsField/ActivityTimeline.js` directly (this file is the source of truth from here on — Tasks 1–4's code was already verified in isolation) and re-test before moving on.

- [ ] **Step 4: Commit**

```bash
git add JsField/ActivityTimeline.js
git commit -m "feat: wire up ActivityTimeline data loading and render the timeline"
```

---

## Task 6: Toolbar filters + load-more pagination

**Files:**
- Modify: `JsField/ActivityTimeline.js` (modify the `ActivityTimeline` component from Task 5, and the CSS/JSX around it)

**Interfaces:**
- Consumes: `Input`, `Select`, `RangePicker` (Task 1), `getActionText` (Task 2), `CONFIG.actionConfig` (Task 1).
- Produces: filtering state (`keyword`, `actionFilter`, `memberFilter`, `dateRange`) and `visibleCount` pagination, replacing Task 5's unfiltered `visibleLogs`/render.

- [ ] **Step 1: Add filter state and the toolbar UI**

Replace the `ActivityTimeline` component body from Task 5 with:

```javascript
const ActivityTimeline = () => {
  const [logs, setLogs] = useState([]);
  const [fkMap, setFkMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const fetching = useRef(false);

  const load = async () => {
    if (!RECORD_ID || fetching.current) return;
    fetching.current = true;
    setLoading(true);
    try {
      const { logs: l, fkMap: fm } = await fetchAllData(RECORD_ID);
      setLogs(l);
      setFkMap(fm);
    } catch (e) { console.error(e); }
    setLoading(false);
    fetching.current = false;
  };

  useEffect(() => { load(); }, []);

  const memberOptions = useMemo(() => {
    const names = new Set();
    logs.forEach(l => names.add(l.changedByName || 'Hệ thống'));
    return [{ value: 'all', label: 'Tất cả thành viên' }, ...Array.from(names).map(n => ({ value: n, label: n }))];
  }, [logs]);

  const filtered = useMemo(() => logs.filter(l => {
    if (CONFIG.skipFields.includes(l.fieldName)) return false;
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    const who = l.changedByName || 'Hệ thống';
    if (memberFilter !== 'all' && who !== memberFilter) return false;
    if (dateRange?.[0] && dateRange?.[1]) {
      const d = new Date(getTs(l));
      if (d < dateRange[0].startOf('day').toDate() || d > dateRange[1].endOf('day').toDate()) return false;
    }
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      const { primary, oldVal, newVal } = getActionText(l, fkMap);
      return [primary, oldVal, newVal, who].some(v => (v || '').toLowerCase().includes(kw));
    }
    return true;
  }), [logs, actionFilter, memberFilter, dateRange, keyword, fkMap]);

  const grouped = useMemo(() => {
    const visible = filtered.slice(0, visibleCount);
    const groups = {}; const order = [];
    visible.forEach(l => {
      const key = getDayKey(getTs(l));
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(l);
    });
    return order.map(key => ({ key, logs: groups[key] }));
  }, [filtered, visibleCount]);

  if (!RECORD_ID) {
    return <div style={{ padding: 16, fontFamily: FONT, color: '#8c8c8c' }}>Không tìm thấy record ID</div>;
  }

  return (
    <div className="al-page">
      <style dangerouslySetInnerHTML={{ __html: AL_CSS }} />
      <div className="al-head">
        <div className="al-head-text">
          <div className="al-head-title">{CONFIG.title}</div>
          {!loading && <div className="al-head-sub">{filtered.length} hoạt động</div>}
        </div>
        <button className="al-btn" onClick={load} disabled={loading}>
          <Icons.Refresh className={loading ? 'al-spin' : ''} />{loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      <div className="al-toolbar">
        <div className="al-search-row">
          <Icons.Search />
          <Input
            placeholder="Tìm theo thành viên, mô tả hoạt động..."
            value={keyword}
            onChange={e => { setKeyword(e.target.value); setVisibleCount(20); }}
            allowClear
            bordered={false}
          />
        </div>
        <div className="al-filter-row">
          <Select
            value={actionFilter}
            onChange={val => { setActionFilter(val); setVisibleCount(20); }}
            size="small"
            style={{ width: 140 }}
            options={[{ value: 'all', label: 'Tất cả hành động' }, ...Object.entries(CONFIG.actionConfig).map(([k, v]) => ({ value: k, label: v.label }))]}
          />
          <Select
            value={memberFilter}
            onChange={val => { setMemberFilter(val); setVisibleCount(20); }}
            size="small"
            style={{ width: 170 }}
            options={memberOptions}
          />
          <RangePicker
            size="small"
            onChange={range => { setDateRange(range); setVisibleCount(20); }}
            format="DD/MM/YYYY"
            allowClear
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      ) : filtered.length === 0 ? (
        <Empty description="Không có hoạt động nào" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '32px 0' }} />
      ) : (
        <React.Fragment>
          <div className="al-timeline">
            {grouped.map(g => <DayGroup key={g.key} dayKey={g.key} logs={g.logs} fkMap={fkMap} />)}
          </div>
          {visibleCount < filtered.length && (
            <div className="al-load-more">
              <button className="al-btn" onClick={() => setVisibleCount(v => v + 20)}>Xem thêm hoạt động cũ hơn</button>
            </div>
          )}
        </React.Fragment>
      )}
    </div>
  );
};

ctx.render(<ActivityTimeline />);
```

- [ ] **Step 2: Verify the file still parses**

Run:
```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('JsField/ActivityTimeline.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 3: Manual filter checklist in Nocobase**

On the same Contract record used in Task 5's smoke test:
- Type a keyword matching one event's description → only matching events remain, count updates.
- Clear the keyword, pick "Cập nhật" in the action filter → only `updated` events remain.
- Pick a specific member in the member filter → only that member's events remain.
- Set a date range excluding all events → Empty state appears with "Không có hoạt động nào".
- Clear all filters → full list returns.
- If the record has more than 20 matching events, "Xem thêm hoạt động cũ hơn" appears and reveals more on click; otherwise confirm it does **not** appear.

- [ ] **Step 4: Commit**

```bash
git add JsField/ActivityTimeline.js
git commit -m "feat: add search/filter toolbar and load-more pagination to ActivityTimeline"
```

---

## Task 7: End-to-end verification against the mockup

**Files:** none (verification only)

- [ ] **Step 1: Side-by-side comparison**

Open `JsField/ActivityTimeline_mockup.html` in a browser next to the real block rendered in Nocobase (Task 6's environment). Confirm for each: day-pill style, major vs. minor marker sizing/color per action, avatar colors, badge colors, old→new value styling (red strikethrough / green bold), toolbar layout (search full width, filter row below), spacing/typography scale.

- [ ] **Step 2: Verify against a second real Contract record with a longer history**

Pick (or create test edits on) a Contract record with a `created` event, several `updated` events across different fields (including a `status` enum change and a `lawyerId`/`customerId` FK change), and if possible an `uploaded` mirror event from an attached document. Confirm:
- FK fields (`lawyerId`, `customerId`) show resolved names, not raw IDs.
- `status` shows the Vietnamese enum label, not the raw enum key.
- Currency fields (`value`) show `"X.XXX.XXX ₫"` formatting.
- Fields listed in `CONFIG.skipFields` do not appear as their own event cards.

- [ ] **Step 3: Record any visual/behavioral gaps and fix them directly in `JsField/ActivityTimeline.js`**

For each gap found, make the fix, re-run the Task 1 syntax-check command, and re-verify visually before moving to the next gap.

- [ ] **Step 4: Final commit**

```bash
git add JsField/ActivityTimeline.js
git commit -m "fix: address visual/behavioral gaps found in ActivityTimeline end-to-end review"
```

(Skip this commit if Step 3 found no gaps.)
