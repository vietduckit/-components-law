const fs = require("fs");
const path = require("path");
const { parse } = require("@babel/parser");

// Minimal scope analysis over @babel/parser's AST (no @babel/traverse in this
// repo), shared by the static checks for JS Blocks: tdz-check.js and
// sandbox-globals-check.js.

const root = path.resolve(__dirname, "../..");

// Every JS Block pasted into NocoBase (all .js under "All Module").
const listJs = (dir) =>
  fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return listJs(rel);
    return entry.name.endsWith(".js") ? [rel] : [];
  });
const BLOCK_FILES = listJs("All Module").sort();

const SKIP_KEYS = new Set(["loc", "_parent", "_decls", "leadingComments", "trailingComments", "innerComments", "extra"]);
const isFn = (n) =>
  !!n && (n.type === "FunctionDeclaration" || n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression" ||
    n.type === "ObjectMethod" || n.type === "ClassMethod");
const isScope = (n) =>
  !!n && (n.type === "Program" || n.type === "BlockStatement" || isFn(n) || n.type === "CatchClause" ||
    n.type === "ForStatement" || n.type === "ForInStatement" || n.type === "ForOfStatement" || n.type === "SwitchStatement" ||
    n.type === "ClassExpression" || n.type === "ClassDeclaration");

const patternNames = (p, out = []) => {
  if (!p) return out;
  if (p.type === "Identifier") out.push(p);
  else if (p.type === "ObjectPattern") p.properties.forEach((prop) => patternNames(prop.type === "RestElement" ? prop.argument : prop.value, out));
  else if (p.type === "ArrayPattern") p.elements.forEach((el) => patternNames(el, out));
  else if (p.type === "AssignmentPattern") patternNames(p.left, out);
  else if (p.type === "RestElement") patternNames(p.argument, out);
  return out;
};

// name -> { tdz, start } declared directly in a scope node
const declsOf = (scope) => {
  if (scope._decls) return scope._decls;
  const decls = new Map();
  const add = (id, tdz, start) => decls.set(id.name, { tdz, start });
  if (isFn(scope)) {
    (scope.params || []).forEach((p) => patternNames(p).forEach((id) => add(id, false, -1)));
    if (scope.type === "FunctionExpression" && scope.id) add(scope.id, false, -1);
  }
  if ((scope.type === "ClassExpression" || scope.type === "ClassDeclaration") && scope.id) add(scope.id, false, -1);
  if (scope.type === "CatchClause" && scope.param) patternNames(scope.param).forEach((id) => add(id, false, -1));
  const body =
    scope.type === "Program" || scope.type === "BlockStatement"
      ? scope.body
      : scope.type === "SwitchStatement"
        ? scope.cases.flatMap((c) => c.consequent)
        : scope.type === "ForStatement"
          ? [scope.init].filter(Boolean)
          : scope.type === "ForInStatement" || scope.type === "ForOfStatement"
            ? [scope.left]
            : [];
  for (const stmt of body) {
    if (!stmt) continue;
    if (stmt.type === "VariableDeclaration") {
      const tdz = stmt.kind !== "var";
      stmt.declarations.forEach((d) => patternNames(d.id).forEach((id) => add(id, tdz, d.start)));
    } else if (stmt.type === "FunctionDeclaration" && stmt.id) add(stmt.id, false, -1);
    else if (stmt.type === "ClassDeclaration" && stmt.id) add(stmt.id, true, stmt.start);
  }
  scope._decls = decls;
  return decls;
};

// Hoisted `var`s live in the nearest function.
const collectVars = (node, fnScope) => {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach((n) => collectVars(n, fnScope));
  if (node !== fnScope && isFn(node)) return;
  if (node.type === "VariableDeclaration" && node.kind === "var") {
    const decls = declsOf(fnScope);
    node.declarations.forEach((d) => patternNames(d.id).forEach((id) => decls.set(id.name, { tdz: false, start: -1 })));
  }
  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) continue;
    const v = node[key];
    if (v && typeof v === "object") collectVars(v, fnScope);
  }
};

const isReference = (node, parent, key) => {
  if (!parent) return true;
  if ((parent.type === "MemberExpression" || parent.type === "OptionalMemberExpression") && key === "property" && !parent.computed) return false;
  if ((parent.type === "ObjectProperty" || parent.type === "ObjectMethod" || parent.type === "ClassMethod" || parent.type === "ClassProperty") && key === "key" && !parent.computed) return false;
  if (parent.type === "VariableDeclarator" && key === "id") return false;
  if (isFn(parent) && (key === "id" || key === "params")) return false;
  if ((parent.type === "ClassDeclaration" || parent.type === "ClassExpression") && key === "id") return false;
  if (parent.type === "LabeledStatement" || parent.type === "BreakStatement" || parent.type === "ContinueStatement") return false;
  if (parent.type === "CatchClause" && key === "param") return false;
  if (parent.type === "ArrayPattern" || parent.type === "ObjectPattern" || parent.type === "RestElement") return false;
  if (parent.type === "AssignmentPattern" && key === "left") return false;
  if (parent.type === "ObjectProperty" && key === "value" && parent._parent?.type === "ObjectPattern") return false;
  return true;
};

// Parse a block the way NocoBase runs it (body of an async function) and
// link parents / hoist vars. Returns { ast, lineOf }.
const parseBlock = (rel) => {
  const src = fs.readFileSync(path.resolve(root, rel), "utf8");
  const prefix = "async function __block(){\n";
  const ast = parse(`${prefix}${src}\n}`, { sourceType: "script", plugins: ["jsx"], allowReturnOutsideFunction: true });
  const link = (node, parent) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach((n) => link(n, parent));
    if (!node.type) return;
    node._parent = parent;
    if (isFn(node)) collectVars(node.body, node);
    for (const key of Object.keys(node)) {
      if (SKIP_KEYS.has(key)) continue;
      const v = node[key];
      if (v && typeof v === "object") link(v, node);
    }
  };
  link(ast.program, null);
  const lineOf = (pos) => src.slice(0, Math.max(0, pos - prefix.length)).split("\n").length;
  return { ast, lineOf };
};

// Visit every node: cb(node, parent, key).
const walk = (node, cb, parent = null, key = null) => {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach((n) => walk(n, cb, parent, key));
  if (!node.type) return;
  cb(node, parent, key);
  for (const k of Object.keys(node)) {
    if (SKIP_KEYS.has(k)) continue;
    const v = node[k];
    if (v && typeof v === "object") walk(v, cb, node, k);
  }
};

// Innermost declaration of `name` visible from `node` → { scope, decl } or null (a free/global name).
const resolve = (name, node) => {
  for (let scope = node; scope; scope = scope._parent) {
    if (!isScope(scope)) continue;
    const decl = declsOf(scope).get(name);
    if (decl) return { scope, decl };
  }
  return null;
};

module.exports = { BLOCK_FILES, isFn, isScope, declsOf, isReference, parseBlock, walk, resolve };
