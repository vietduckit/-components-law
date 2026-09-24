// ============================================================
// UploadSharedLib.js — JS Block TẠM DÙNG 1 LẦN
// Dán vào 1 page bất kỳ (drawer/tab riêng), dùng xong có thể xoá block.
// Mục đích: upload shared-lib/law-shared.js (hoặc bất kỳ file .js tĩnh
// nào khác) lên Nocobase qua API attachments:create — đúng cơ chế
// CaseDocument.js::uploadAttachment() đang dùng — rồi trả về URL đầy đủ
// để dán vào SHARED_LIB_URL trong các JS Block khác.
// ============================================================
const { React, antd } = ctx;
const { useState } = React;
const { Upload, Button, Input, message, Typography, Space, Alert } = antd;
const { Text } = Typography;
const { Dragger } = Upload;

const getFullUrl = (url) =>
  !url
    ? null
    : String(url).startsWith("http")
      ? url
      : `${window.location.origin}${url}`;

function UploadSharedLib() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null); // { fullUrl, attachment }
  const [error, setError] = useState(null);

  const doUpload = async (file) => {
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new window.FormData();
      formData.append("file", file, file.name);
      const uploadRes = await ctx.api.request({
        url: "attachments:create",
        method: "POST",
        // Tái dùng field "documents.fileAttachment" chỉ để áp rule lưu trữ
        // (size/mime) đã cấu hình sẵn — không tạo record documents nào cả.
        params: { attachmentField: "documents.fileAttachment" },
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });
      const attachment = uploadRes?.data?.data;
      if (!attachment?.id) throw new Error("Upload thất bại — không có attachment id trong response");
      const fullUrl = getFullUrl(attachment.url || attachment.preview);
      setResult({ fullUrl, attachment });
      ctx.message.success("Upload thành công");
    } catch (e) {
      setError(e?.message || String(e));
      ctx.message.error("Upload thất bại");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Block tạm dùng 1 lần"
        description="Upload xong, copy URL bên dưới dán vào SHARED_LIB_URL của các JS Block khác. Có thể xoá block này sau khi dùng xong."
      />
      <Dragger
        multiple={false}
        showUploadList={false}
        disabled={uploading}
        beforeUpload={(file) => {
          doUpload(file);
          return false; // chặn auto-upload mặc định của antd, tự xử lý ở trên
        }}
      >
        <p>{uploading ? "Đang upload..." : "Kéo thả hoặc bấm để chọn file (vd: law-shared.js)"}</p>
      </Dragger>

      {error && (
        <Alert type="error" showIcon style={{ marginTop: 16 }} message="Lỗi" description={error} />
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          <Text strong>URL đầy đủ (dán vào SHARED_LIB_URL):</Text>
          <Space.Compact style={{ width: "100%", marginTop: 8 }}>
            <Input value={result.fullUrl} readOnly />
            <Button
              type="primary"
              onClick={() => {
                navigator.clipboard.writeText(result.fullUrl);
                ctx.message.success("Đã copy URL");
              }}
            >
              Copy
            </Button>
          </Space.Compact>
          <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
            attachment id: {result.attachment.id} · filename: {result.attachment.filename || result.attachment.title}
          </Text>
        </div>
      )}
    </div>
  );
}

ctx.render(<UploadSharedLib />);
