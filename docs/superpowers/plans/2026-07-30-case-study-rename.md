# Case Reference → Case Study Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename every user-facing "Case Reference"/"Reference" string to "Case Study" in `All Module/Document/Library.js`, remove the unused Manager/Members/Priority/Status fields from the create form, and remove the always-blank "Reference Code" column — with zero change to the underlying collection, field names, internal variable names, or data flow.

**Architecture:** Three independent, additive-free edits inside the single existing `Library.js` block: (1) a sweep of ~20 display-text string replacements (JSX text nodes, `message.*` calls, `title:`/`label:` string literals), (2) deletion of two `<Row>` blocks (4 `Form.Item`s) from the "Create Case Study" modal, (3) deletion of one column definition object from the Case Study gallery table. No new files, no schema change, no renamed collection/API/variable.

**Tech Stack:** Plain JS + JSX (this file uses JSX directly — match the surrounding style in every edit), Nocobase `ctx.api.request`. No test framework in this repo — verification is a temporary Babel-parser syntax-check script (`node --check` cannot parse this file's raw JSX), run after each task, matching the convention already used throughout this session.

## Global Constraints

- **Single file, no new files, no imports.** `Library.js` is one self-contained Nocobase JS block (project memory: `nocobase-single-file-constraint`). Every task below edits this one file only.
- **Text-only rename.** Per the approved design spec (`docs/superpowers/specs/2026-07-30-case-study-rename-design.md`), do **not** rename the `legalReference`/`legalReferences`/`LegalReference` collection/API calls, do **not** rename internal variables/state/functions (`activeLegalReferenceId`, `legalReferences`, `openLegalReferenceDetail`, `handleCreateLegalReference`, `getLegalReferenceDisplayName`, etc.), and do **not** touch the `priority`/`status` fields on the schema itself (they still exist on the record — only the UI no longer sets them, per the spec's Non-goals). Only change string literals that render as UI text.
- **No live Nocobase runtime available.** Verification is a Babel-parser syntax check (JSX-aware) plus manual review against the exact before/after snippets in each step — call this out explicitly rather than skipping it.
- **Line numbers drift.** Every step below is anchored on exact verbatim text (multi-line snippets), not line numbers — line numbers in parentheses are only orientation hints, current as of this plan's writing. If a snippet doesn't match exactly, stop and re-read the file at the referenced area before editing.
- **Git identity may not be configured.** If a commit step fails with "Author identity unknown", do not run `git config`. Leave the change staged, note it, and move to the next task.

---

## Task 1: Rename all "Case Reference"/"Reference" display text to "Case Study"

**Files:**
- Modify: `All Module/Document/Library.js` (~20 non-contiguous string-literal edits, listed below in file order)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — pure string-literal edits, no signature or behavior changes. Task 2 and Task 3 edit different, non-overlapping regions of the same file and do not depend on this task's edits.

- [ ] **Step 1: `getLegalReferenceDisplayName` fallback (~line 2507)**

Before:
```js
      (record.id ? `Case Reference ${record.id}` : "Case Reference")
```
After:
```js
      (record.id ? `Case Study ${record.id}` : "Case Study")
```

- [ ] **Step 2: `handleCreateLegalReference` messages (~lines 7522-7565)**

Before:
```js
          attachmentUploadFailed = true;
          message.warning(
            "Case Reference was created, but its ID could not be detected for document upload.",
          );
```
After:
```js
          attachmentUploadFailed = true;
          message.warning(
            "Case Study was created, but its ID could not be detected for document upload.",
          );
```

Before:
```js
            errorMessage: "Upload file for Case Reference failed",
```
After:
```js
            errorMessage: "Upload file for Case Study failed",
```

Before:
```js
              errorMessage: "Upload folder for Case Reference failed",
```
After:
```js
              errorMessage: "Upload folder for Case Study failed",
```

Before:
```js
        if (attachmentUploadFailed) {
          message.warning(
            "Case Reference was created, but some documents failed to upload.",
          );
        } else {
          message.success("Case Reference created successfully.");
        }
        closeCreateReferenceModal();
        loadData();
      } catch (e) {
        console.error(e);
        message.error("Create Case Reference failed.");
```
After:
```js
        if (attachmentUploadFailed) {
          message.warning(
            "Case Study was created, but some documents failed to upload.",
          );
        } else {
          message.success("Case Study created successfully.");
        }
        closeCreateReferenceModal();
        loadData();
      } catch (e) {
        console.error(e);
        message.error("Create Case Study failed.");
```

- [ ] **Step 3: `handleEditTemplateSubmit` success message (~line 7600)**

Before:
```js
        message.success("Case Reference updated successfully!");
```
After:
```js
        message.success("Case Study updated successfully!");
```

- [ ] **Step 4: `handleLinkCaseSubmit` warning (~line 7640)**

Before:
```js
          message.warning("Please select a Case Reference to link");
```
After:
```js
          message.warning("Please select a Case Study to link");
```

- [ ] **Step 5: `handleDeleteTemplate` confirm dialog + success message (~lines 8863-8904)**

Before:
```js
      Modal.confirm({
        title: isLegalRef
          ? `Confirm deletion of Case Reference "${templateRecord.title || templateRecord.name}"?`
          : `Confirm deletion of document type "${templateRecord.title || templateRecord.name}"?`,
        icon: React.createElement(
          "span",
          { style: { color: "#faad14", marginRight: 16 } },
          WarningIcon,
        ),
        content: isLegalRef
          ? "Are you sure you want to delete this Case Reference? Documents and folders belonging to this case will remain in Trash or become unlinked."
          : "Are you sure you want to delete this document type? Documents under this type will remain stored but will no longer be linked.",
```
After:
```js
      Modal.confirm({
        title: isLegalRef
          ? `Confirm deletion of Case Study "${templateRecord.title || templateRecord.name}"?`
          : `Confirm deletion of document type "${templateRecord.title || templateRecord.name}"?`,
        icon: React.createElement(
          "span",
          { style: { color: "#faad14", marginRight: 16 } },
          WarningIcon,
        ),
        content: isLegalRef
          ? "Are you sure you want to delete this Case Study? Documents and folders belonging to this case will remain in Trash or become unlinked."
          : "Are you sure you want to delete this document type? Documents under this type will remain stored but will no longer be linked.",
```

Before:
```js
            message.success(
              isLegalRef ? "Case Reference deleted" : "Document type deleted",
            );
```
After:
```js
            message.success(
              isLegalRef ? "Case Study deleted" : "Document type deleted",
            );
```

- [ ] **Step 6: `handleRenameSubmit` success message (~line 8960)**

Before:
```js
          message.success("Case Reference renamed");
```
After:
```js
          message.success("Case Study renamed");
```

- [ ] **Step 7: Row-level context menu "Delete" item label (~line 9356)**

Before:
```js
          items.push({
            key: "delete",
            label: renderContextMenuItemLabel(
              DELETE_ICON,
              "Delete Case Reference",
              "#cf1322",
            ),
```
After:
```js
          items.push({
            key: "delete",
            label: renderContextMenuItemLabel(
              DELETE_ICON,
              "Delete Case Study",
              "#cf1322",
            ),
```

- [ ] **Step 8: Gallery table column title "Reference Name" (~line 9779)**

Before:
```js
          {
            title: "Reference Name",
            key: "title",
            minWidth: 250,
            sorter: (a, b) => (a.title || "").localeCompare(b.title || "", "vi"),
```
After:
```js
          {
            title: "Case Study Name",
            key: "title",
            minWidth: 250,
            sorter: (a, b) => (a.title || "").localeCompare(b.title || "", "vi"),
```

- [ ] **Step 9: Row-action tooltip "Delete Case Reference" (~line 9928)**

Before:
```js
                <Tooltip title="Delete Case Reference">
```
After:
```js
                <Tooltip title="Delete Case Study">
```

- [ ] **Step 10: Entity-gallery context menu delete confirm + success (~lines 11004-11020)**

Before:
```js
                        Modal.confirm({
                          title: "Delete Case Reference?",
                          content: `Delete "${getLegalReferenceDisplayName(rec)}" cannot be undone.`,
```
After:
```js
                        Modal.confirm({
                          title: "Delete Case Study?",
                          content: `Delete "${getLegalReferenceDisplayName(rec)}" cannot be undone.`,
```

Before:
```js
                              message.success("Case Reference deleted");
                              loadData();
                            } catch {
                              message.error("Delete failed");
                            }
```
After:
```js
                              message.success("Case Study deleted");
                              loadData();
                            } catch {
                              message.error("Delete failed");
                            }
```

- [ ] **Step 11: Sidebar comment + nav item label (~lines 11200, 11240)**

Before:
```js
                {/* ── FLAT NAV: Customer, Case Reference, Legal Study ── */}
```
After:
```js
                {/* ── FLAT NAV: Customer, Case Study, Legal Study ── */}
```

Before:
```js
                        {
                          key: "legal_reference",
                          label: "Case Reference",
```
After:
```js
                        {
                          key: "legal_reference",
                          label: "Case Study",
```

- [ ] **Step 12: Sidebar search placeholder (~line 11734)**

Before:
```js
                        : activeSpace === "legal_reference"
                            ? "Search case reference..."
                            : "Search legal study..."
```
After:
```js
                        : activeSpace === "legal_reference"
                            ? "Search case study..."
                            : "Search legal study..."
```

- [ ] **Step 13: Entity gallery table column title (~line 13101)**

Before:
```js
                              {
                                title: "Case Reference Name",
                                key: "name",
```
After:
```js
                              {
                                title: "Case Study Name",
                                key: "name",
```

- [ ] **Step 14: Table-view empty state (legal_reference gallery, ~lines 13176-13197)**

Before:
```js
                            <Empty
                              description={
                                sidebarSearch
                                  ? "Not found"
                                  : "No Case Reference yet"
                              }
                            />
```
After:
```js
                            <Empty
                              description={
                                sidebarSearch
                                  ? "Not found"
                                  : "No Case Study yet"
                              }
                            />
```

Before:
```js
                              >
                                + Create Case Reference
                              </button>
                            )}
                          </div>
                        ) : (
                          <Row gutter={[10, 10]}>
                            {items.map((ref) => {
                              const rid = String(extractId(ref));
```
After:
```js
                              >
                                + Create Case Study
                              </button>
                            )}
                          </div>
                        ) : (
                          <Row gutter={[10, 10]}>
                            {items.map((ref) => {
                              const rid = String(extractId(ref));
```

- [ ] **Step 15: Main grid-view empty state (~lines 13529-13572)**

Before:
```js
                            {activeSpace === "legal_reference" &&
                            !activeLegalReferenceId
                              ? "No Case Reference yet"
                              : activeSpace === "trash"
                                ? "Trash is empty"
                                : query
                                  ? "No results found"
                                  : "Folder is empty"}
```
After:
```js
                            {activeSpace === "legal_reference" &&
                            !activeLegalReferenceId
                              ? "No Case Study yet"
                              : activeSpace === "trash"
                                ? "Trash is empty"
                                : query
                                  ? "No results found"
                                  : "Folder is empty"}
```

Before:
```js
                            {activeSpace === "legal_reference" &&
                            !activeLegalReferenceId
                              ? "Click + Create Case Reference below to get started"
                              : activeSpace === "trash"
```
After:
```js
                            {activeSpace === "legal_reference" &&
                            !activeLegalReferenceId
                              ? "Click + Create Case Study below to get started"
                              : activeSpace === "trash"
```

Before:
```js
                            >
                              + Create Case Reference
                            </button>
                          ) : (
```
After:
```js
                            >
                              + Create Case Study
                            </button>
                          ) : (
```

- [ ] **Step 16: "Create Case Study" modal title (~line 14767)**

Before:
```js
            >
              Create Case Reference
            </span>
          }
          open={isCreateTemplateOpen}
```
After:
```js
            >
              Create Case Study
            </span>
          }
          open={isCreateTemplateOpen}
```

- [ ] **Step 17: Title field label + placeholder (~lines 14783-14789)**

Before:
```js
                <Form.Item
                  name="title"
                  label="Reference Name"
                  rules={[{ required: true, message: "Please enter a name" }]}
                >
                  <Input placeholder="Enter reference name..." />
                </Form.Item>
```
After:
```js
                <Form.Item
                  name="title"
                  label="Case Study Name"
                  rules={[{ required: true, message: "Please enter a name" }]}
                >
                  <Input placeholder="Enter case study name..." />
                </Form.Item>
```

- [ ] **Step 18: Description field label + placeholder (~lines 14884-14889)**

Before:
```js
            <Form.Item name="description" label="Reference Summary">
              <Input.TextArea
                rows={4}
                placeholder="Summarize the reference content..."
              />
            </Form.Item>
```
After:
```js
            <Form.Item name="description" label="Case Study Summary">
              <Input.TextArea
                rows={4}
                placeholder="Summarize the case study content..."
              />
            </Form.Item>
```

- [ ] **Step 19: "Reference To" field label → "Linked Cases" (~lines 14890-14894)**

Reuses the exact label already used by the gallery table column "Linked Cases" elsewhere in this file, for consistency.

Before:
```js
            <Form.Item
              name="caseIds"
              label="Reference To"
              extra="Link to ongoing cases in the system."
            >
```
After:
```js
            <Form.Item
              name="caseIds"
              label="Linked Cases"
              extra="Link to ongoing cases in the system."
            >
```

- [ ] **Step 20: "Link Case" modal title (~line 15118)**

Before:
```js
            >
              Link Case Reference
            </span>
          }
          open={isLinkCaseOpen}
```
After:
```js
            >
              Link Case Study
            </span>
          }
          open={isLinkCaseOpen}
```

- [ ] **Step 21: Verify no stray occurrences were missed**

Run:
```bash
grep -n "Case Reference\|Reference Name\|Reference Summary\|Reference To\|Search case reference\|Link Case Reference" "All Module/Document/Library.js"
```
Expected: no matches. (2 unrelated comments mentioning "Legal Reference / Customer" near the top of the file, ~lines 55 and 84, are about a different module (`DASHBOARD_CONFIG` "Internal Templates") and are explicitly out of scope — do not touch them if they show up in a broader `Reference` search.) Also confirm the "New Case Study" label near the top-bar "New" dropdown (~line 11992) is untouched — it already read "New Case Study" before this task and needs no change.

- [ ] **Step 22: Babel syntax check**

Run (creates a temporary checker script, matching this repo's established convention for this file since `node --check` cannot parse its JSX):
```bash
cat > "__tmp_check_syntax.mjs" << 'EOF'
import { parse } from "@babel/parser";
import { readFileSync } from "fs";
const file = process.argv[2];
const code = readFileSync(file, "utf8");
try {
  parse(code, {
    sourceType: "module",
    plugins: ["jsx", "classProperties", "optionalChaining", "nullishCoalescingOperator"],
  });
  console.log("OK:", file);
} catch (e) {
  console.error("SYNTAX ERROR:", e.message);
  process.exit(1);
}
EOF
node "__tmp_check_syntax.mjs" "All Module/Document/Library.js"
rm "__tmp_check_syntax.mjs"
```
Expected: `OK: All Module/Document/Library.js`. If it errors, re-open the file at the reported line and fix before continuing — do not proceed to commit with a syntax error.

- [ ] **Step 23: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "$(cat <<'EOF'
rename: Case Reference -> Case Study display text

UI-only rename per docs/superpowers/specs/2026-07-30-case-study-rename-design.md
Part 1 — every user-facing string (sidebar, modals, messages, tooltips,
table columns, empty states) now reads "Case Study" instead of "Case
Reference"/"Reference". Collection name, API calls, and internal
variable/function names are unchanged (legalReference/legalReferences
stays as-is), matching the spec's non-goals.
EOF
)"
```

---

## Task 2: Remove Manager/Members/Priority/Status fields from "Create Case Study" modal

**Files:**
- Modify: `All Module/Document/Library.js` (~lines 14811-14883, inside the `createTemplateForm` JSX, between the title/company `<Row>` and the description `Form.Item`)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new. `handleCreateLegalReference` (edited by Task 1's Step 2 for message text only) already builds `priority: values.priority || null, status: values.status || null` in its payload (~lines 7508-7509) — after this task, `values.priority`/`values.status` are simply always `undefined` since the form no longer collects them, so the payload keeps sending `priority: null, status: null`. This is intentional per the spec (Part 2: "Không cần sửa gì thêm ở khối payload này") — do **not** edit `handleCreateLegalReference`'s payload object as part of this task.

- [ ] **Step 1: Delete the Manager/Members `<Row>` and the Priority/Status `<Row>`**

Before (the entire block, verbatim, sits between the title/company `<Row>` that ends with `</Row>` right before this block, and the description `Form.Item` right after it):
```js
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="managerId" label="Manager">
                  <Select
                    placeholder="Select manager..."
                    allowClear
                    optionFilterProp="label"
                    showSearch
                  >
                    {users.map((u) => {
                      const uid = String(extractId(u));
                      const label =
                        u.nickname || u.username || u.email || `User #${uid}`;
                      return (
                        <Select.Option key={uid} value={uid} label={label}>
                          {label}
                        </Select.Option>
                      );
                    })}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="memberIds" label="Members">
                  <Select
                    mode="multiple"
                    placeholder="Select members..."
                    allowClear
                    optionFilterProp="label"
                    showSearch
                  >
                    {users.map((u) => {
                      const uid = String(extractId(u));
                      const label =
                        u.nickname || u.username || u.email || `User #${uid}`;
                      return (
                        <Select.Option key={uid} value={uid} label={label}>
                          {label}
                        </Select.Option>
                      );
                    })}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="priority" label="Priority">
                  <Select
                    placeholder="Select priority..."
                    allowClear
                    options={[
                      { value: "low", label: "Low" },
                      { value: "medium", label: "Medium" },
                      { value: "high", label: "Cao" },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="status" label="Status">
                  <Select
                    placeholder="Select status..."
                    allowClear
                    options={[
                      { value: "Active", label: "Active" },
                      { value: "Closed", label: "Closed" },
                      { value: "Pending", label: "Pending" },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
```
After: (delete the whole block above — nothing replaces it; the form now goes directly from the title/company `Row` to the `description` `Form.Item`)

- [ ] **Step 2: Manual review — confirm JSX still balances**

Re-read the form from the closing `</Row>` of the title/company row through the `description` `Form.Item` and confirm: exactly one `<Row gutter={16}>...</Row>` pair remains before `description` (the title/company one), no dangling `<Col>`/`</Col>` or `<Row>`/`</Row>` tags, and `<Form form={createTemplateForm} ...>` still has a single well-formed JSX tree.

- [ ] **Step 3: Babel syntax check**

Run the same temporary checker as Task 1 Step 22 (recreate the script, run it, delete it):
```bash
cat > "__tmp_check_syntax.mjs" << 'EOF'
import { parse } from "@babel/parser";
import { readFileSync } from "fs";
const file = process.argv[2];
const code = readFileSync(file, "utf8");
try {
  parse(code, {
    sourceType: "module",
    plugins: ["jsx", "classProperties", "optionalChaining", "nullishCoalescingOperator"],
  });
  console.log("OK:", file);
} catch (e) {
  console.error("SYNTAX ERROR:", e.message);
  process.exit(1);
}
EOF
node "__tmp_check_syntax.mjs" "All Module/Document/Library.js"
rm "__tmp_check_syntax.mjs"
```
Expected: `OK: All Module/Document/Library.js`.

- [ ] **Step 4: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "$(cat <<'EOF'
feat: drop unused Manager/Members/Priority/Status fields from Create Case Study

These 4 fields were collected in the create form but never written to
the record — handleCreateLegalReference's payload never referenced
values.managerId/values.memberIds, and priority/status were always sent
as null since nothing downstream ever set them meaningfully. Per
docs/superpowers/specs/2026-07-30-case-study-rename-design.md Part 2,
remove the dead UI; the record's priority/status fields still exist on
the schema (non-goal: no schema change), they're just never set from
this form anymore.
EOF
)"
```

---

## Task 3: Remove the always-blank "Reference Code" column

**Files:**
- Modify: `All Module/Document/Library.js` (~lines 9766-9777, inside `tableColumns`'s `activeSpace === "legal_reference" && !activeLegalReferenceId` branch)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new. The `tableData` search filter (~line 6364) that matches against `r.referenceCode` is untouched — the spec explicitly keeps search-by-`referenceCode` working for any legacy data, this task only removes the **display column**, not the underlying field or its use in search.

- [ ] **Step 1: Delete the "Reference Code" column object**

Before (this column sits between the "STT" column and the "Reference Name"/"Case Study Name" column — the "Reference Name" column will already read "Case Study Name" if Task 1 ran first, or still "Reference Name" if this task runs before Task 1; match on the surrounding structure, not the title text, since these are independent edits):
```js
          {
            title: "STT",
            key: "stt",
            width: 60,
            align: "center",
            render: (_, __, index) => index + 1,
          },
          {
            title: "Reference Code",
            key: "referenceCode",
            width: 150,
            sorter: (a, b) =>
              (a.referenceCode || "").localeCompare(b.referenceCode || "", "vi"),
            render: (_, record) => (
              <Text style={{ fontWeight: 600, color: "#111827" }}>
                {record.referenceCode || "—"}
              </Text>
            ),
          },
          {
```
After:
```js
          {
            title: "STT",
            key: "stt",
            width: 60,
            align: "center",
            render: (_, __, index) => index + 1,
          },
          {
```

- [ ] **Step 2: Babel syntax check**

Run the same temporary checker as Task 1 Step 22 / Task 2 Step 3 (recreate, run, delete):
```bash
cat > "__tmp_check_syntax.mjs" << 'EOF'
import { parse } from "@babel/parser";
import { readFileSync } from "fs";
const file = process.argv[2];
const code = readFileSync(file, "utf8");
try {
  parse(code, {
    sourceType: "module",
    plugins: ["jsx", "classProperties", "optionalChaining", "nullishCoalescingOperator"],
  });
  console.log("OK:", file);
} catch (e) {
  console.error("SYNTAX ERROR:", e.message);
  process.exit(1);
}
EOF
node "__tmp_check_syntax.mjs" "All Module/Document/Library.js"
rm "__tmp_check_syntax.mjs"
```
Expected: `OK: All Module/Document/Library.js`.

- [ ] **Step 3: Manual review checklist (no live Nocobase runtime this session)**

- Exactly one column object was removed (the `referenceCode` one) — the `STT` column immediately above and the `Reference Name`/`Case Study Name` column immediately below are both untouched and still separated by exactly one comma.
- `tableData`'s search filter at ~line 6364 (`` `${r.referenceCode || ""} ${r.title || ""} ${r.description || ""}` ``) was **not** touched by this task.

- [ ] **Step 4: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "$(cat <<'EOF'
fix: remove always-blank Reference Code column from Case Study table

referenceCode was never set by the create/edit forms, so this column
always rendered "—". Per
docs/superpowers/specs/2026-07-30-case-study-rename-design.md Part 3,
drop it from the gallery table; referenceCode-based search stays intact
for any legacy data that might have it set outside this UI.
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Spec Part 1 (đổi text "Case Reference" → "Case Study", bảng đầy đủ vị trí) → Task 1, all 20 rows from the spec's table covered as edit steps, plus the "New Case Study" already-correct note carried into Step 21's verification. ✅
- Spec Part 2 (bỏ Manager/Members/Priority/Status khỏi form, không cần sửa payload) → Task 2. ✅
- Spec Part 3 (bỏ cột Reference Code, giữ nguyên search filter) → Task 3. ✅
- Spec's non-goals (không đổi collection/API/biến nội bộ, không đổi hành vi Link Case/upload/permission) → confirmed no task touches `legalReference:`/`legalReferences:`/`LegalReference:` URLs, no task renames a variable/function, Task 2 explicitly calls out not touching the payload object.

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N" phrasing — every step has literal before/after code or an exact shell command.

**Type consistency:** No new functions/types introduced by this plan — pure string-literal and JSX-block deletions. The one shared name across tasks (`__tmp_check_syntax.mjs` verification script) is used identically in all 3 tasks.
