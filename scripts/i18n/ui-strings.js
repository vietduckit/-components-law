// ============================================================
// UI string conversion for JS Blocks (2026-10-01).
//
// Labels follow NocoBase's UI language: a block wraps every UI string in
// tr("English text") and carries a VI dictionary (English key -> Vietnamese),
// chosen from ctx.i18n.language (see the "ui language" block this tool
// inserts; reference: All Module/Case/CaseNotes.js). Stored data is never
// translated.
//
//   node scripts/i18n/ui-strings.js scan  <block.js> [--context] [--english]
//                                                                 list UI strings
//   node scripts/i18n/ui-strings.js apply <block.js> <map.json>   convert in place
//
// map.json: {
//   "map":  { "<literal or template key>": "<the other language>" | null },
//   "skipLines": [<line>, ...],     // data on these lines stays as it is
//   "extra": [[old, new], ...]      // exact edits after the conversion
// }
// A literal with Vietnamese letters is Vietnamese (its mapping is the English
// key); any other literal is English (its mapping is the Vietnamese text).
// null = not UI text (left alone). A template `a ${x} b` is keyed "a {0} b"
// and becomes tr("A {0} B", { 0: x }).
// ============================================================
const fs = require("fs");
const parser = require("@babel/parser");

const MARK_START = "// ---- ui language (pure; tested by scripts/tests/i18n-blocks.test.js) ----";
const MARK_END = "// ---- end ui language ----";
const UI_PROPS = new Set([
  "label", "title", "placeholder", "tooltip", "description", "okText", "cancelText",
  "content", "message", "hint", "emptyText", "text", "sub", "extra", "help", "tip",
  "caption", "subtitle", "header", "notFoundContent", "addonBefore", "addonAfter",
  "alt", "confirmText", "emptyDescription", "summary", "heading", "subTitle",
  "helpText", "tooltipText", "buttonText", "statusText", "loadingText",
]);
const MESSAGE_FNS = new Set(["success", "error", "warning", "warn", "info", "loading", "open"]);
const ELEMENT_FNS = new Set(["createElement", "h", "el", "ce"]);
const DIRECT_FNS = new Set(["alert", "confirm", "setError", "setErrorMessage", "setStatusText"]);
const VI_CHARS = /[À-ÖØ-öø-ỹĐđ]/; // Latin letters with diacritics (× ÷ excluded)

const isVietnamese = (s) => VI_CHARS.test(s);
// UI text: has a letter and is not an identifier / key / URL / CSS value.
const looksLikeText = (s) => {
  const t = String(s).trim();
  if (!t || !/\p{L}/u.test(t)) return false;
  if (isVietnamese(t)) return true;
  if (/^(https?:|\/|#|\.|data:|mailto:)/i.test(t)) return false;
  if (/^[a-z][A-Za-z0-9_.:-]*$/.test(t)) return false; // identifiers, enum values, css
  if (/^[A-Z0-9_]+$/.test(t) && t.length > 1 && /_/.test(t)) return false; // CONSTANTS
  if (/^\d/.test(t) && /^[\d.\s%a-z()-]+$/.test(t)) return false; // 12px, 100%
  return true;
};

const parse = (src) =>
  parser.parse(src, {
    sourceType: "module",
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true,
    plugins: ["jsx"],
  });

const calleeName = (callee) => {
  if (!callee) return "";
  if (callee.type === "Identifier") return callee.name;
  if (callee.type === "MemberExpression" && !callee.computed && callee.property.type === "Identifier") {
    return callee.property.name;
  }
  return "";
};
const calleeObject = (callee) =>
  callee && callee.type === "MemberExpression" ? calleeName(callee.object) || (callee.object.type === "Identifier" ? callee.object.name : "") : "";

// Template literal -> { key: "a {0} b", exprs: [src of x] }
const templateKey = (node, src) => {
  let key = "";
  const exprs = [];
  node.quasis.forEach((q, i) => {
    key += q.value.cooked;
    if (i < node.expressions.length) {
      key += `{${i}}`;
      const e = node.expressions[i];
      exprs.push({ start: e.start, end: e.end, text: src.slice(e.start, e.end) });
    }
  });
  return { key, exprs };
};

// Collects UI string nodes under an expression in a UI position.
const collectFrom = (node, src, out, kind) => {
  if (!node) return;
  switch (node.type) {
    case "StringLiteral":
      if (looksLikeText(node.value) && !looksLikeMarkup(node.value)) out.push({ node, value: node.value, kind, template: false });
      return;
    case "TemplateLiteral": {
      const { key, exprs } = templateKey(node, src);
      const plain = key.replace(/\{\d+\}/g, "");
      if (looksLikeMarkup(key)) return;
      if (looksLikeText(plain) || (exprs.length && /\p{L}{2,}/u.test(plain))) {
        out.push({ node, value: key, kind, template: true, exprs });
      }
      return;
    }
    case "ConditionalExpression":
      collectFrom(node.consequent, src, out, kind);
      collectFrom(node.alternate, src, out, kind);
      return;
    case "LogicalExpression":
      collectFrom(node.left, src, out, kind);
      collectFrom(node.right, src, out, kind);
      return;
    case "BinaryExpression":
      if (node.operator === "+") {
        collectFrom(node.left, src, out, kind);
        collectFrom(node.right, src, out, kind);
      }
      return;
    case "ParenthesizedExpression":
      collectFrom(node.expression, src, out, kind);
      return;
    default:
  }
};

const walk = (node, visit, parent, ancestors = []) => {
  if (!node || typeof node.type !== "string") return;
  visit(node, parent, ancestors);
  const next = ancestors.concat([node]);
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "start" || key === "end" || key === "extra" || key.endsWith("Comments")) continue;
    const child = node[key];
    if (Array.isArray(child)) child.forEach((c) => c && typeof c.type === "string" && walk(c, visit, node, next));
    else if (child && typeof child.type === "string") walk(child, visit, node, next);
  }
};

