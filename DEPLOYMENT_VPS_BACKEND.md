# Deploy Backend lên VPS với Domain và HTTPS

## Thông tin

- **Domain**: `attendanccee.duckdns.org`
- **VPS IP**: `103.82.38.158`
- **Frontend (Render)**: `https://attendance-frontend-p2xl.onrender.com`

---

## Bước 1: SSH vào VPS

```bash
ssh root@103.82.38.158
cd ~/DATN_BUI_DANG_KHOA
```

## Bước 2: Cài đặt Certbot và tạo SSL Certificate

```bash
# Cài Certbot
apt update
apt install -y certbot

# Tạo SSL certificate cho domain
certbot certonly --standalone -d attendanccee.duckdns.org --email your-email@example.com --agree-tos --non-interactive

# Tạo thư mục cho Certbot renewal
mkdir -p /var/www/certbot
```

## Bước 3: Pull code mới nhất

```bash
git pull origin main
```

## Bước 4: Tạo file .env

```bash
nano .env
```

Nội dung:

```env
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=attendanccee.duckdns.org,103.82.38.158,localhost

DATABASE_URL=postgresql://datn_00hm_user:fawhMBQprhU6vCRvYZA7xklunRtCm2cd@dpg-d5l6c7je5dus73coqb00-a.oregon-postgres.render.com/datn_00hm

CORS_ALLOWED_ORIGINS=https://attendance-frontend-p2xl.onrender.com
CSRF_TRUSTED_ORIGINS=https://attendance-frontend-p2xl.onrender.com,https://attendanccee.duckdns.org

SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

FIREBASE_SERVICE_ACCOUNT=config/datastoragedemo-99ff9-3abc57b4ec78.json
```

## Bước 5: Build và chạy

```bash
docker compose -f docker-compose.vps.yml up -d --build
```

## Bước 6: Kiểm tra

```bash
# Xem logs
docker compose -f docker-compose.vps.yml logs -f

# Test HTTPS
curl https://attendanccee.duckdns.org/health
```

---

## Cập nhật Frontend trên Render

Sau khi backend hoạt động, cập nhật biến môi trường trên Render:

```
VITE_API_URL=https://attendanccee.duckdns.org
```

---

## Các lệnh hữu ích

```bash
# Restart
docker compose -f docker-compose.vps.yml restart

# Xem logs
docker compose -f docker-compose.vps.yml logs -f

# Dừng
docker compose -f docker-compose.vps.yml down

# Cập nhật code
git pull origin main
docker compose -f docker-compose.vps.yml up -d --build

# Renew SSL certificate (chạy mỗi 90 ngày hoặc setup cron)
certbot renew
docker compose -f docker-compose.vps.yml restart nginx
```
