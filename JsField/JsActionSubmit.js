if (!ctx.form) {
  ctx.message.error('Không tìm thấy form context. Hãy đặt JS Action trong toolbar của Form/Edit Form.');
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
    ctx.message.error('Không tìm thấy SingleRecordResource của form.');
    return;
  }

  await resource.save(values, { refresh: false });

  ctx.message.success('Đã lưu thành công');
} catch (error) {
  if (error?.errorFields) {
    ctx.message.error('Vui lòng kiểm tra lại các trường bắt buộc.');
    return;
  }

  console.error(error);
  ctx.message.error(error?.message || 'Lưu thất bại.');
} finally {
  if (ctx.model) ctx.model[lockKey] = false;
}