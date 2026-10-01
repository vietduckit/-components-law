const { BLOCK_FILES, isFn, isScope, declsOf, isReference, parseBlock, walk } = require("./js-scope");

// Static check for "Cannot access 'X' before initialization" (TDZ) in the JS
// Blocks — a parse check can't see it. 2026-09-25: a component-level
// `const comboBillingItems` shadowed a helper of the same name that an
// earlier useMemo called while rendering. Flags a reference to a const/let/
// class that sits before its declaration in the same scope, when the code
// runs right away: directly, in a useMemo/useState/useRef/useReducer callback,
// or in an IIFE. (Closures run later — handlers, useEffect, useCallback — are
// not flagged.)
const EAGER_HOOKS = new Set(["useMemo", "useState", "useRef", "useReducer"]);

const calleeName = (call) =>
  call?.callee?.type === "Identifier"
    ? call.callee.name
    : call?.callee?.type === "MemberExpression" && !call.callee.computed
      ? call.callee.property.name
      : null;

// Does a function node run right away where it's written?
const runsEagerly = (fn) => {
  const parent = fn._parent;
  if (!parent || parent.type !== "CallExpression") return false;
  if (parent.callee === fn) return true; // IIFE
  return parent.arguments[0] === fn && EAGER_HOOKS.has(calleeName(parent));
};

let problems = 0;
const files = process.argv.slice(2).length ? process.argv.slice(2) : BLOCK_FILES;
for (const rel of files) {
  const { ast, lineOf } = parseBlock(rel);
  walk(ast.program, (node, parent, key) => {
    if (node.type !== "Identifier" || !isReference(node, parent, key)) return;
    // walk up to the declaring scope, noting whether a deferred function was crossed
    let deferred = false;
    for (let scope = parent; scope; scope = scope._parent) {
      if (!isScope(scope)) continue;
      const decl = declsOf(scope).get(node.name);
      if (decl) {
        if (decl.tdz && !deferred && node.start < decl.start) {
          problems += 1;
          console.log(`TDZ ${rel}:${lineOf(node.start)} '${node.name}' used before its declaration (line ${lineOf(decl.start)})`);
        }
        break;
      }
      if (isFn(scope) && !runsEagerly(scope)) deferred = true;
    }
  });
  console.log(`checked ${rel}`);
}
if (problems) {
  console.log(`${problems} TDZ problem(s)`);
  process.exit(1);
}
console.log("tdz-check: no problems");
