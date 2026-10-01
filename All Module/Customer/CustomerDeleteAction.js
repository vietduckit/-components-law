// ============================================================
// CustomerDeleteAction.js — "Delete" for the Customers table (JS action,
// 2026-09-25). One script, two places:
//   * row action   → deletes that row's customer (ctx.filterByTk);
//   * table action → deletes the selected customers (bulk select).
//
// Before confirming it lists what goes with each customer: its folders (with
// their subfolders and documents), which move to Trash when the customer is
// deleted. Customers that still have Cases can't be deleted — they are listed
// and skipped (a single one only gets the warning).
// The database enforces both (pgsql/document_naming_guards.sql); this action
// only shows them before the user confirms.
//
// Install:
//   * row:   Customers table → row Actions → Add "JS action" → paste →
//            title "Delete" (danger) → hide the native row Delete.
//   * bulk:  Customers table → table Actions (toolbar) → Add "JS action" →
//            paste the same code → title "Delete" (danger) → hide the native
//            toolbar Delete.
// ============================================================

// ---- ui language (pure; tested by scripts/tests/i18n-blocks.test.js) ----
// Labels follow the language NocoBase's UI runs in (ctx.i18n.language: the
// user's appLang, else the system default; changing it reloads the page):
// Vietnamese for "vi-*", English otherwise. The English text is the key, so a
// label missing from VI shows in English; {name} placeholders are filled from
// vars. Stored data is not translated. Tool: scripts/i18n/ui-strings.js.
const pickLang = (locale) => (/^vi\b/i.test(String(locale || "").trim()) ? "vi" : "en");
const makeTr = (lang, dict) => (text, vars) => {
  const template = (lang === "vi" && dict[text]) || text;
  return vars
    ? template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
    : template;
};
const VI = {
  "Case #{0}": "Hồ sơ #{0}",
  "Select at least one customer to delete.": "Chọn ít nhất một khách hàng để xoá.",
  "Could not load the customer's cases / folders.": "Không tải được case / folder của khách hàng.",
  " — {0} case: ": " — {0} case(s): ",
  "Cannot delete customer \"{0}\"": "Không thể xoá khách hàng \"{0}\"",
  "Cannot delete the {0} selected customers": "Không thể xoá {0} khách hàng đã chọn",
  "The customer still has cases. Move the cases to another customer or delete them first:": "Khách hàng đang có case. Chuyển các case sang khách hàng khác hoặc xoá case trước:",
  " — {0} folder(s), {1} document(s)": " — {0} folder, {1} tài liệu",
  " — {0} subfolder(s), {1} document(s)": " — {0} folder con, {1} tài liệu",
  "{0} document(s) not in any folder": "{0} tài liệu không nằm trong folder nào",
  "No folders or documents yet.": "Chưa có folder hay tài liệu nào.",
  "Delete customer \"{0}\"?": "Xoá khách hàng \"{0}\"?",
  "Delete {0} customers?": "Xoá {0} khách hàng?",
  "Delete customer": "Xoá khách hàng",
  "Delete {0} customers": "Xoá {0} khách hàng",
  "Cancel": "Huỷ",
  "Deleting also deletes the customer's folders and documents ({0} folder(s), {1} document(s)):": "Nếu xoá, các folder và tài liệu của khách hàng sẽ bị xoá theo ({0} folder, {1} tài liệu):",
  "Skipping {0} customer(s) that still have cases (cannot be deleted):": "Bỏ qua {0} khách hàng đang có case (không xoá được):",
  "Folders and documents go to the Trash and can be restored from there.": "Folder và tài liệu được chuyển vào Trash, có thể khôi phục từ đó.",
  "Customer \"{0}\" deleted.": "Đã xoá khách hàng \"{0}\".",
  "{0} customers deleted.": "Đã xoá {0} khách hàng.",
  "Could not delete the customer.": "Xoá khách hàng thất bại.",
};
// ---- end ui language ----
const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);

const React = ctx.React;
const h = React.createElement;

