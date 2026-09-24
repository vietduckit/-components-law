// Builds All Module/Case/CaseComments.js from Task/TaskDetailView.js:
// keeps every top-level declaration reachable from the Case wrapper
// (UnifiedNoteThread & co.), drops Task-only code, applies Case patches.
//
// Usage (from the repo root): node scripts/case-comments/build.mjs
// Rerun after changing Task's comment panel. Never edit CaseComments.js by
// hand — Case-only changes go in wrapper.js or in the [CASE] patches below.
import { parse } from "@babel/parser";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const HERE = path.dirname(fileURLToPath(import.meta.url)) + path.sep;
const LAW = path.resolve(HERE, "..", "..");
const SRC = path.join(LAW, "All Module", "Task", "TaskDetailView.js");
const OUT = path.join(LAW, "All Module", "Case", "CaseComments.js");

const rawSrc = readFileSync(SRC, "utf8");
const EOL = rawSrc.includes("\r\n") ? "\r\n" : "\n";
const src = rawSrc.replace(/\r\n/g, "\n");
const wrapper = readFileSync(HERE + "wrapper.js", "utf8").replace(/\r\n/g, "\n");
const PARSE_OPTS = {
  sourceType: "script",
  allowReturnOutsideFunction: true,
  allowAwaitOutsideFunction: true,
  plugins: ["jsx"],
};

const collectRefs = (node, out) => {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach((n) => collectRefs(n, out));
  if (node.type === "Identifier" || node.type === "JSXIdentifier") out.add(node.name);
  for (const key of Object.keys(node)) {
    if (["loc", "start", "end", "leadingComments", "trailingComments", "innerComments", "extra"].includes(key)) continue;
    if (key === "property" && node.type === "MemberExpression" && !node.computed) continue;
    if (key === "property" && node.type === "OptionalMemberExpression" && !node.computed) continue;
    if (key === "key" && (node.type === "ObjectProperty" || node.type === "ObjectMethod" || node.type === "ClassMethod" || node.type === "ClassProperty") && !node.computed && !node.shorthand) continue;
    collectRefs(node[key], out);
  }
};

const collectBindings = (pattern, out) => {
  if (!pattern) return;
  switch (pattern.type) {
    case "Identifier": out.add(pattern.name); break;
    case "ObjectPattern": pattern.properties.forEach((p) => collectBindings(p.type === "RestElement" ? p.argument : p.value, out)); break;
    case "ArrayPattern": pattern.elements.forEach((e) => collectBindings(e, out)); break;
    case "AssignmentPattern": collectBindings(pattern.left, out); break;
    case "RestElement": collectBindings(pattern.argument, out); break;
  }
};

