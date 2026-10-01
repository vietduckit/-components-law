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
  "Form context not found. Place this JS Action in the toolbar of a Form/Edit Form.": "Không tìm thấy form context. Hãy đặt JS Action trong toolbar của Form/Edit Form.",
  "The form's SingleRecordResource was not found.": "Không tìm thấy SingleRecordResource của form.",
  "Saved": "Đã lưu thành công",
  "Please check the required fields.": "Vui lòng kiểm tra lại các trường bắt buộc.",
  "Save failed.": "Lưu thất bại.",
};
// ---- end ui language ----
const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);

if (!ctx.form) {
  ctx.message.error(tr("Form context not found. Place this JS Action in the toolbar of a Form/Edit Form."));
  return;
}

const lockKey = '__submitWithoutRefresh';
if (ctx.model?.[lockKey]) return;
if (ctx.model) ctx.model[lockKey] = true;

try {
  await ctx.form.validateFields();

  const values = ctx.form.getFieldsValue(true);
  const resource = ctx.blockModel?.resource || ctx.resource;

  if (!resource?.save) {
    ctx.message.error(tr("The form's SingleRecordResource was not found."));
    return;
  }

  await resource.save(values, { refresh: false });

  ctx.message.success(tr("Saved"));
} catch (error) {
  if (error?.errorFields) {
    ctx.message.error(tr("Please check the required fields."));
    return;
  }

  console.error(error);
  ctx.message.error(error?.message || tr("Save failed."));
} finally {
  if (ctx.model) ctx.model[lockKey] = false;
}