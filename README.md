# Flashcards - Học từ vựng (Chrome Extension)

Tiện ích mở rộng trình duyệt (Manifest V3) giúp tạo, lưu trữ, thu thập từ vựng trực tiếp trên web và ôn tập bằng nhiều phương thức ngẫu nhiên theo phong cách giao diện **Neobrutalism** đa sắc hài hòa.

---

## Tính năng chính

- **Quản lý bộ thẻ từ vựng:** Tạo mới, đổi tên, xóa bộ thẻ (xóa toàn bộ từ bên trong kèm hộp thoại xác nhận).
- **Quản lý từ & Loại từ:**
  - Thêm, sửa, tìm kiếm từ vựng theo từ, nghĩa hoặc loại từ.
  - Hỗ trợ phân loại từ có màu nhãn riêng: `n` (Danh từ), `v` (Động từ), `adj` (Tính từ), `adv` (Trạng từ), `prep` (Giới từ), `conj` (Liên từ), `pron` (Đại từ), `interj` (Thán từ), `phrase` (Cụm từ).
  - Hỗ trợ tick chọn 1 hoặc nhiều từ (**Chọn tất cả / Bỏ chọn**) để xóa hàng loạt.
- **Chế độ Học ngay thông minh:**
  - Tự động xáo trộn thẻ và random phương thức cho từng từ: **Lật thẻ 3D**, **Gõ từ**, **Trắc nghiệm 4 đáp án**.
  - **Audio phát âm (Web Speech API):** Tự động đọc từ 1 lần khi chuyển sang thẻ mới, hỗ trợ bấm nút **Nghe** hoặc phím `S` để nghe lại (tự nhận diện tiếng Anh / tiếng Việt).
  - **Hiệu ứng pháo hoa:** Bắn pháo hoa chúc mừng khi gõ hoặc chọn đúng đáp án.
  - **Phím tắt:** `←` / `→` chuyển thẻ, `Space` lật thẻ, `1`–`4` chọn đáp án trắc nghiệm, `Enter` kiểm tra/chuyển thẻ khi gõ từ, `S` phát âm, `Esc` thoát.
- **Bôi từ nhanh trên trình duyệt (`BẬT` / `TẮT`):**
  - Bôi đen từ/cụm từ trên mọi trang web để hiện nút **`F + Thêm thẻ`** ngay cạnh vùng chọn và lưu thẳng vào bộ thẻ tùy chọn.
  - Hỗ trợ vượt chặn chọn chữ / copy (`user-select`, `selectstart`, `copy`) khi chế độ đang **BẬT**.
- **Xuất & Nhập dữ liệu:**
  - **Xuất bộ thẻ đang chọn** sang **JSON**, **Excel (`.xlsx`)** (qua `xlsx.mini.min.js`), hoặc **PDF** (trang xem trước in hỗ trợ đầy đủ tiếng Việt).
  - **Nhập dữ liệu** từ **JSON** hoặc **Excel / CSV** (`.xlsx`, `.xls`, `.csv`).
- **Tự động đồng bộ ngầm:** Dữ liệu lưu cục bộ qua `chrome.storage.local` và tự động đồng bộ ẩn danh với API backend trên Render + MongoDB.

---

## Cấu trúc thư mục

```text
flashcards_extension_google/
├── manifest.json          # Cấu hình Chrome Extension Manifest V3
├── popup.html             # Giao diện chính của extension popup
├── print.html             # Trang xem trước & xuất PDF
├── css/
│   └── style.css          # Style Neobrutalism đa sắc, hiệu ứng & modal
├── icons/                 # Bộ icon 16, 32, 48, 128px
├── js/
│   ├── app.js             # Logic giao diện, học thẻ, audio, pháo hoa, xuất/nhập
│   ├── background.js      # Service worker đồng bộ ngầm & nạp content script
│   ├── content.js         # Bắt vùng bôi đen trên web & khung thêm thẻ nhanh
│   ├── print.js           # Render bảng từ vựng để in / lưu PDF
│   ├── storage.js         # Quản lý chrome.storage.local & đồng bộ API
│   └── vendor/
│       └── xlsx.mini.min.js
└── server/                # Backend Node.js + Express + MongoDB
    ├── package.json
    └── server.js
```

---

## Cài đặt Extension lên trình duyệt

1. Tải hoặc clone repository về máy.
2. Mở Chrome / Edge / Cốc Cốc và truy cập `chrome://extensions/` (hoặc `edge://extensions/`).
3. Bật **Developer mode** (Chế độ dành cho nhà phát triển) ở góc trên bên phải.
4. Chọn **Load unpacked** (Tải tiện ích đã giải nén) và trỏ vào thư mục gốc `flashcards_extension_google`.
5. Ghim biểu tượng **Flashcards - Học từ vựng** lên thanh công cụ để sử dụng.

---

## Backend API (`server/`)

API mặc định trong extension đã trỏ tới:

- **Base URL:** `https://flashcards-extension-google.onrender.com`
- **Health Check:** `GET /api/health`
- **Endpoints đồng bộ:** `GET / PUT / DELETE /api/sets/:userId`

### Chạy backend cục bộ (tùy chọn)

```bash
cd server
npm install
```

Tạo file `server/.env`:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>
MONGODB_DB=flashcards
```

Khởi chạy server:

```bash
npm start
```
