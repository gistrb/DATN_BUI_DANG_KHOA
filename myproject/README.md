# Hệ Thống Điểm Danh Nhận Diện Khuôn Mặt

Dự án tốt nghiệp: Hệ thống điểm danh tự động sử dụng nhận diện khuôn mặt với ArcFace.

## Công Nghệ
- **Backend**: Django (Python), Django REST Framework
- **Web Frontend**: React (Vite)
- **Mobile App**: React Native (Expo)
- **Database**: PostgreSQL
- **AI/CV**: InsightFace (ArcFace model)

## Cài Đặt & Chạy Dự Án

### 1. Backend (Django)
Yêu cầu: Python 3.8+, PostgreSQL

```bash
# Di chuyển vào thư mục backend
cd myproject

# Tạo môi trường ảo (khuyên dùng)
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Cài đặt thư viện
pip install -r requirements.txt

# Cấu hình Database trong settings.py (nếu cần)

# Chạy migration
python manage.py migrate

# Tạo superuser
python manage.py createsuperuser

# Chạy server (QUAN TRỌNG: Dùng 0.0.0.0 để mobile app kết nối được)
python manage.py runserver 0.0.0.0:8000
```

**Lưu ý**: Sử dụng `0.0.0.0:8000` thay vì `127.0.0.1:8000` để cho phép mobile app kết nối từ mạng local.

### 2. Web Frontend (React + Vite)
Yêu cầu: Node.js 16+

```bash
# Di chuyển vào thư mục web frontend
cd web_frontend

# Cài đặt thư viện
npm install

# Chạy development server
npm run dev
```

Web frontend sẽ chạy tại: `http://localhost:5173`

### 3. Mobile App (Expo)
Yêu cầu: Node.js, Expo Go trên điện thoại

```bash
# Di chuyển vào thư mục mobile app
cd mobile_app

# Cài đặt thư viện
npm install

# Chạy ứng dụng
npx expo start
```

#### Cấu hình kết nối Mobile App

1. **Kiểm tra IP máy tính**:
   ```bash
   # Windows:
   ipconfig
   # Mac/Linux:
   ifconfig
   ```
   Tìm địa chỉ IPv4 (ví dụ: `192.168.0.104`)

2. **Cập nhật IP trong App.js**:
   Mở `mobile_app/App.js` và sửa dòng 7:
   ```javascript
   const API_URL = 'http://192.168.0.104:8000/api';
   ```
   Thay `192.168.0.104` bằng IP máy tính của bạn.

3. **Quét QR code** bằng Expo Go để chạy app trên điện thoại

## Tính Năng

### Web Frontend
- Dashboard quản trị với thống kê
- Quản lý nhân viên
- Đăng ký khuôn mặt cho nhân viên
- Xem lịch sử chấm công
- Chấm công bằng khuôn mặt qua webcam

### Mobile App
- Đăng nhập nhân viên
- Xem thống kê chuyên cần cá nhân
- Xem lịch sử điểm danh
- Hiển thị đúng múi giờ Việt Nam (GMT+7)

### Backend API
- Authentication API
- Employee statistics API
- Attendance history API
- Face recognition với ArcFace
- Timezone handling (UTC → Vietnam timezone)

## Cấu Hình Quan Trọng

### Django Settings
- `ALLOWED_HOSTS = ['*']` - Cho phép truy cập từ mọi host (development)
- `CORS_ALLOW_ALL_ORIGINS = True` - Cho phép CORS từ mọi origin (development)
- `TIME_ZONE = "Asia/Ho_Chi_Minh"` - Múi giờ Việt Nam
- `USE_TZ = True` - Lưu UTC trong database, convert khi hiển thị

### Database
PostgreSQL với cấu hình:
- Database: `datn`
- User: `postgres`
- Password: `123456`
- Host: `localhost`
- Port: `5432`

## Troubleshooting

### Mobile App không kết nối được Backend
1. Kiểm tra Django server đang chạy với `0.0.0.0:8000`
2. Kiểm tra IP trong `App.js` khớp với IP máy tính
3. Đảm bảo điện thoại và máy tính cùng mạng WiFi

### Thời gian hiển thị sai
- Backend tự động convert UTC → Vietnam timezone
- Đảm bảo `USE_TZ = True` trong settings.py

