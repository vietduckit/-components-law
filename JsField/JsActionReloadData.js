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
  "Data reloaded": "Đã tải lại dữ liệu thành công",
  "Could not reload data: ": "Không thể tải lại dữ liệu: ",
};
// ---- end ui language ----
const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);

const blockModel = ctx.blockModel || ctx.model;
const resource = blockModel?.resource || ctx.resource;

try {
  // 1. Trigger native NocoBase block/table refresh (fetches latest records)
  if (resource && typeof resource.refresh === 'function') {
    await resource.refresh();
  } else if (blockModel && typeof blockModel.refresh === 'function') {
    await blockModel.refresh();
  }

  // 2. Trigger all registered custom components (filters, progress columns, etc.) on the page
  const engine = ctx.engine || ctx.app;
  const reloaders = engine?.__nocobaseReloaders;
  if (reloaders && reloaders.size > 0) {
    reloaders.forEach(reloadFn => {
      try {
        reloadFn();
      } catch (e) {
        console.warn('Lỗi khi gọi reloader:', e);
      }
    });
  }

  ctx.message.success(tr("Data reloaded"));
} catch (error) {
  console.error('Lỗi tải lại dữ liệu:', error);
  ctx.message.error(tr("Could not reload data: ") + (error?.message || ''));
}
