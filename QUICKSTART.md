# Quick Start - Chạy BloomArt trong 5 phút

## 1. Clone & cài đặt
```bash
git clone <repo-url> flower-shop
cd flower-shop
npm install
cd frontend && npm install && cd ..
```

## 2. Tạo database D1 (Cloudflare)
```bash
wrangler login
wrangler d1 create flower-db
# Copy database_id từ output
```

## 3. Cấu hình `wrangler.toml`
```toml
# Thay YOUR_DB_ID bằng ID vừa copy
[[d1_databases]]
binding = "DB"
database_name = "flower-db"
database_id = "YOUR_DB_ID"

[ai]
binding = "AI"
```

## 4. Chạy migration & seed data
```bash
wrangler d1 execute flower-db --file=schema.sql --remote
wrangler d1 execute flower-db --file=seed.sql --remote
```

## 5. Set mật khẩu Admin
```bash
wrangler secret put ADMIN_PASSWORD
# Nhập mật khẩu mạnh (vd: BloomArt@2026!)
```

## 6. Chạy dev local
```bash
# Terminal 1: Backend
wrangler dev --local

# Terminal 2: Frontend
cd frontend && npm run dev
# Mở http://localhost:5173
```

## 7. Deploy Production
```bash
# Backend
wrangler deploy
# Copy URL Workers (vd: https://flower-shop-backend.xxx.workers.dev)

# Frontend: cập nhật API_URL trong frontend/src/App.jsx
# Sau đó build & deploy Cloudflare Pages
cd frontend && npm run build
# Upload thư mục dist/ lên Cloudflare Pages
```

---

## 🔑 Tài khoản test
- **Admin**: dùng mật khẩu vừa set ở bước 5
- **Khách**: đặt hàng bình thường, tra cứu bằng SĐT

## 📱 Các tính năng chính
| Tính năng | URL/Trang |
|-----------|-----------|
| Trang chủ + AI Chat | `/` (FAB góc phải dưới) |
| Tra cứu đơn | Header → "Tra cứu đơn" |
| Admin Dashboard | Header → "Admin" → nhập pass |
| API Docs | Xem `DOCUMENTATION.md` |

## ⚠️ Lưu ý thường gặp
- **AI không trả lời**: Kiểm tra binding `AI` trong wrangler.toml, Workers AI phải bật trên account
- **CORS error**: Backend đã set `Access-Control-Allow-Origin: *`
- **DB lỗi**: Chạy `wrangler d1 execute flower-db --file=schema.sql --remote` lại
- **Token hết hạn**: Token admin có hiệu lực 12h, đăng nhập lại

---

*Xem chi tiết architecture, code structure, system prompt AI tại `DOCUMENTATION.md`*