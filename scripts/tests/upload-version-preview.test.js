const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// 2026-09-25: uploading a same-name file into a Case folder saved a
// duplicate. getExistingTitlesInFolder / getNextFileIndex filtered a folder's
// documents by internalCompanyId (Case documents carry none), so no existing
// title was ever seen. The upload dialog now previews the version each file
// will be saved as, and the upload saves exactly those names.
for (const rel of [
  "All Module/Document/CaseDocument.js",
  "All Module/Document/ProjectDocument.js",
  "All Module/Document/Library.js",
]) {
  const isLibrary = rel.endsWith("Library.js");
  const file = path.resolve(__dirname, "../..", rel);
  const src = fs.readFileSync(file, "utf8").split("\r\n").join("\n");
  const start = src.indexOf("const getUniqueFileName = (fileName, existingNames) => {");
  const getUniqueFileName = new Function(`${src.slice(start, src.indexOf("\n};", start) + 3)}\nreturn getUniqueFileName;`)();
  const { withFileExtension, planUploadNames } = extractMarkedBlock(
    file,
    "// ---- upload naming helpers (pure; tested by scripts/tests/upload-version-preview.test.js) ----",
    "// ---- end upload naming helpers ----",
    ["withFileExtension", "planUploadNames"],
    { getUniqueFileName },
  );
  const f = (name) => ({ name });

  // a typed Document Name keeps the file's extension
  assert.equal(withFileExtension("Hoang", "Hoang.pdf"), "Hoang.pdf", rel);
  assert.equal(withFileExtension("Hoang.PDF", "Hoang.pdf"), "Hoang.PDF", `${rel}: no double extension`);
  assert.equal(withFileExtension("Hoang", "README"), "Hoang", `${rel}: no extension to add`);

  // the reported case: Hoang.pdf again into a folder that has it
  const one = planUploadNames([f("Hoang.pdf")], ["Hoang.pdf"], "Hoang");
  assert.deepEqual(one.map((p) => [p.saved, p.versioned]), [["Hoang (1).pdf", true]], `${rel}: previews the version`);
  // an older title saved without extension still collides with the typed name + ext? no — different names
  assert.equal(planUploadNames([f("Hoang.pdf")], ["Hoang"], "Hoang")[0].saved, "Hoang.pdf", `${rel}: extension makes it distinct`);
  // different extension → not a duplicate (user rule)
  assert.equal(planUploadNames([f("Hoang.docx")], ["Hoang.pdf"], "Hoang")[0].versioned, false, `${rel}: other extension`);
  // several files: each keeps its own name; same-name files in one batch number each other
  const batch = planUploadNames([f("a.pdf"), f("a.pdf"), f("b.pdf")], ["a.pdf"], "ignored for >1 file");
  assert.deepEqual(batch.map((p) => p.saved), ["a (1).pdf", "a (2).pdf", "b.pdf"], `${rel}: batch numbering`);

  // wiring
  assert.ok(/existingTitles = null, onClose, onSubmit \}\) => \{/.test(src), `${rel}: dialog takes the folder's titles`);
  assert.ok(/Form\.useWatch\("title", form\)/.test(src), `${rel}: preview follows the typed name`);
  assert.ok(/will be saved as new version/.test(src), `${rel}: shows the version`);
  assert.ok(
    /for \(const \{ file, saved \} of uploadPlan\)|const \{ file, saved \} = uploadPlan\[index\];/.test(src),
    `${rel}: upload saves the previewed names`,
  );
  if (isLibrary) {
    // same folder resolution as the upload itself (My Documents root)
    assert.ok(
      /fetchExistingTitlesInFolder\(resolveMyDocumentsParentId\(targetFolderId, activeSpace\)\)\.then\(/.test(src),
      `${rel}: titles loaded when the dialog opens`,
    );
    assert.equal(
      (src.match(/const filter = parentId\s*\n\s*\? \{ folderId: \{ \$eq: parentId \} \}/g) || []).length,
      2,
      `${rel}: folder lookups (titles + next index) scoped by folder only`,
    );
    assert.ok(/\.map\(\(doc\) => doc\.title \|\| doc\.name \|\| getAttachment\(doc\)\?\.filename\)/.test(src), `${rel}: compares titles`);
    assert.ok(/const displayName =\n\s+getDocTitle\(record\) \|\|/.test(src) && /const getDocTitle = \(doc\) =>\n\s+doc\?\.title \|\|/.test(src), `${rel}: list shows the title`);
  } else {
    assert.ok(/getExistingTitlesInFolder\(folderId\)\.then\(/.test(src), `${rel}: titles loaded when the dialog opens`);
    assert.equal((src.match(/if \(parentId\) \{\n\s+delete filter\.moduleScope;/g) || []).length, 2, `${rel}: folder lookups scoped by folder only`);
    assert.ok(/const displayName =\n\s+record\.title \|\|/.test(src), `${rel}: list shows the title with its extension`);
  }
}

console.log("upload-version-preview: all tests passed");
