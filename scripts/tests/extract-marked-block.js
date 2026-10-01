const fs = require("fs");

// Pulls the source between two marker comments out of a NocoBase JS Block
// file and evaluates it in isolation, returning the named bindings. Lets
// pure helpers that must physically live inside a single-file block still
// be unit-tested from Node. `deps` injects outer-scope bindings the block
// reads (e.g. React, C) as parameters.
function extractMarkedBlock(filePath, startMarker, endMarker, exportNames, deps = {}) {
  const src = fs.readFileSync(filePath, "utf8");
  const a = src.indexOf(startMarker);
  const b = src.indexOf(endMarker);
  if (a < 0 || b < 0 || b < a) {
    throw new Error(`Markers not found in ${filePath}: ${startMarker} / ${endMarker}`);
  }
  const body = src.slice(a + startMarker.length, b);
  // Blocks with UI labels in tr("English") (scripts/i18n/ui-strings.js): a
  // helper extracted on its own gets the English tr unless the test passes one.
  if (!("tr" in deps) && /\btr\(/.test(body)) {
    deps = {
      ...deps,
      tr: (text, vars) =>
        vars ? text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m)) : text,
    };
  }
  const names = Object.keys(deps);
  const factory = new Function(...names, `${body}\nreturn { ${exportNames.join(", ")} };`);
  return factory(...names.map((name) => deps[name]));
}

module.exports = { extractMarkedBlock };
