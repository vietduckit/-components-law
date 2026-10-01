const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");
const { findUiStrings, isVietnamese, MARK_START, MARK_END } = require("../i18n/ui-strings");

// 2026-10-01: JS Block labels follow NocoBase's UI language. Every block in
// scripts/i18n/converted.json wraps its UI strings in tr("English") and
// carries a VI dictionary (tool: scripts/i18n/ui-strings.js).
// Per block in the manifest:
//   allow:   strings that stay as they are (stored data, data vocabulary,
//            dev text); the scanner lists every UI-position string and every
//            string with Vietnamese letters
//   dynamicKeys: VI keys may be used through tr(variable) (only checked to
//                appear somewhere in the source)
const root = path.resolve(__dirname, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "scripts/i18n/converted.json"), "utf8"));
assert.ok(manifest.length > 0, "no converted block listed");

// tr("…") calls inside arguments that write or look up stored data
const DATA_CALLS = /^(logActivity|fetchFiles|fetchChildActivityLogs|fetchActivityLog|fetchActivityLogs|buildTaskUploadDocumentLink|apiReq|createAny|createWithPayloadFallback|updateAny)$/;
const trInsideDataWrites = (src) => {
  const { parse } = require("../i18n/ui-strings");
  const ast = parse(src);
  const found = [];
  const visit = (node, inData) => {
    if (!node || typeof node.type !== "string") return;
    if (inData && node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "tr") {
      const arg = node.arguments[0];
      found.push({ line: node.loc.start.line, key: arg && arg.type === "StringLiteral" ? arg.value : "?" });
      return;
    }
    let childInData = inData;
    if (node.type === "CallExpression") {
      const c = node.callee;
      const name = c.type === "Identifier" ? c.name : c.type === "MemberExpression" && c.property.type === "Identifier" ? c.property.name : "";
      if (DATA_CALLS.test(name)) {
        node.arguments.forEach((a) => visit(a, true));
        visit(node.callee, inData);
        return;
      }
    }
    if (node.type === "ObjectProperty" && !node.computed) {
      const k = node.key.type === "Identifier" ? node.key.name : node.key.type === "StringLiteral" ? node.key.value : "";
      if (k === "data" || k === "values") childInData = true;
    }
    for (const key of Object.keys(node)) {
      if (key === "loc" || key === "start" || key === "end" || key.endsWith("Comments")) continue;
      const child = node[key];
      if (Array.isArray(child)) child.forEach((c) => visit(c, childInData));
      else if (child && typeof child.type === "string") visit(child, childInData);
    }
  };
  visit(ast.program, false);
  return found;
};

const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const literalKeys = (src) => [...src.matchAll(/\btr\(\s*("(?:[^"\\]|\\.)*")/g)].map((m) => JSON.parse(m[1]));

for (const entry of manifest) {
  const rel = entry.file;
  const file = path.join(root, rel);
  const src = fs.readFileSync(file, "utf8");
  assert.ok(src.includes(MARK_START) && src.includes(MARK_END), `${rel}: ui language block`);
  const { pickLang, makeTr, VI } = extractMarkedBlock(file, MARK_START, MARK_END, ["pickLang", "makeTr", "VI"]);

  // language + translation helpers
  assert.equal(pickLang("vi-VN"), "vi", rel);
  assert.equal(pickLang("vi"), "vi", rel);
  assert.equal(pickLang("en-US"), "en", rel);
  assert.equal(pickLang("zh-CN"), "en", rel);
  assert.equal(pickLang(null), "en", rel);
  const t = makeTr("vi", { "{n} items": "{n} mục" });
  assert.equal(t("{n} items", { n: 3 }), "3 mục", rel);
  assert.equal(makeTr("en", {})("{n} items", { n: 3 }), "3 items", rel);
  assert.equal(t("Missing"), "Missing", `${rel}: a label without Vietnamese shows in English`);
  assert.ok(
    /const tr = makeTr\(pickLang\(ctx\.i18n\?\.language \|\| ctx\.auth\?\.locale\), VI\);/.test(src),
    `${rel}: language read from ctx (no extra request)`,
  );

  // dictionary complete and used, placeholders matching
  const used = new Set(literalKeys(src));
  for (const key of used) assert.ok(key in VI, `${rel}: no Vietnamese text for "${key}"`);
  const body = src.slice(0, src.indexOf(MARK_START)) + src.slice(src.indexOf(MARK_END));
  for (const key of Object.keys(VI)) {
    const isUsed = used.has(key) || (entry.dynamicKeys && body.includes(JSON.stringify(key)));
    assert.ok(isUsed, `${rel}: unused Vietnamese text for "${key}"`);
    // Vietnamese may drop a placeholder (English plural "task{1}"), never add one
    const keyNames = new Set(placeholders(key).split(","));
    for (const name of placeholders(VI[key]).split(",").filter(Boolean)) {
      assert.ok(keyNames.has(name), `${rel}: placeholder {${name}} of "${key}"`);
    }
    assert.ok(!isVietnamese(key.replace(/\b(e\.g\.|VD:).*/, "")) || (entry.viKeys || []).includes(key), `${rel}: English key "${key}"`);
  }

  // a translated label must not be compared in code (the UI value is now the
  // Vietnamese text): `x === "Done"` / `case "Done":` against a VI key
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const compared = [];
  for (const key of Object.keys(VI)) {
    const q = escapeRe(JSON.stringify(key));
    const re = new RegExp(`(===|!==|\\bcase)\\s*${q}|${q}\\s*(===|!==)`);
    if (re.test(body) && !(entry.compareOk || []).includes(key)) compared.push(key);
  }
  assert.deepEqual(compared, [], `${rel}: translated labels compared in code (check they are not data)`);

  // no tr() inside a data write: activity log / collection-name arguments,
  // apiReq payloads, ctx.api.request({ data }) — stored text stays English
  const trInWrites = trInsideDataWrites(src).filter((t) => !(entry.dataTrOk || []).includes(t.key));
  assert.deepEqual(trInWrites.map((t) => `${t.line}: ${t.key}`), [], `${rel}: tr() inside data writes`);

  // no UI string (nor any Vietnamese string) left outside tr()
  const allow = new Set(entry.allow || []);
  const left = findUiStrings(src).filter((c) => !allow.has(c.value));
  assert.deepEqual(
    left.map((c) => `${c.line}: ${c.value}`),
    [],
    `${rel}: UI strings outside tr()`,
  );
}

console.log(`i18n-blocks: ${manifest.length} block(s) passed`);
