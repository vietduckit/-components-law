const { BLOCK_FILES, isReference, parseBlock, walk, resolve } = require("./js-scope");

// Static check for globals the NocoBase RunJS sandbox blocks (2026-09-25:
// "Access to global property "innerHeight" is not allowed." when a Task
// Management status menu opened). RunJS evaluates a block in an SES
// Compartment (flow-engine JSRunner.ts); in a "JS item" / form context,
// window/document/navigator are the safe proxies of flow-engine
// utils/safeGlobals.ts. The same block file can be used as a JS Block (real
// window/document) or a JS item (proxies), so the strictest set applies.
//
// Flags:
//  - window.X / document.X / navigator.X outside the proxies' allow-lists;
//  - bare globals that don't exist in the Compartment (innerHeight,
//    getComputedStyle, localStorage, requestAnimationFrame, fetch, ...).
// DOM elements themselves (el.getBoundingClientRect(), el.parentElement, ...)
// are real objects and are fine.

const WINDOW_ALLOWED = new Set([
  "setTimeout", "clearTimeout", "setInterval", "clearInterval", "console", "Math", "Date", "FormData",
  "Blob", "URL", "addEventListener", "open", "location", "navigator",
]);
const DOCUMENT_ALLOWED = new Set(["createElement", "querySelector", "querySelectorAll"]);
const NAVIGATOR_ALLOWED = new Set(["clipboard", "onLine", "language", "languages"]);
const LOCATION_ALLOWED = new Set(["origin", "protocol", "host", "hostname", "port", "pathname", "assign", "replace", "reload"]);

// Compartment globals: what JSRunner / createSafeRunJSGlobals provide, plus
// ECMAScript intrinsics (SES keeps the standard library, not the Web APIs).
const SANDBOX_GLOBALS = new Set([
  "ctx", "window", "document", "navigator", "console", "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "Blob", "URL",
  "globalThis", "undefined", "NaN", "Infinity", "Object", "Function", "Array", "Number", "String", "Boolean",
  "Symbol", "BigInt", "Math", "JSON", "Date", "RegExp", "Error", "TypeError", "RangeError", "SyntaxError",
  "ReferenceError", "EvalError", "URIError", "AggregateError", "Map", "Set", "WeakMap", "WeakSet", "Promise",
  "Proxy", "Reflect", "ArrayBuffer", "DataView", "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array",
  "Uint16Array", "Int32Array", "Uint32Array", "Float32Array", "Float64Array", "BigInt64Array", "BigUint64Array",
  "parseInt", "parseFloat", "isNaN", "isFinite", "encodeURI", "encodeURIComponent", "decodeURI",
  "decodeURIComponent", "Intl", "arguments",
]);

// Access inside a `try { … }` block is already guarded (e.g. the best-effort
// window.parent.dispatchEvent(new CustomEvent(…)) broadcasts).
const insideTry = (node) => {
  for (let child = node, p = node._parent; p; child = p, p = p._parent) {
    if (p.type === "TryStatement" && p.block === child) return true;
  }
  return false;
};

let problems = 0;
const files = process.argv.slice(2).length ? process.argv.slice(2) : BLOCK_FILES;
for (const rel of files) {
  const { ast, lineOf } = parseBlock(rel);
  const report = (node, message) => {
    if (insideTry(node)) return;
    problems += 1;
    console.log(`SANDBOX ${rel}:${lineOf(node.start)} ${message}`);
  };
  walk(ast.program, (node, parent, key) => {
    // window.X / document.X / navigator.X (only when the name is the global)
    if ((node.type === "MemberExpression" || node.type === "OptionalMemberExpression") && node.object.type === "Identifier") {
      const obj = node.object.name;
      const allow = obj === "window" ? WINDOW_ALLOWED : obj === "document" ? DOCUMENT_ALLOWED : obj === "navigator" ? NAVIGATOR_ALLOWED : null;
      // `window.X = …` is fine: the proxy's set trap stores new keys (only
      // reading a non-allowed key throws).
      const isAssignTarget = parent && parent.type === "AssignmentExpression" && key === "left";
      if (allow && !isAssignTarget && !resolve(obj, node)) {
        const prop = node.computed
          ? node.property.type === "StringLiteral" ? node.property.value : null
          : node.property.name;
        if (prop === null) report(node, `${obj}[…] computed access — the sandbox may block it`);
        else if (!allow.has(prop)) report(node, `${obj}.${prop} is blocked by the RunJS sandbox`);
      }
      return;
    }
    // window.location.X / location.X (safe location: no href/search/hash)
    if ((node.type === "MemberExpression" || node.type === "OptionalMemberExpression") && !node.computed) {
      const obj = node.object;
      const isLocation =
        (obj.type === "Identifier" && obj.name === "location" && !resolve("location", node)) ||
        ((obj.type === "MemberExpression" || obj.type === "OptionalMemberExpression") && !obj.computed &&
          obj.object.type === "Identifier" && obj.object.name === "window" && obj.property.name === "location" &&
          !resolve("window", node));
      const isAssignTarget = parent && parent.type === "AssignmentExpression" && key === "left";
      if (isLocation && !LOCATION_ALLOWED.has(node.property.name) && !(isAssignTarget && node.property.name === "href")) {
        report(node, `location.${node.property.name} is blocked by the RunJS sandbox`);
      }
    }
    // bare free identifiers
    if (node.type === "Identifier" && isReference(node, parent, key) && !SANDBOX_GLOBALS.has(node.name)) {
      if (parent && parent.type === "UnaryExpression" && parent.operator === "typeof") return; // typeof X is safe
      if (!resolve(node.name, node)) report(node, `global "${node.name}" does not exist in the RunJS sandbox`);
    }
  });
  console.log(`checked ${rel}`);
}
if (problems) {
  console.log(`${problems} sandbox problem(s)`);
  process.exit(1);
}
console.log("sandbox-globals-check: no problems");
