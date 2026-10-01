// Generates pgsql/deploy/check_dev_readiness.sql — a READ-ONLY check to run on
// an instance (dev) before deploying: what of the repo's SQL objects, NocoBase
// field registrations and JS blocks the instance lacks or has in an older version.
//
//   node scripts/deploy/gen-dev-check.js
//
// Expected function bodies come from a throwaway Postgres that loads the repo
// SQL (scripts/tests/sql/run-local.sh), not from parsing the files; tables,
// columns, indexes and views are read from the files' DDL. Regenerate after
// changing any input (scripts/tests/dev-check.test.js fails when stale).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUTPUT = "pgsql/deploy/check_dev_readiness.sql";

// the definition files, in the order they are applied (docs/superpowers/deploy runbook,
// scripts/tests/sql/run-local.sh)
const SQL_FILES = [
  "pgsql/contract_billing_plans_trigger.sql",
  "pgsql/contract_payment_status_workflow.sql",
  "pgsql/by_case_payment_request_automation.sql",
  "pgsql/unified_contract_payment_schedule.sql",
  "pgsql/finance_foundation.sql",
  "pgsql/finance_billing_rules.sql",
  "pgsql/retainer_billing_run_due.sql",
  "pgsql/finance_retainer_schedule.sql",
  "pgsql/finance_members.sql",
  "pgsql/finance_notifications.sql",
  "pgsql/money_flow_foundation.sql",
  "pgsql/money_flow_trail.sql",
  "pgsql/service_thread_sync.sql",
  "pgsql/currency_catalog.sql",
];

// JS blocks: repo file and the component its code renders last (ctx.render(...))
const JS_BLOCKS = [
  { file: "All Module/Case/CaseCreateForm.js", root: "ProjectCreateForm" },
  { file: "All Module/Contract/ContractCreateForm.js", root: "ContractCreateForm" },
  { file: "All Module/Quotation/QuotationCreateForm.js", root: "QuotationCreateForm" },
  { file: "All Module/Case/CaseServices.js", root: "CaseServices" },
  { file: "All Module/Contract/ContractServices.js", root: "ContractServicesBlock" },
  { file: "All Module/Quotation/QuotationServices.js", root: "QuotationServicesBlock" },
  { file: "All Module/Contract/ContractDetailView.js", root: "ContractDetailPage" },
  { file: "All Module/Contract/ContractPaymentScheduleDetailBlock.js", root: "PaymentScheduleDetailBlock" },
  { file: "All Module/Case/CaseFinanceBlock.js", root: "CaseFinanceBlock" },
  { file: "All Module/Payment/PaymentContractDetailBlock.js", root: "PaymentContractDetailBlock" },
  { file: "All Module/Payment/PaymentRequestCreateBlock.js", root: "PaymentRequestCreateBlock" },
  { file: "All Module/Payment/PaymentCreateBlock.js", root: "PaymentCreateBlock" },
  { file: "All Module/Invoice/InvoiceCreateBlock.js", root: "InvoiceCreateBlock" },
  { file: "All Module/Service/ServiceChangeLog.js", root: "ServiceChangeLog" },
];

