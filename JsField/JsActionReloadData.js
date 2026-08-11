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

  ctx.message.success('Đã tải lại dữ liệu thành công');
} catch (error) {
  console.error('Lỗi tải lại dữ liệu:', error);
  ctx.message.error('Không thể tải lại dữ liệu: ' + (error?.message || ''));
}
