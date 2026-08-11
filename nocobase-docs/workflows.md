# Nocobase Workflows
Source: https://docs.nocobase.com/tutorials/v2/06-workflows

## Khái niệm cốt lõi

Workflow = **Trigger** → (Condition) → **Nodes**

Hai chế độ:
- **Synchronous**: Chạy ngay, chặn action (dùng cho pre-action, validation)
- **Asynchronous**: Chạy nền, không chặn UI

## Trigger Types

| Trigger | Khi nào kích hoạt |
|---|---|
| Collection event | Khi record được tạo / cập nhật / xóa |
| Schedule | Cron hoặc thời điểm cố định |
| Post-action event | Sau khi UI action hoàn thành |
| Pre-action event | Trước khi action thực thi (có thể chặn) |
| Custom action | Gắn vào button tùy chỉnh |
| Approval | Workflow phê duyệt nhiều cấp |
| AI Employee | Expose workflow như tool cho AI agent |

## Node Types

### Flow Control
| Node | Mô tả |
|---|---|
| Condition | Rẽ nhánh if/else |
| Parallel branches | Chạy nhiều nhánh đồng thời |
| Loop | Lặp qua array records |
| Delay | Chờ N giây/phút/giờ |

### Data Operations
| Node | Mô tả |
|---|---|
| Create record | Tạo record mới |
| Update record | Cập nhật record |
| Query record | Truy vấn dữ liệu |
| Delete record | Xóa record |
| Calculate | Tính toán expression |

### External / Notification
| Node | Mô tả |
|---|---|
| HTTP request | Gọi API ngoài |
| Notification | Gửi thông báo in-app / email |

## Variables trong Workflow

Workflow có hệ thống variables để truyền data giữa các nodes:
- Trigger data (record vừa tạo/sửa)
- Node output (kết quả query, calculation)
- System variables (current user, timestamp)

Trong JS block, lấy variable qua: `ctx.getVar('variableName')`

## Liên kết Workflow với JS Block

```javascript
// Trigger custom action workflow từ JS block
await ctx.api.request({
  url: "workflows:trigger",
  method: "POST",
  data: {
    workflowKey: "workflow-key-here",
    data: { fieldA: value, fieldB: value }
  }
});
```

## Workflow Event Flow (UI Refresh)

Sau khi workflow chạy xong, cấu hình "Event flow" trong workflow settings để:
- Reload block dữ liệu liên quan
- Đóng popup form
- Hiện thông báo thành công

Hoặc xử lý thủ công trong JS block:
```javascript
// Trigger workflow rồi reload block
await ctx.api.request({ url: "workflows:trigger", method: "POST", data: {...} });
const model = ctx.engine.getModel(blockUid);
model.resource.refresh();
```

## Tips

- Test workflow bằng nút "Manual execute" trước khi enable
- Xem lịch sử thực thi trong tab "Execution history"
- Approval workflow có thể cấu hình nhiều cấp phê duyệt song song hoặc tuần tự
- Pre-action trigger có thể `throw error` để hủy action gốc