// ---- customer folder summary (pure; tested by scripts/tests/customer-delete-action.test.js) ----
// folders: one customer's own folders (not Case folders) plus every subfolder
// under them; documents: live documents in those folders. Returns the
// top-level folders with their subfolder / document counts, and the totals.
const summarizeCustomerFolders = (folders = [], documents = []) => {
  const idOf = (value) => (value && typeof value === "object" ? value.id : value);
  const key = (value) => (idOf(value) === null || idOf(value) === undefined ? "" : String(idOf(value)));
  const live = (folders || []).filter((folder) => folder && !folder.isDeleted);
  const ids = new Set(live.map((folder) => key(folder.id)));
  const childrenOf = new Map();
  live.forEach((folder) => {
    const parent = key(folder.parentId);
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent).push(folder);
  });
  const docsIn = new Map();
  (documents || []).forEach((doc) => {
    if (!doc || doc.isDeleted) return;
    const folder = key(doc.folderId);
    docsIn.set(folder, (docsIn.get(folder) || 0) + 1);
  });
  const subtree = (folder) => {
    let subfolders = 0;
    let docs = docsIn.get(key(folder.id)) || 0;
    (childrenOf.get(key(folder.id)) || []).forEach((child) => {
      const inner = subtree(child);
      subfolders += 1 + inner.subfolders;
      docs += inner.documents;
    });
    return { subfolders, documents: docs };
  };
  const roots = live
    .filter((folder) => !ids.has(key(folder.parentId)))
    .map((folder) => ({ id: key(folder.id), name: String(folder.name || "").trim() || "Folder", ...subtree(folder) }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  const totalDocuments = roots.reduce((sum, root) => sum + root.documents, 0);
  return { roots, totalFolders: live.length, totalDocuments };
};

// customers: [{ id, customerName }]; cases: [{ id, customerId, ... }] →
// { blocked: [{ customer, cases }], deletable: [customer] } in input order.
const partitionCustomersByCases = (customers = [], cases = []) => {
  const idOf = (value) => (value && typeof value === "object" ? value.id : value);
  const casesOf = new Map();
  (cases || []).forEach((item) => {
    const owner = String(idOf(item?.customerId));
    if (!casesOf.has(owner)) casesOf.set(owner, []);
    casesOf.get(owner).push(item);
  });
  const blocked = [];
  const deletable = [];
  (customers || []).forEach((customer) => {
    const own = casesOf.get(String(idOf(customer?.id))) || [];
    if (own.length) blocked.push({ customer, cases: own });
    else deletable.push(customer);
  });
  return { blocked, deletable };
};
// ---- end customer folder summary ----

const idOf = (value) => (value && typeof value === "object" ? value.id : value);
const errorText = (error, fallback) =>
  error?.response?.data?.errors?.[0]?.message || error?.message || fallback;
const listAll = async (resource, filter, fields) => {
  const res = await ctx.api.request({
    url: `${resource}:list`,
    params: { pageSize: 5000, filter: JSON.stringify(filter), ...(fields ? { fields } : {}) },
  });
  return res?.data?.data || [];
};
const nameOf = (customer) => String(customer?.customerName || "").trim() || `#${idOf(customer?.id)}`;
const caseLabel = (item) => [item.caseCode, item.projectName].filter(Boolean).join(" - ") || tr("Case #{0}", { 0: item.id });

// Row action → that row; table action → the selected rows.
const resource = ctx.resource;
const isRowAction = ctx.filterByTk !== undefined && ctx.filterByTk !== null;
const customers = isRowAction
  ? [{ ...(ctx.record || {}), id: ctx.filterByTk }]
  : (typeof resource?.getSelectedRows === "function" ? resource.getSelectedRows() : []).filter((row) => idOf(row?.id));

if (!customers.length) {
  ctx.message.warning(tr("Select at least one customer to delete."));
  return;
}

let partition = { blocked: [], deletable: [] };
const foldersByCustomer = new Map();
const documentsByCustomer = new Map();
const looseByCustomer = new Map();
try {
  const ids = customers.map((customer) => idOf(customer.id));
  const cases = await listAll("projects", { customerId: { $in: ids } }, ["id", "caseCode", "projectName", "customerId"]);
  partition = partitionCustomersByCases(customers, cases);
  const deletableIds = partition.deletable.map((customer) => idOf(customer.id));

  if (deletableIds.length) {
    // The customers' own folders (Case folders stay with their Case) ...
    const owner = new Map();
    let folders = (
      await listAll("folders", { customerId: { $in: deletableIds } }, ["id", "name", "parentId", "projectId", "taskId", "customerId", "isDeleted"])
    ).filter((folder) => !folder.projectId && !folder.taskId && !folder.isDeleted);
    folders.forEach((folder) => owner.set(String(folder.id), String(idOf(folder.customerId))));
    // ... and every subfolder under them, level by level (not Case folders);
    // a subfolder belongs to the customer of the folder it sits in.
    let frontier = folders.map((folder) => folder.id);
    while (frontier.length) {
      const children = (
        await listAll("folders", { parentId: { $in: frontier } }, ["id", "name", "parentId", "projectId", "isDeleted"])
      ).filter((folder) => !folder.projectId && !folder.isDeleted && !owner.has(String(folder.id)));
      children.forEach((folder) => owner.set(String(folder.id), owner.get(String(idOf(folder.parentId)))));
      folders = folders.concat(children);
      frontier = children.map((folder) => folder.id);
    }
    const folderDocuments = folders.length
      ? await listAll("documents", { folderId: { $in: folders.map((folder) => folder.id) } }, ["id", "folderId", "isDeleted"])
      : [];
    const looseDocuments = (
      await listAll("documents", { customerId: { $in: deletableIds } }, ["id", "folderId", "caseId", "customerId", "isDeleted"])
    ).filter((doc) => !doc.folderId && !doc.caseId && !doc.isDeleted);

    folders.forEach((folder) => {
      const customerKey = owner.get(String(folder.id));
      if (!foldersByCustomer.has(customerKey)) foldersByCustomer.set(customerKey, []);
      foldersByCustomer.get(customerKey).push(folder);
    });
    folderDocuments.forEach((doc) => {
      const customerKey = owner.get(String(idOf(doc.folderId)));
      if (!documentsByCustomer.has(customerKey)) documentsByCustomer.set(customerKey, []);
      documentsByCustomer.get(customerKey).push(doc);
    });
    looseDocuments.forEach((doc) => {
      const customerKey = String(idOf(doc.customerId));
      looseByCustomer.set(customerKey, (looseByCustomer.get(customerKey) || 0) + 1);
    });
  }
} catch (error) {
  ctx.message.error(errorText(error, tr("Could not load the customer's cases / folders.")));
  return;
}

const listStyle = { maxHeight: 220, overflowY: "auto", paddingLeft: 18, margin: "6px 0" };
const mutedStyle = { margin: 0, color: "rgba(0,0,0,0.45)", fontSize: 12.5 };
const blockedList = () =>
  h(
    "ul",
    { style: listStyle },
    partition.blocked.map(({ customer, cases }) =>
      h(
        "li",
        { key: String(idOf(customer.id)), style: { overflowWrap: "anywhere" } },
        h("b", null, nameOf(customer)),
        tr(" — {0} case: ", { 0: cases.length }),
        cases.map(caseLabel).join(", "),
      ),
    ),
  );

// Nothing can be deleted: only the warning.
if (!partition.deletable.length) {
  ctx.modal.warning({
    title:
      customers.length === 1
        ? tr("Cannot delete customer \"{0}\"", { 0: nameOf(customers[0]) })
        : tr("Cannot delete the {0} selected customers", { 0: customers.length }),
    width: 600,
    content: h(
      "div",
      null,
      h("p", { style: { margin: 0 } }, tr("The customer still has cases. Move the cases to another customer or delete them first:")),
      blockedList(),
    ),
  });
  return;
}

const plans = partition.deletable.map((customer) => {
  const customerKey = String(idOf(customer.id));
  const summary = summarizeCustomerFolders(foldersByCustomer.get(customerKey) || [], documentsByCustomer.get(customerKey) || []);
  const loose = looseByCustomer.get(customerKey) || 0;
  return { customer, summary, loose, documents: summary.totalDocuments + loose };
});
const totalFolders = plans.reduce((sum, plan) => sum + plan.summary.totalFolders, 0);
const totalDocuments = plans.reduce((sum, plan) => sum + plan.documents, 0);
const single = plans.length === 1 && !partition.blocked.length;

const customerSection = (plan) => {
  const hasContent = plan.summary.totalFolders > 0 || plan.loose > 0;
  return h(
    "div",
    { key: String(idOf(plan.customer.id)), style: { marginTop: single ? 0 : 8 } },
    !single &&
      h(
        "div",
        { style: { overflowWrap: "anywhere" } },
        h("b", null, nameOf(plan.customer)),
        tr(" — {0} folder(s), {1} document(s)", { 0: plan.summary.totalFolders, 1: plan.documents }),
      ),
    hasContent
      ? h(
          "ul",
          { style: { ...listStyle, maxHeight: single ? 240 : 140 } },
          plan.summary.roots.map((root) =>
            h(
              "li",
              { key: root.id, style: { overflowWrap: "anywhere" } },
              single ? h("b", null, root.name) : root.name,
              tr(" — {0} subfolder(s), {1} document(s)", { 0: root.subfolders, 1: root.documents }),
            ),
          ),
          plan.loose ? h("li", { key: "loose" }, tr("{0} document(s) not in any folder", { 0: plan.loose })) : null,
        )
      : h("p", { style: { ...mutedStyle, margin: "2px 0 0" } }, tr("No folders or documents yet.")),
  );
};

ctx.modal.confirm({
  title: single ? tr("Delete customer \"{0}\"?", { 0: nameOf(plans[0].customer) }) : tr("Delete {0} customers?", { 0: plans.length }),
  width: 640,
  okText: single ? tr("Delete customer") : tr("Delete {0} customers", { 0: plans.length }),
  okButtonProps: { danger: true },
  cancelText: tr("Cancel"),
  content: h(
    "div",
    null,
    totalFolders || totalDocuments
      ? h(
          "p",
          { style: { margin: 0 } },
          tr("Deleting also deletes the customer's folders and documents ({0} folder(s), {1} document(s)):", { 0: totalFolders, 1: totalDocuments }),
        )
      : null,
    h("div", { style: { maxHeight: 360, overflowY: "auto" } }, plans.map(customerSection)),
    partition.blocked.length
      ? h(
          "div",
          { style: { marginTop: 10 } },
          h("p", { style: { margin: 0, color: "#ad6800" } }, tr("Skipping {0} customer(s) that still have cases (cannot be deleted):", { 0: partition.blocked.length })),
          blockedList(),
        )
      : null,
    totalFolders || totalDocuments
      ? h("p", { style: { ...mutedStyle, marginTop: 8 } }, tr("Folders and documents go to the Trash and can be restored from there."))
      : null,
  ),
  onOk: async () => {
    const ids = plans.map((plan) => idOf(plan.customer.id));
    try {
      if (resource && typeof resource.destroy === "function") {
        // deletes and refreshes the table
        await resource.destroy(ids.length === 1 ? ids[0] : ids);
        if (!isRowAction && typeof resource.setSelectedRows === "function") resource.setSelectedRows([]);
      } else {
        await ctx.api.request({ url: "customers:destroy", method: "POST", params: { filterByTk: ids } });
      }
      ctx.message.success(single ? tr("Customer \"{0}\" deleted.", { 0: nameOf(plans[0].customer) }) : tr("{0} customers deleted.", { 0: ids.length }));
    } catch (error) {
      // e.g. the DB refusing a customer that got a Case in the meantime
      ctx.message.error(errorText(error, tr("Could not delete the customer.")));
    }
  },
});
