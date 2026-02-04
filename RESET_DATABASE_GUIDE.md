# Hướng dẫn Reset Database và Tạo lại Admin trên Render.com

## Tùy chọn 1: Reset Database trên Render Dashboard (Khuyến nghị)

### Bước 1: Xóa database cũ

1. Đăng nhập vào [Render Dashboard](https://dashboard.render.com/)
2. Chọn database **attendance-db**
3. Click tab **Settings**
4. Scroll xuống dưới cùng, click **Delete Database**
5. Xác nhận xóa

### Bước 2: Tạo database mới

1. Click **New** → **PostgreSQL**
2. Đặt tên: `attendance-db`
3. Database name: `datn`
4. Chọn **Free plan**
5. Click **Create Database**

### Bước 3: Cập nhật connection string

1. Sau khi database mới được tạo, copy **Internal Database URL**
2. Vào **attendance-backend** service
3. Click **Environment** tab
4. Cập nhật `DATABASE_URL` với URL mới (hoặc để Render tự động link nếu dùng Blueprint)

### Bước 4: Set environment variables cho superuser

Trong **attendance-backend** → **Environment**, thêm các biến:

```
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_PASSWORD=your-secure-password
DJANGO_SUPERUSER_EMAIL=admin@example.com
```

> ⚠️ **Quan trọng**: Thay `your-secure-password` bằng mật khẩu mạnh của bạn!

### Bước 5: Trigger deploy lại

1. Vào **attendance-backend** service
2. Click **Manual Deploy** → **Deploy latest commit**
3. Hoặc push commit mới lên GitHub để trigger auto-deploy

Build script sẽ tự động:

- ✅ Chạy migrations
- ✅ Tạo superuser với thông tin từ environment variables

---

## Tùy chọn 2: Reset qua Shell (Nâng cao)

### Bước 1: Truy cập Shell

1. Vào **attendance-backend** service
2. Click tab **Shell**
3. Kết nối vào container

### Bước 2: Xóa toàn bộ data

```bash
python manage.py flush --no-input
```

Lệnh này sẽ xóa toàn bộ data nhưng giữ nguyên database schema.

### Bước 3: Tạo superuser

```bash
python manage.py createsuperuser
# Nhập username, email, password khi được hỏi
```

---

## Tùy chọn 3: Auto-reset khi deploy (Cẩn thận!)

### Cập nhật build.sh

Thêm lệnh flush vào đầu `backend/build.sh`:

```bash
#!/usr/bin/env bash
set -o errexit

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Collecting static files..."
python manage.py collectstatic --no-input

# ⚠️ RESET DATABASE - XÓA TẤT CẢ DATA
if [ "$RESET_DATABASE" = "true" ]; then
    echo "⚠️ RESETTING DATABASE..."
    python manage.py flush --no-input
fi

echo "Running migrations..."
python manage.py migrate

# Create superuser if environment variables are set
if [ -n "$DJANGO_SUPERUSER_USERNAME" ]; then
    echo "Creating superuser..."
    python manage.py createsuperuser --noinput || echo "Superuser already exists"
fi

echo "Build complete!"
```

Thêm environment variable:

```
RESET_DATABASE=true  # Chỉ set khi muốn reset, sau đó XÓA biến này!
```

> ⚠️ **CẢNH BÁO**: Cách này sẽ xóa toàn bộ data mỗi khi deploy! Chỉ dùng cho development/testing.

---

## Khuyến nghị

- **Production**: Dùng **Tùy chọn 1** (xóa và tạo database mới)
- **Development**: Dùng **Tùy chọn 2** (flush via shell)
- **Không khuyến nghị**: Tùy chọn 3 (auto-reset khi deploy)

---

## Kiểm tra sau khi reset

1. Vào frontend: `https://attendance-frontend-p2xl.onrender.com/login`
2. Đăng nhập với:
   - Username: `admin` (hoặc giá trị của `DJANGO_SUPERUSER_USERNAME`)
   - Password: Mật khẩu đã set trong `DJANGO_SUPERUSER_PASSWORD`
3. Tạo nhân viên mới
4. Đăng ký face mới

---

## Troubleshooting

### Lỗi "Superuser already exists"

Nếu build.sh báo lỗi này, có thể do:

- Database chưa thực sự được reset
- Cần chạy `python manage.py flush` trước

### Environment variables không hoạt động

Kiểm tra:

1. Đã save environment variables chưa?
2. Đã restart/redeploy service chưa?
3. Check logs để xem biến có được load không:
   ```bash
   echo $DJANGO_SUPERUSER_USERNAME
   ```
