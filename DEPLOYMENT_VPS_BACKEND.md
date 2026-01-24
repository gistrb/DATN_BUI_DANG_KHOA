# Deploy Backend lên VPS với Domain và HTTPS

## Thông tin

- **Domain**: `datnbdk.duckdns.org`
- **VPS IP**: `103.82.38.158`
- **Frontend (Render)**: `https://attendance-frontend-p2xl.onrender.com`

---

## Bước 1: SSH vào VPS

```bash
ssh root@103.82.38.158
```

## Bước 2: Clone code (lần đầu) hoặc Pull code mới nhất

### Lần đầu tiên:

```bash
cd ~
git clone https://github.com/your-username/DATN_BUI_DANG_KHOA.git
cd DATN_BUI_DANG_KHOA
```

### Hoặc nếu đã có code:

```bash
cd ~/DATN_BUI_DANG_KHOA
git pull origin main
```

## Bước 3: Cài đặt Docker (nếu chưa có)

```bash
# Cài Docker
apt update
apt install -y docker.io docker-compose-plugin

# Khởi động Docker
systemctl start docker
systemctl enable docker
```

## Bước 4: Cài đặt Certbot và tạo SSL Certificate

```bash
# Cài Certbot
apt install -y certbot

# Dừng tất cả services đang dùng port 80 (nếu có)
docker compose -f docker-compose.vps.yml down 2>/dev/null || true

# Tạo SSL certificate cho domain
certbot certonly --standalone -d datnbdk.duckdns.org --email your-email@example.com --agree-tos --non-interactive

# Tạo thư mục cho Certbot renewal
mkdir -p /var/www/certbot
```

> **Lưu ý**: Nếu gặp lỗi khi tạo certificate, đảm bảo:
>
> - Port 80 đang được mở và không có service nào đang chạy
> - DNS đã trỏ đúng về IP VPS (có thể kiểm tra bằng `dig datnbdk.duckdns.org`)

## Bước 5: Tạo file .env

## Bước 6: Build và chạy

```bash
docker compose -f docker-compose.vps.yml up -d --build
```

## Bước 7: Kiểm tra

```bash
# Xem logs
docker compose -f docker-compose.vps.yml logs -f

# Xem status
docker compose -f docker-compose.vps.yml ps

# Test HTTPS
curl https://datnbdk.duckdns.org/health
```

## Các lệnh hữu ích

```bash
# Restart
docker compose -f docker-compose.vps.yml restart

# Xem logs backend
docker compose -f docker-compose.vps.yml logs -f backend

# Xem logs nginx
docker compose -f docker-compose.vps.yml logs -f nginx

# Dừng
docker compose -f docker-compose.vps.yml down

# Cập nhật code
git pull origin main
docker compose -f docker-compose.vps.yml up -d --build

# Renew SSL certificate (chạy mỗi 90 ngày hoặc setup cron)
docker compose -f docker-compose.vps.yml down
certbot renew
docker compose -f docker-compose.vps.yml up -d
```

---

## Cấu hình Auto-renew SSL (cron job)

```bash
# Mở crontab
crontab -e

# Thêm dòng sau (chạy lúc 2:00 AM hàng ngày)
0 2 * * * /usr/bin/certbot renew --quiet --post-hook "cd /root/DATN_BUI_DANG_KHOA && docker compose -f docker-compose.vps.yml restart nginx"
```

---

## Troubleshooting

### SSL certificate không tạo được

```bash
# Kiểm tra DNS
dig datnbdk.duckdns.org

# Đảm bảo port 80 mở
ufw allow 80
ufw allow 443
```

### Backend không khởi động

```bash
# Xem logs chi tiết
docker compose -f docker-compose.vps.yml logs backend

# Vào container để debug
docker exec -it doantn_backend bash
```

### Nginx không khởi động

```bash
# Kiểm tra config
docker exec -it doantn_nginx nginx -t

# Xem logs
docker compose -f docker-compose.vps.yml logs nginx
```