// NocoBase field registrations (the "fields" / "collections" tables): what each script creates
const MONEY_FLOW = ["exchangeRateToBase", "exchangeRateDate", "subTotalNative", "vatAmountNative", "totalAmountNative", "basePriceVnd"];
const FIELD_SCRIPTS = [
  {
    script: "JsField/RegisterMoneyFlowFields.js",
    fields: [
      ...["quotationServices", "contractServices", "projectServices"].flatMap((c) => MONEY_FLOW.map((f) => [c, f])),
      ["projectServices", "@belongsTo:quotationServiceId"],
    ],
  },
  {
    script: "JsField/RegisterServiceThreadFields.js",
    fields: [
      ["quotationServices", "serviceThreadId"],
      ["contractServices", "serviceThreadId"],
      ["projectServices", "serviceThreadId"],
      ["contractServices", "serviceType"],
      ["projectServices", "quantity"],
      ["@collection", "serviceChangeLogs"],
    ],
  },
  {
    script: "JsField/RegisterCompanyServiceCurrency.js",
    fields: [
      ["companyServices", "currency"],
      ["services", "basePriceVnd"], ["services", "exchangeRateToBase"], ["services", "exchangeRateDate"],
      ["companyServices", "priceVnd"], ["companyServices", "exchangeRateToBase"], ["companyServices", "exchangeRateDate"],
      ["serviceComboItems", "priceVnd"], ["serviceComboItems", "exchangeRateToBase"], ["serviceComboItems", "exchangeRateDate"],
      ["serviceCombos", "packageSubTotalVnd"], ["serviceCombos", "totalAmountVnd"],
      ["serviceCombos", "exchangeRateToBase"], ["serviceCombos", "exchangeRateDate"],
    ],
  },
];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
// the SQL side computes md5(btrim(replace(code, E'\r\n', E'\n'), E' \t\r\n'))
const normalizeCode = (code) => String(code || "").replace(/\r\n/g, "\n").replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, "");
const codeMd5 = (code) => crypto.createHash("md5").update(normalizeCode(code), "utf8").digest("hex");

const INPUT_FILES = [
  ...SQL_FILES,
  ...JS_BLOCKS.map((b) => b.file),
  ...FIELD_SCRIPTS.map((s) => s.script),
  "scripts/deploy/gen-dev-check.js",
  "scripts/deploy/expected-objects.sql",
  "scripts/deploy/check-body.sql",
];
const inputsDigest = () => {
  const h = crypto.createHash("sha256");
  INPUT_FILES.forEach((f) => h.update(`${f}\n`).update(read(f).replace(/\r\n/g, "\n")));
  return h.digest("hex");
};

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const unquote = (s) => String(s).replace(/^"|"$/g, "");
const stripComments = (sql) => sql.replace(/--[^\n]*/g, "");

// DDL declared by the files (outside nothing: dynamic SQL in bodies is rare and
// would only add an extra, harmless expectation)
const parseDdl = () => {
  const tables = new Map();
  const columns = new Map();
  const indexes = new Map();
  const views = new Map();
  const functionFile = new Map();
  for (const file of SQL_FILES) {
    const sql = stripComments(read(file));
    for (const m of sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?("?[\w]+"?)/gi)) tables.set(unquote(m[1]), file);
    for (const m of sql.matchAll(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(?:public\.)?("?[\w]+"?)([^;]*);/gi)) {
      for (const c of m[2].matchAll(/ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[\w]+"?)/gi)) {
        columns.set(`${unquote(m[1])}.${unquote(c[1])}`, file);
      }
    }
    for (const m of sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?("?[\w]+"?)\s+ON\s+(?:ONLY\s+)?(?:public\.)?("?[\w]+"?)/gi)) {
      indexes.set(unquote(m[1]), { table: unquote(m[2]), file });
    }
    for (const m of sql.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:public\.)?("?[\w]+"?)/gi)) views.set(unquote(m[1]), file);
    for (const m of sql.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?("?[\w]+"?)\s*\(/gi)) functionFile.set(unquote(m[1]), file);
  }
  return { tables, columns, indexes, views, functionFile };
};

