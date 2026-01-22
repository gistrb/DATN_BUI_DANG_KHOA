# Deploy Backend lên VPS (Database & Frontend trên Render)

## Yêu cầu

- VPS có Docker đã cài đặt
- IP VPS: `
- Frontend Render: `https://attendance-frontend-p2xl.onrender.com`

---

## Bước 1: SSH vào VPS và Clone code

cd ~
git clone https://github.com/gistrb/DATN_BUI_DANG_KHOA.git
cd DATN_BUI_DANG_KHOA

````

## Bước 2: Tạo file .env

```bash
cp .env.vps .env
````

Hoặc tạo thủ công với `nano .env`:

```env
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=103.82.38.158,localhost

DATABASE_URL=postgresql://datn_00hm_user:fawhMBQprhU6vCRvYZA7xklunRtCm2cd@dpg-d5l6c7je5dus73coqb00-a.oregon-postgres.render.com/datn_00hm

CORS_ALLOWED_ORIGINS=https://attendance-frontend-p2xl.onrender.com
CSRF_TRUSTED_ORIGINS=https://attendance-frontend-p2xl.onrender.com,http://103.82.38.158

FIREBASE_SERVICE_ACCOUNT=config/datastoragedemo-99ff9-3abc57b4ec78.json
```

## Bước 3: Build và chạy Backend

```bash
docker compose -f docker-compose.vps.yml up -d --build
```

## Bước 4: Kiểm tra

```bash
# Xem logs
docker compose -f docker-compose.vps.yml logs -f

# Kiểm tra container
docker ps
```

## Bước 5: Cập nhật Frontend để gọi VPS Backend

Trên Render Frontend, cập nhật biến môi trường:

## Các lệnh hữu ích

```bash
# Restart backend
docker compose -f docker-compose.vps.yml restart

# Xem logs
docker compose -f docker-compose.vps.yml logs -f backend

# Dừng backend
docker compose -f docker-compose.vps.yml down

# Cập nhật code mới
git pull origin main
docker compose -f docker-compose.vps.yml up -d --build
```