// CSS values, font stacks, HTTP verbs, date formats are not text.
const looksLikeEnglishText = (v) => {
  const t = String(v).trim();
  if (!looksLikeText(t) || !/[A-Za-z]{2}/.test(t) || !/\s|^[A-Z]/.test(t)) return false;
  if (/^[A-Z]+$/.test(t)) return false; // POST, GET, VND
  if (/\d+(px|em|rem|vh|vw|ms|s)|#[0-9a-f]{3,8}|sans-serif|monospace|rgba?\(|!important|^(solid|dashed|dotted)/i.test(t)) return false;
  if (/^[DMYHhms\/\-:. ]+$/.test(t)) return false; // DD/MM/YYYY
  if (looksLikeMarkup(t)) return false;
  return true;
};
// HTML / CSS / SVG source is not text.
const looksLikeMarkup = (t) =>
  /^\s*</.test(t) || /[\w-]+\s*:\s*[^;{}]+;/.test(t) || /\{[^{}]*:[^{}]*\}/.test(t.replace(/\{\d+\}/g, ""));

// English text outside the usual UI positions (helper returns, [label, value]
// tuples, constants…), for blocks written in English. Skips what translating
// would break: comparisons, case labels, string methods, regexes, styles,
// request params, console output, object keys.
const NON_UI_PROPS = new Set([
  "style", "url", "fields", "appends", "sort", "filter", "params", "data", "values", "headers",
  "collection", "resource", "method", "key", "dataIndex", "name", "type", "mode", "id", "field",
  "path", "href", "src", "className", "rowKey", "triggerType", "status", "code", "value",
  "format", "border", "borderTop", "borderBottom", "borderLeft", "borderRight", "fontFamily",
  "boxShadow", "transition", "transform", "gridTemplateColumns", "padding", "margin", "font",
  "background", "backgroundImage", "outline", "width", "height", "maxWidth", "minWidth",
  "collectionName", "templateKey", "storageType", "moduleScope", "accept", "target", "rel",
]);
const STRING_METHODS = new Set([
  "includes", "startsWith", "endsWith", "indexOf", "lastIndexOf", "split", "replace", "replaceAll",
  "match", "matchAll", "test", "search", "localeCompare", "padStart", "padEnd", "join",
  "querySelector", "querySelectorAll", "getElementById", "getAttribute", "setAttribute",
  "addEventListener", "removeEventListener", "toLocaleString", "toLocaleDateString", "getItem", "setItem",
  "normalize", "toString", "format", "getFieldValue", "setFieldValue", "setFieldsValue",
]);
const isEnglishUiCandidate = (node, parent, ancestors) => {
  if (parent && parent.type === "ObjectProperty" && parent.key === node) return false;
  if (parent && (parent.type === "BinaryExpression" && /^(===|!==|==|!=|in|instanceof)$/.test(parent.operator))) return false;
  if (parent && parent.type === "SwitchCase") return false;
  if (parent && (parent.type === "ImportDeclaration" || parent.type === "TemplateLiteral")) return false;
  if (parent && parent.type === "MemberExpression" && parent.property === node) return false;
  for (const a of ancestors) {
    if (a.type === "CallExpression") {
      const callee = a.callee;
      if (callee.type === "MemberExpression") {
        const obj = callee.object && callee.object.type === "Identifier" ? callee.object.name : "";
        const prop = calleeName(callee);
        if (obj === "console" || obj === "JSON" || obj === "Object" || obj === "localStorage" || obj === "sessionStorage") return false;
        if (STRING_METHODS.has(prop) && a.arguments.includes(parent === a ? node : null)) return false;
        if (STRING_METHODS.has(prop) && a.arguments.some((arg) => arg.start <= node.start && arg.end >= node.end) && a.arguments.indexOf(a.arguments.find((arg) => arg.start <= node.start && arg.end >= node.end)) >= 0 && parent === a) return false;
      }
      if (callee.type === "Identifier" && /^(RegExp|require|requireAsync|importAsync|fetch|setTimeout)$/.test(callee.name)) return false;
    }
    if (a.type === "NewExpression" && a.callee.type === "Identifier" && /^(RegExp|Date|URL)$/.test(a.callee.name)) return false;
    if (a.type === "ObjectProperty" && !a.computed) {
      const k = a.key.type === "Identifier" ? a.key.name : a.key.type === "StringLiteral" ? a.key.value : "";
      if (NON_UI_PROPS.has(k)) return false;
    }
  }
  return true;
};

const findUiStrings = (src, options = {}) => {
  const ast = parse(src);
  const out = [];
  const isInsideTr = new Set();
  walk(ast.program, (node) => {
    if (node.type === "CallExpression") {
      const name = calleeName(node.callee);
      const obj = calleeObject(node.callee);
      if (name === "tr" && node.callee.type === "Identifier") {
        node.arguments.forEach((a) => isInsideTr.add(a));
        return;
      }
      if (ELEMENT_FNS.has(name) && (name === "createElement" || node.callee.type === "Identifier")) {
        node.arguments.slice(2).forEach((a) => collectFrom(a, src, out, "child"));
        return;
      }
      if (MESSAGE_FNS.has(name) && /^(message|notification|msg)$/i.test(obj)) {
        node.arguments.slice(0, 1).forEach((a) => collectFrom(a, src, out, "message"));
        return;
      }
      if (DIRECT_FNS.has(name) && node.callee.type === "Identifier") {
        node.arguments.slice(0, 1).forEach((a) => collectFrom(a, src, out, "call"));
      }
      return;
    }
    if (node.type === "NewExpression" && calleeName(node.callee) === "Error") {
      node.arguments.slice(0, 1).forEach((a) => collectFrom(a, src, out, "error"));
      return;
    }
    if (node.type === "ObjectProperty" && !node.computed) {
      const key = node.key.type === "Identifier" ? node.key.name : node.key.type === "StringLiteral" ? node.key.value : "";
      if (UI_PROPS.has(key)) collectFrom(node.value, src, out, `prop:${key}`);
      return;
    }
    if (node.type === "JSXText" && looksLikeText(node.value)) {
      out.push({ node, value: node.value.trim(), kind: "jsxtext", template: false });
      return;
    }
    if (node.type === "JSXAttribute" && node.value && node.value.type === "StringLiteral") {
      const key = node.name && node.name.name;
      if (UI_PROPS.has(key) && looksLikeText(node.value.value)) {
        out.push({ node: node.value, value: node.value.value, kind: `jsxattr:${key}`, template: false, jsxAttr: true });
      }
    }
  });
  // loose pass: any other string with Vietnamese letters (helper returns,
  // divider("…"), strings inside template expressions…): UI or stored data,
  // decided per block in its map
  const collected = new Set(out.map((c) => c.node.start));
  const inConsole = (ancestors) =>
    ancestors.some(
      (a) =>
        a.type === "CallExpression" &&
        a.callee.type === "MemberExpression" &&
        a.callee.object.type === "Identifier" &&
        a.callee.object.name === "console",
    );
  walk(ast.program, (node, parent, ancestors) => {
    if (collected.has(node.start)) return;
    if (inConsole(ancestors)) return;
    if (parent && parent.type === "ObjectProperty" && parent.key === node) return;
    if (parent && (parent.type === "ImportDeclaration" || parent.type === "TemplateLiteral")) return;
    if (node.type === "StringLiteral" && isVietnamese(node.value)) {
      out.push({ node, value: node.value, kind: "vi", template: false, jsxAttr: !!parent && parent.type === "JSXAttribute" });
    } else if (node.type === "TemplateLiteral" && node.quasis.some((q) => isVietnamese(q.value.cooked || ""))) {
      const { key, exprs } = templateKey(node, src);
      out.push({ node, value: key, kind: "vi", template: true, exprs });
    } else if (node.type === "JSXText" && isVietnamese(node.value)) {
      out.push({ node, value: node.value.trim(), kind: "jsxtext", template: false });
    }
  });
  if (options.english) {
    const have = new Set(out.map((c) => c.node.start));
    walk(ast.program, (node, parent, ancestors) => {
      if (have.has(node.start)) return;
      if (node.type === "StringLiteral" && looksLikeEnglishText(node.value)) {
        if (isEnglishUiCandidate(node, parent, ancestors)) out.push({ node, value: node.value, kind: "en", template: false, jsxAttr: !!parent && parent.type === "JSXAttribute" });
      } else if (node.type === "TemplateLiteral" && node.quasis.some((q) => /[A-Za-z]{3}/.test(q.value.cooked || "") && /\s/.test(q.value.cooked || ""))) {
        if (!isEnglishUiCandidate(node, parent, ancestors)) return;
        const { key, exprs } = templateKey(node, src);
        if (/^[\s{}0-9.,:;/()#-]*$/.test(key.replace(/\{\d+\}/g, "")) || looksLikeMarkup(key)) return;
        out.push({ node, value: key, kind: "en", template: true, exprs });
      }
    });
  }
  // nothing inside tr(...) or the language block itself
  const trRanges = [];
  walk(ast.program, (node) => {
    if (node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "tr") {
      trRanges.push([node.start, node.end]);
    }
  });
  const blockStart = src.indexOf(MARK_START);
  if (blockStart >= 0) trRanges.push([blockStart, src.indexOf(MARK_END)]);
  const inTr = (n) => trRanges.some(([a, b]) => n.start >= a && n.end <= b);
  // a node can be reached twice (nested UI positions): keep one
  const seen = new Set();
  return out
    .filter((c) => !isInsideTr.has(c.node) && !inTr(c.node))
    .filter((c) => (seen.has(c.node.start) ? false : seen.add(c.node.start)))
    .map((c) => ({ ...c, line: c.node.loc.start.line, start: c.node.start, end: c.node.end }))
    .sort((a, b) => a.start - b.start);
};

// ---- the block inserted into each converted file ----
const jsString = (s) => JSON.stringify(s);
const languageBlock = (entries, nl) =>
  [
    MARK_START,
    "// Labels follow the language NocoBase's UI runs in (ctx.i18n.language: the",
    "// user's appLang, else the system default; changing it reloads the page):",
    "// Vietnamese for \"vi-*\", English otherwise. The English text is the key, so a",
    "// label missing from VI shows in English; {name} placeholders are filled from",
    "// vars. Stored data is not translated. Tool: scripts/i18n/ui-strings.js.",
    "const pickLang = (locale) => (/^vi\\b/i.test(String(locale || \"\").trim()) ? \"vi\" : \"en\");",
    "const makeTr = (lang, dict) => (text, vars) => {",
    "  const template = (lang === \"vi\" && dict[text]) || text;",
    "  return vars",
    "    ? template.replace(/\\{(\\w+)\\}/g, (match, name) => (name in vars ? String(vars[name]) : match))",
    "    : template;",
    "};",
    "const VI = {",
    ...entries.map(([k, v]) => `  ${jsString(k)}: ${jsString(v)},`),
    "};",
    MARK_END,
    "const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);",
    "",
  ].join(nl);

const trCall = (key, exprTexts) =>
  exprTexts && exprTexts.length
    ? `tr(${jsString(key)}, { ${exprTexts.map((e, i) => `${i}: ${e}`).join(", ")} })`
    : `tr(${jsString(key)})`;

const apply = (file, mapFile) => {
  const src = fs.readFileSync(file, "utf8");
  const nl = src.includes("\r\n") ? "\r\n" : "\n";
  const spec = JSON.parse(fs.readFileSync(mapFile, "utf8"));
  const map = spec.map || {};
  const skip = new Set(spec.skipLines || []);
  if (src.includes(MARK_START)) throw new Error(`${file} is already converted`);
  const found = findUiStrings(src, { english: !!spec.english });
  const missing = [];
  const entries = new Map(); // English key -> Vietnamese
  const conflicts = new Set();
  const edits = [];
  for (const c of found) {
    if (skip.has(c.line)) continue;
    // lineMap: a decision for one line (the same text is UI on one line and
    // stored data on another)
    const lineMap = spec.lineMap || {};
    const lineKey = `${c.line}:${c.value}`;
    const has = lineKey in lineMap || c.value in map;
    if (!has) {
      missing.push(`${c.line}: ${c.value}`);
      continue;
    }
    const other = lineKey in lineMap ? lineMap[lineKey] : map[c.value];
    if (other === null) continue;
    // viSource: Vietnamese words without diacritics ("Cao", "Sau")
    const srcVi = isVietnamese(c.value) || (spec.viSource || []).includes(c.value);
    const en = srcVi ? other : c.value;
    // viFor: one Vietnamese wording for an action written two ways (Huỷ/Hủy…)
    const vi = (spec.viFor || {})[en] || (srcVi ? c.value : other);
    if (isVietnamese(en.replace(/\b(e\.g\.|VD:).*/, ""))) throw new Error(`English key has Vietnamese letters: ${en}`);
    if (entries.has(en) && entries.get(en) !== vi) {
      // one Vietnamese wording per English key: the first one wins (viFor overrides)
      conflicts.add(`"${en}": "${entries.get(en)}" / "${vi}"`);
    } else {
      entries.set(en, vi);
    }
    edits.push({ ...c, en });
  }
  if (missing.length) {
    throw new Error(`No mapping for ${missing.length} UI string(s):\n${missing.join("\n")}`);
  }
  // render a range with every edit inside it applied (innermost first, so a
  // translated string inside a template's ${…} lands in its tr() vars)
  const render = (from, to) => {
    const inside = edits
      .filter((e) => e.start >= from && e.end <= to && !(e.start === from && e.end === to))
      .sort((a, b) => a.start - b.start || b.end - a.end);
    const top = [];
    inside.forEach((e) => {
      const last = top[top.length - 1];
      if (!last || e.start >= last.end) top.push(e);
    });
    let text = "";
    let pos = from;
    top.forEach((e) => {
      text += src.slice(pos, e.start) + editText(e);
      pos = e.end;
    });
    return text + src.slice(pos, to);
  };
  const editText = (e) => {
    const call = trCall(e.en, e.template ? e.exprs.map((x) => render(x.start, x.end)) : null);
    if (e.jsxAttr) return `{${call}}`;
    if (e.kind === "jsxtext") {
      const raw = src.slice(e.start, e.end);
      return raw.match(/^\s*/)[0] + `{${call}}` + raw.match(/\s*$/)[0];
    }
    return call;
  };
  let out = render(0, src.length);
  for (const [oldText, newText] of spec.extra || []) {
    const o = oldText.replace(/\n/g, nl);
    const count = out.split(o).length - 1;
    if (count < 1) throw new Error(`extra edit not found: ${oldText.slice(0, 80)}`);
    out = out.split(o).join(newText.replace(/\n/g, nl));
  }
  for (const [en, vi] of spec.addEntries || []) entries.set(en, vi);
  // the block goes right before the first statement (header comments stay on top)
  const ast = parse(out);
  let insertAt = ast.program.body[0].start;
  // ...but above a "// ---- … ----" marker that opens a region tests extract
  // on their own (extractMarkedBlock): `const tr = …(ctx…)` must stay outside
  const marker = /^\/\/ ---- .* ----\r?$/m.exec(out.slice(0, insertAt));
  if (marker) insertAt = marker.index;
  out = out.slice(0, insertAt) + languageBlock([...entries], nl) + nl + out.slice(insertAt);
  fs.writeFileSync(file, out, "utf8");
  return { converted: edits.length, labels: entries.size, unifiedWordings: [...conflicts] };
};

module.exports = { findUiStrings, isVietnamese, looksLikeText, MARK_START, MARK_END, parse };

if (require.main === module) {
  const [cmd, file, mapFile] = process.argv.slice(2);
  if (cmd === "scan") {
    const src = fs.readFileSync(file, "utf8");
    const lines = src.split(/\r?\n/);
    const found = findUiStrings(src, { english: process.argv.includes("--english") });
    const byValue = new Map();
    found.forEach((c) => {
      const row = byValue.get(c.value) || { value: c.value, lines: [], kinds: new Set(), template: c.template };
      row.lines.push(c.line);
      row.kinds.add(c.kind);
      byValue.set(c.value, row);
    });
    if (process.argv.includes("--context")) {
      found.forEach((c) => console.log(`${c.line}\t${c.kind}\t${lines[c.line - 1].trim().slice(0, 140)}`));
    } else {
      console.log(JSON.stringify([...byValue.values()].map((r) => ({ ...r, kinds: [...r.kinds] })), null, 1));
    }
  } else if (cmd === "apply") {
    console.log(JSON.stringify(apply(file, mapFile)));
  } else {
    console.error("usage: ui-strings.js scan <file> [--context] | apply <file> <map.json>");
    process.exit(1);
  }
}