const expectedFromPostgres = () => {
  const r = spawnSync("bash", ["scripts/tests/sql/run-local.sh", "scripts/deploy/expected-objects.sql"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const line = (r.stdout || "").split(/\r?\n/).find((l) => l.includes("@@EXPECTED@@"));
  if (r.status !== 0 || !line) throw new Error(`run-local.sh failed:\n${r.stdout}\n${r.stderr}`);
  return JSON.parse(line.slice(line.indexOf("@@EXPECTED@@") + "@@EXPECTED@@".length));
};

const values = (rows) => rows.map((r) => `  (${r.join(", ")})`).join(",\n");

const render = ({ functions, triggers, indexes }, ddl) => {
  // key column count of each index the files create (an older copy under the same name can differ)
  const indexColumns = new Map((indexes || []).map((i) => [i.name, i.columns]));
  const fns = functions.filter((f) => ddl.functionFile.has(f.name)).map((f) => ({ ...f, file: ddl.functionFile.get(f.name) }));
  const fnNames = new Set(fns.map((f) => f.name));
  const trgs = triggers.filter((t) => fnNames.has(t.function)).map((t) => ({ ...t, file: ddl.functionFile.get(t.function) }));
  const js = JS_BLOCKS.map((b) => [q(b.file), q(b.root), q(codeMd5(read(b.file)))]);
  const fields = FIELD_SCRIPTS.flatMap((s) => s.fields.map(([c, f]) => [q(c), q(f), q(s.script)]));
  const L = [];
  L.push(
    "-- ============================================================",
    "-- READINESS CHECK (read-only) — GENERATED by scripts/deploy/gen-dev-check.js; do not edit.",
    `-- inputs-sha256: ${inputsDigest()}`,
    "-- Run on the instance to check (dev): pgAdmin Query Tool, Execute (F5). Result:",
    "--   part · item · status (OK / MISSING / OUTDATED / EXTRA / INFO) · detail · action",
    "-- The first rows (part 'summary') say which SQL files / field scripts to run and",
    "-- which JS blocks to re-paste. Read-only: it only fills session TEMP tables",
    "-- (gone when the tab closes); no table of the database is written.",
    "-- ============================================================",
    ...["_check", "_exp_fn", "_exp_trg", "_exp_obj", "_exp_field", "_exp_js"].map((t) => `DROP TABLE IF EXISTS pg_temp.${t};`),
    "CREATE TEMP TABLE _check (section int, part text, item text, status text, detail text, action text);",
    "",
    "CREATE TEMP TABLE _exp_fn (name text, args text, md5 text, file text);",
    `INSERT INTO _exp_fn VALUES\n${values(fns.map((f) => [q(f.name), q(f.args), q(f.md5), q(f.file)]))};`,
    "CREATE TEMP TABLE _exp_trg (tbl text, name text, fn text, file text);",
    `INSERT INTO _exp_trg VALUES\n${values(trgs.map((t) => [q(t.table), q(t.name), q(t.function), q(t.file)]))};`,
    "CREATE TEMP TABLE _exp_obj (kind text, name text, tbl text, file text, ncols int);",
    `INSERT INTO _exp_obj VALUES\n${values([
      ...[...ddl.tables].map(([n, f]) => [q("table"), q(n), "NULL", q(f), "NULL"]),
      ...[...ddl.views].map(([n, f]) => [q("view"), q(n), "NULL", q(f), "NULL"]),
      ...[...ddl.indexes].map(([n, v]) => [q("index"), q(n), q(v.table), q(v.file), indexColumns.get(n) ?? "NULL"]),
      ...[...ddl.columns].map(([n, f]) => [q("column"), q(n.split(".")[1]), q(n.split(".")[0]), q(f), "NULL"]),
    ])};`,
    "CREATE TEMP TABLE _exp_field (coll text, name text, script text);",
    `INSERT INTO _exp_field VALUES\n${values(fields)};`,
    "CREATE TEMP TABLE _exp_js (file text, root text, md5 text);",
    `INSERT INTO _exp_js VALUES\n${values(js)};`,
    "",
  );
  L.push(fs.readFileSync(path.join(__dirname, "check-body.sql"), "utf8").replace(/\r\n/g, "\n").trimEnd(), "");
  return L.join("\n") + "\n";
};

const main = () => {
  const ddl = parseDdl();
  const expected = expectedFromPostgres();
  const out = render(expected, ddl);
  fs.mkdirSync(path.join(ROOT, path.dirname(OUTPUT)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, OUTPUT), out);
  console.log(`wrote ${OUTPUT}: ${out.split("\n").length} lines`);
};

if (require.main === module) main();

module.exports = { OUTPUT, SQL_FILES, JS_BLOCKS, FIELD_SCRIPTS, INPUT_FILES, inputsDigest, normalizeCode, codeMd5 };
