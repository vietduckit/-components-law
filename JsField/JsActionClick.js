const viewAddQuotation = "v44ehxkcghx"
const viewAddContract = "41125dcba6c"
const viewAddCase = "lqj7vemag75"
const viewUid = `${ctx.model.uid}-custom-view`;

await ctx.openView(viewAddQuotation, {
  mode: 'dialog',
  size: 'large',
  title: 'Popup',
  navigation: false,
});