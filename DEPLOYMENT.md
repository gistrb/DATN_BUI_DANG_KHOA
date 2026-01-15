# Hướng dẫn Deploy lên Render.com

## Yêu cầu

- Tài khoản [Render.com](https://render.com)
- Repository GitHub đã push code

## Các bước Deploy

### 1. Push code lên GitHub

```bash
git add .
git commit -m "Configure for Render deployment"
git push origin master
```

### 2. Tạo Blueprint trên Render

1. Login vào [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Blueprint**
3. Chọn repository GitHub của bạn
4. Render sẽ tự động nhận diện file `render.yaml`
5. Click **Apply** để bắt đầu deploy

### 3. Cấu hình Environment Variables

Sau khi cả 2 services deploy xong:

**Backend (attendance-backend):**

- Vào **Environment** tab
- Set `CORS_ALLOWED_ORIGINS`: `https://attendance-frontend.onrender.com`
- Set `CSRF_TRUSTED_ORIGINS`: `https://attendance-frontend.onrender.com`
- Click **Save Changes** → Deploy lại

**Frontend (attendance-frontend):**

- Vào **Environment** tab
- Set `VITE_API_URL`: `https://attendance-backend.onrender.com`
- Click **Save Changes** → Deploy lại

### 4. Tạo Admin User

1. Vào **attendance-backend** → **Shell** tab
2. Chạy lệnh:

```bash
python manage.py createsuperuser
```

### 5. Kiểm tra

- Frontend: `https://attendance-frontend.onrender.com`
- Backend API: `https://attendance-backend.onrender.com/api/`
- Admin: `https://attendance-backend.onrender.com/admin/`

## Mobile App

Cập nhật file `mobile/.env`:

```
API_URL=https://attendance-backend.onrender.com
```

Build APK:

```bash
cd mobile
eas build --platform android --profile production
```

## Lưu ý

- **Free tier**: Database hết hạn sau 90 ngày
- **Cold start**: Backend sleep sau 15 phút không hoạt động, request đầu tiên sẽ chậm (~30s)
- **Build time**: Backend có thể mất 5-10 phút do ML models
