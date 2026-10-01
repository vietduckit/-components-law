// Writes the repo's three create forms into the LOCAL NocoBase copy
// (localhost / nocobase-law): every JS block whose code declares the form and
// whose parent chain reaches a root gets the repo file. Orphans (a missing
// parent somewhere up the chain) are listed, not written.
//
//   node scripts/local/deploy-create-forms.js           # dry run
//   node scripts/local/deploy-create-forms.js --apply   # back up + write, one transaction
//
// Password: pgpass / PGPASSWORD. Connects to the local copy only.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const FORMS = [
  { name: "Case", file: "All Module/Case/CaseCreateForm.js", marker: "const ProjectCreateForm = () =>" },
  { name: "Contract", file: "All Module/Contract/ContractCreateForm.js", marker: "const ContractCreateForm = () =>" },
  { name: "Quotation", file: "All Module/Quotation/QuotationCreateForm.js", marker: "const QuotationCreateForm = () =>" },
];
const CODE_PATH = ["stepParams", "jsSettings", "runJs", "code"];
const codeOf = (options) => CODE_PATH.reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), options);

const planTargets = (models, forms = FORMS) => {
  const byUid = new Map(models.map((m) => [m.uid, m]));
  const attached = (uid) => {
    const seen = new Set();
    let current = byUid.get(uid);
    while (current) {
      if (seen.has(current.uid)) return false;
      seen.add(current.uid);
      const parentId = current.options && current.options.parentId;
      if (!parentId) return true;
      current = byUid.get(parentId);
    }
    return false;
  };
  const targets = [];
  const orphans = [];
  for (const model of models) {
    const code = codeOf(model.options);
    if (typeof code !== "string") continue;
    const form = forms.find((f) => code.includes(f.marker));
    if (!form) continue;
    (attached(model.uid) ? targets : orphans).push({ uid: model.uid, form: form.name, oldLength: code.length });
  }
  return { targets, orphans };
};

const withCode = (options, code) => {
  const next = JSON.parse(JSON.stringify(options || {}));
  let node = next;
  CODE_PATH.slice(0, -1).forEach((key) => {
    if (!node[key] || typeof node[key] !== "object") node[key] = {};
    node = node[key];
  });
  node[CODE_PATH[CODE_PATH.length - 1]] = code;
  return next;
};

async function main() {
  const apply = process.argv.includes("--apply");
  const { Client } = require("pg");
  const client = new Client({ host: "localhost", port: 5432, user: "postgres", database: "nocobase-law" });
  await client.connect();
  try {
    const { rows } = await client.query('SELECT uid, options FROM "flowModels"');
    const models = rows.map((r) => ({ uid: r.uid, options: typeof r.options === "string" ? JSON.parse(r.options) : r.options }));
    const { targets, orphans } = planTargets(models);
    const codes = Object.fromEntries(FORMS.map((f) => [f.name, fs.readFileSync(path.join(ROOT, f.file), "utf8")]));
    for (const f of FORMS) {
      if (!codes[f.name].includes(f.marker)) throw new Error(`${f.file} lost its marker "${f.marker}"`);
    }
    console.log(`targets (${targets.length}):`);
    targets.forEach((t) => console.log(`  ${t.form.padEnd(9)} ${t.uid}  ${t.oldLength} -> ${codes[t.form].length}`));
    console.log(`orphans, not written (${orphans.length}):`);
    orphans.forEach((t) => console.log(`  ${t.form.padEnd(9)} ${t.uid}`));
    if (!apply) {
      console.log("dry run — pass --apply to write");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
    const backup = `flowModels_backup_${stamp}`;
    await client.query("BEGIN");
    await client.query(`CREATE TABLE "${backup}" (LIKE "flowModels" INCLUDING ALL)`);
    await client.query(`INSERT INTO "${backup}" SELECT * FROM "flowModels" WHERE uid = ANY($1)`, [targets.map((t) => t.uid)]);
    for (const t of targets) {
      const model = models.find((m) => m.uid === t.uid);
      await client.query('UPDATE "flowModels" SET options = $1::json WHERE uid = $2', [JSON.stringify(withCode(model.options, codes[t.form])), t.uid]);
    }
    await client.query("COMMIT");
    console.log(`written ${targets.length}; backup table "${backup}"`);
    console.log(`restore: UPDATE "flowModels" f SET options = b.options FROM "${backup}" b WHERE f.uid = b.uid;`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = { planTargets, withCode, FORMS };
