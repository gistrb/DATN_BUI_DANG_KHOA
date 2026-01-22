# Hướng Dẫn Deploy Lên VPS với Docker

Hướng dẫn này giúp bạn triển khai ứng dụng lên VPS (Ubuntu/Debian) sử dụng Docker và Docker Compose.

## Mục Lục

1. [Chuẩn Bị VPS](#1-chuẩn-bị-vps)
2. [Cài Đặt Docker](#2-cài-đặt-docker)
3. [Clone Mã Nguồn](#3-clone-mã-nguồn)
4. [Cấu Hình Biến Môi Trường](#4-cấu-hình-biến-môi-trường)
5. [Build & Chạy Ứng Dụng](#5-build--chạy-ứng-dụng)
6. [Các Lệnh Hữu Ích](#6-các-lệnh-hữu-ích)
7. [Thiết Lập SSL (HTTPS)](#7-thiết-lập-ssl-https-tùy-chọn)

---

## 1. Chuẩn Bị VPS

- Hệ điều hành: Ubuntu 20.04+ hoặc Debian 11+
- RAM tối thiểu: 2GB (khuyến nghị 4GB vì InsightFace cần nhiều RAM)
- Mở port: 80 (HTTP), 443 (HTTPS), và 22 (SSH)

### Cập nhật hệ thống

````bash
sudo apt update && sudo apt upgrade -y
---

## 2. Cài Đặt Docker

### Cài Docker Engine

```bash
# Cài các package cần thiết
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Thêm Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Thêm Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Cài đặt Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Cho phép user hiện tại chạy docker không cần sudo
sudo usermod -aG docker $USER

# Áp dụng thay đổi (cần logout/login lại hoặc chạy lệnh sau)
newgrp docker
````

### Kiểm tra Docker đã cài thành công

```bash
docker --version
docker compose version
```

---

## 3. Clone Mã Nguồn

````bash
# Di chuyển vào thư mục home (hoặc nơi bạn muốn đặt code)
cd ~

# Clone repository
git clone https://github.com/gistrb/DATN_BUI_DANG_KHOA.git

# Vào thư mục dự án
cd DATN_BUI_DANG_KHOA

---

## 4. Cấu Hình Biến Môi Trường

Tạo file `.env` ở thư mục gốc của dự án:

```bash
nano .env
````

Thêm nội dung sau (thay đổi các giá trị cho phù hợp):

```env
# Database
DB_NAME=datn
DB_USER=postgres
DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE

# Django
SECRET_KEY=your-very-long-and-random-secret-key-here
ALLOWED_HOSTS=
DEBUG=False

# CORS & CSRF (thay bằng domain/IP thực tế)
CORS_ALLOWED_ORIGINS=
CSRF_TRUSTED_ORIGINS=

# Frontend API URL (để frontend gọi API qua Nginx proxy)
VITE_API_URL=/api
```

Lưu file: `Ctrl + O`, `Enter`, sau đó `Ctrl + X` để thoát.

---

## 5. Build & Chạy Ứng Dụng

### Build tất cả các images

```bash
docker compose build
```

### Chạy ứng dụng (chế độ nền)

```bash
docker compose up -d
```

### Kiểm tra trạng thái các container

```bash
docker compose ps
```

Bạn sẽ thấy 4 container đang chạy:

- `doantn_db` - PostgreSQL database
- `doantn_backend` - Django API
- `doantn_frontend` - React frontend
- `doantn_nginx` - Nginx gateway

### Tạo Superuser (Admin Django)

```bash
docker compose exec backend python manage.py createsuperuser
```

### Truy cập ứng dụng

- **Frontend:** `http://`
- **API:** `http://api`
- **Admin Django:** `http://admin`

---

## 6. Các Lệnh Hữu Ích

### Xem logs

```bash
# Tất cả logs
docker compose logs -f

# Logs của một service cụ thể
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
```

### Restart services

```bash
# Restart tất cả
docker compose restart

# Restart một service
docker compose restart backend
```

### Dừng ứng dụng

```bash
docker compose down
```

### Dừng và xóa tất cả (kể cả database volume)

```bash
docker compose down -v
```

### Cập nhật ứng dụng (khi có code mới)

```bash
# Pull code mới
git pull origin main

# Rebuild và restart
docker compose build
docker compose up -d
```

---

## 7. Thiết Lập SSL (HTTPS) - Tùy chọn

Nếu bạn có tên miền và muốn sử dụng HTTPS:

### Cài Certbot

```bash
sudo apt install -y certbot
```

### Tạo chứng chỉ SSL

```bash
# Dừng nginx tạm để certbot sử dụng port 80
docker compose stop nginx

# Tạo chứng chỉ
sudo certbot certonly --standalone -d your-domain.com

# Khởi động lại nginx
docker compose start nginx
```

### Cập nhật Nginx config cho HTTPS

Sau khi có chứng chỉ, bạn cần chỉnh sửa file `nginx/default.conf` để thêm cấu hình SSL. Liên hệ nếu cần hướng dẫn chi tiết phần này.

---

## Xử Lý Sự Cố

### Container không khởi động

```bash
# Xem logs để tìm lỗi
docker compose logs backend
```

### Database connection error

- Kiểm tra file `.env` có đúng thông tin database chưa
- Đảm bảo container `doantn_db` đang chạy

### Lỗi permission

```bash
# Đảm bảo entrypoint.sh có quyền execute
chmod +x backend/entrypoint.sh
docker compose build backend
```

---

**Chúc bạn deploy thành công! 🚀**
