# Nocobase — Field Types & Collection Types
Source: https://docs.nocobase.com/data-sources

## Collection Types

| Type | Mô tả |
|---|---|
| General collection | Collection thông thường (bảng DB chuẩn) |
| Calendar collection | Có trường date/time đặc biệt cho calendar view |
| Tree collection | Cấu trúc cây (parent/children, path) |
| File collection | Quản lý file/attachment |
| SQL collection | Dựa trên SQL query (read-only view) |
| View collection | Database view |
| Expression collection | Computed/formula-based |
| Comment collection | Cho comment threads |

## Field Types

### Basic
| Field | Type key | Ghi chú |
|---|---|---|
| Single line text | `string` | |
| Long text | `text` | |
| Phone | `phone` | |
| Email | `email` | |
| URL | `url` | |
| Integer | `integer` | |
| Number | `float` / `double` | |
| Percent | `percent` | |
| Password | `password` | Encrypted |
| Color | `color` | Hex color picker |
| Icon | `icon` | |

### Choices
| Field | Type key | Ghi chú |
|---|---|---|
| Checkbox | `boolean` | true/false |
| Select | `select` | Single choice |
| Multiple select | `multipleSelect` | Array of values |
| Radio group | `radioGroup` | |
| Checkbox group | `checkboxGroup` | |

### Media / Rich Content
| Field | Type key | Ghi chú |
|---|---|---|
| Markdown | `markdown` | |
| Rich text | `richText` | HTML |
| Attachment | `attachments` | File upload |
| Signature | `signature` | |

### Date & Time
| Field | Type key | Ghi chú |
|---|---|---|
| Date (with timezone) | `date` | Stored as UTC |
| Date (without timezone) | `dateOnly` | YYYY-MM-DD |
| Time | `time` | HH:mm:ss |
| Unix timestamp | `unixTimestamp` | Seconds |
| Created at | `createdAt` | Auto |
| Updated at | `updatedAt` | Auto |

### Advanced
| Field | Type key | Ghi chú |
|---|---|---|
| UUID | `uuid` | Auto-generated |
| Nano ID | `nanoid` | Short unique ID |
| Formula | `formula` | Expression-based computed |
| Sequence | `sequence` | Auto-increment with prefix |
| JSON | `json` | Arbitrary JSON object |
| Encryption | `encryption` | Encrypted storage |
| Geometry: Point | `point` | |
| Geometry: Line | `lineString` | |
| Geometry: Circle | `circle` | |
| Geometry: Polygon | `polygon` | |

### System (Auto)
| Field | Ghi chú |
|---|---|
| `id` | Primary key, auto |
| `createdAt` | Timestamp auto |
| `updatedAt` | Timestamp auto |
| `createdBy` | User relation auto |
| `updatedBy` | User relation auto |

### Association (Relation) Fields
| Type | Key | Mô tả |
|---|---|---|
| Has One | `hasOne` | 1-1, foreign key ở bảng kia |
| Has Many | `hasMany` | 1-N, foreign key ở bảng kia |
| Belongs To | `belongsTo` | N-1, foreign key ở bảng này |
| Many To Many | `belongsToMany` | N-N, qua junction table |

**Appends trong query:** Dùng `appends: ["relationName", "rel.nestedRel"]` để load relation data.

## Data Source Types

| Source | Mô tả |
|---|---|
| Main Database | PostgreSQL / MySQL / MariaDB (built-in) |
| External PostgreSQL | Kết nối DB ngoài |
| External MySQL / MariaDB | |
| External MSSQL | Microsoft SQL Server |
| External Oracle | |
| KingbaseES | DB nội địa Trung Quốc (dual-use) |
| REST API | API ngoài làm data source |
| Database View | SQL view trong DB |
| FDW | Foreign Data Wrapper |