const ast = parse(src, PARSE_OPTS);
const stmts = ast.program.body.map((node, i, arr) => {
  const declared = new Set();
  if (node.type === "VariableDeclaration") node.declarations.forEach((d) => collectBindings(d.id, declared));
  else if ((node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") && node.id) declared.add(node.id.name);
  const refs = new Set();
  collectRefs(node, refs);
  const sliceStart = i === 0 ? 0 : arr[i - 1].end;
  return { node, declared, refs, text: src.slice(sliceStart, node.end) };
});

// Seeds: whatever the Case wrapper references, plus top-level statements
// that declare nothing (side effects), except Task's own ctx.render.
const wrapperRefs = new Set();
collectRefs(parse(wrapper, PARSE_OPTS).program, wrapperRefs);
const needed = new Set(wrapperRefs);
const keep = new Set();
stmts.forEach((s, i) => {
  if (s.declared.size === 0) {
    if (/ctx\.render\(/.test(s.text)) return;
    keep.add(i);
    s.refs.forEach((r) => needed.add(r));
    console.log("side-effect stmt kept:", s.text.trim().split("\n")[0].slice(0, 100));
  }
});
let changed = true;
while (changed) {
  changed = false;
  stmts.forEach((s, i) => {
    if (keep.has(i)) return;
    if ([...s.declared].some((n) => needed.has(n))) {
      keep.add(i);
      changed = true;
      s.refs.forEach((r) => needed.add(r));
    }
  });
}

let body = stmts.filter((_, i) => keep.has(i)).map((s) => s.text).join("");
const dropped = stmts.filter((_, i) => !keep.has(i)).flatMap((s) => [...s.declared]);
console.log(`kept ${keep.size}/${stmts.length} top-level statements; dropped ${dropped.length} names`);

// ── Case patches (each must match exactly once) ─────────────────────
const patch = (label, from, to) => {
  const n = body.split(from).length - 1;
  if (n !== 1) throw new Error(`patch "${label}" matched ${n} times`);
  body = body.replace(from, to);
};

patch(
  "buildDocumentRecordLink: Case documents carry caseId = the Case itself",
  `      if (normalized === "SubTask" && safeRecordId) payload.subTaskId = safeRecordId;
      return payload;`,
  `      if (normalized === "SubTask" && safeRecordId) payload.subTaskId = safeRecordId;
      // [CASE] Comment của Case gắn thẳng vào Case (giống CaseNotes.js cũ).
      if (normalized === CASE_COMMENT_CONFIG.COLLECTION_NAME && safeRecordId)
        payload.caseId = safeRecordId;
      return payload;`,
);

patch(
  "buildTaskUploadDocumentLink: keep caseId for Case uploads",
  `      const { caseId: _caseId, ...rest } = buildDocumentRecordLink(collectionName, recordId, extra);
      return rest;`,
  `      const link = buildDocumentRecordLink(collectionName, recordId, extra);
      // [CASE] Upload từ comment của Case BẮT BUỘC có caseId — lý do bỏ
      // caseId ở trên chỉ áp dụng cho file upload từ Task.
      if (link.collectionName === CASE_COMMENT_CONFIG.COLLECTION_NAME) return link;
      const { caseId: _caseId, ...rest } = link;
      return rest;`,
);

patch(
  "buildDocumentRecordFilter: Case documents are filtered by caseId",
  `      if (link.collectionName) filter.push({ collectionName: { $eq: link.collectionName } });
      if (link.taskId) {`,
  `      if (link.collectionName) filter.push({ collectionName: { $eq: link.collectionName } });
      // [CASE] Tài liệu comment của Case: collectionName + caseId (khớp dữ
      // liệu CaseNotes.js cũ đã tạo).
      if (link.collectionName === CASE_COMMENT_CONFIG.COLLECTION_NAME) {
        if (!link.caseId) return null;
        filter.push({ caseId: { $eq: link.caseId } });
        return { $and: filter };
      }
      if (link.taskId) {`,
);

patch(
  "buildLegalStudySource: mark Case-origin moves as case_note",
  `      type: "task_note",`,
  `      // [CASE] File chuyển từ comment của Case ghi nguồn là case_note.
      type:
        sourceContext.collectionName === CASE_COMMENT_CONFIG.COLLECTION_NAME
          ? "case_note"
          : "task_note",`,
);

const header = `    // ============================================================
    // CaseComments.js — khung "Comments & Reports" cho Case
    // ------------------------------------------------------------
    // Toàn bộ phần thân (QuillEditor, CommentComposer, UnifiedNoteThread,
    // FileUploadModal, PreviewModal, LibraryMoveModal và các helper) được
    // TÁCH NGUYÊN từ Task/TaskDetailView.js để UI/hành vi giống hệt Task.
    // Chỉ khác:
    //   1. CASE_COMMENT_CONFIG bên dưới
    //   2. 4 chỗ vá đánh dấu [CASE] (document link/filter theo caseId,
    //      nguồn legalStudySource = case_note)
    //   3. §CASE wrapper ở cuối file (bootstrap + header)
    // FILE SINH TỰ ĐỘNG — không sửa tay. Sau khi sửa khung comment ở Task,
    // chạy lại: node scripts/case-comments/build.mjs
    // Thay đổi riêng cho Case: sửa scripts/case-comments/wrapper.js hoặc
    // các patch [CASE] trong build.mjs.
    // ============================================================
    const CASE_COMMENT_CONFIG = {
      // Collection của Case trong notes.collectionName / documents.collectionName
      COLLECTION_NAME: "Project",
      // folders.type của folder gốc Case (nơi file upload từ comment rơi vào)
      ROOT_FOLDER_TYPE: "cases",
      // Chiều cao khung: composer cố định trên, danh sách cuộn bên dưới
      PANEL_HEIGHT: "calc(100vh - 220px)",
      PANEL_MIN_HEIGHT: 560,
    };

`;

const out = header + body.replace(/^\s*\n/, "") + "\n\n" + wrapper;
parse(out, PARSE_OPTS); // throws on syntax error
writeFileSync(OUT, out.replace(/\n/g, EOL), "utf8");
console.log("written", OUT, out.split("\n").length, "lines");
