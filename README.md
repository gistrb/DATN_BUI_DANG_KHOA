# Hệ Thống Điểm Danh Nhận Diện Khuôn Mặt

Đồ án tốt nghiệp: **NGHIÊN CỨU CÔNG NGHỆ PYTHON (DJANGO, ARCFACE) VÀ XÂY DỰNG HỆ THỐNG CHẤM CÔNG BẰNG NHẬN DIỆN KHUÔN MẶT**

## 📋 Mục Lục

- [Công Nghệ](#công-nghệ)
- [Cấu Trúc Dự Án](#cấu-trúc-dự-án)
- [Cài Đặt & Chạy](#cài-đặt--chạy)
- [Tính Năng](#tính-năng)
- [Giao Diện](#giao-diện)
  - [Web - Admin](#web---admin)
  - [Web - Nhân viên](#web---nhân-viên)
  - [Mobile App](#mobile-app)
- [Cấu Hình](#cấu-hình)

---

## 🛠 Công Nghệ

| Thành phần            | Công nghệ                                    |
| --------------------- | -------------------------------------------- |
| **Backend**           | Django (Python), Django REST Framework       |
| **Web Frontend**      | React (Vite), Bootstrap 5                    |
| **Mobile App**        | React Native (Expo)                          |
| **Database**          | PostgreSQL                                   |
| **AI/CV**             | InsightFace (ArcFace - Buffalo_l), MediaPipe |
| **Push Notification** | Firebase Cloud Messaging (FCM)               |

---

## 📁 Cấu Trúc Dự Án

```
DOANTN/
├── backend/          # Django Backend API
│   ├── config/       # Django settings
│   └── attendance/   # App chính (models, views, face recognition)
├── frontend/         # React/Vite Web App
├── mobile/           # React Native/Expo Mobile App
├── img/              # Screenshots giao diện
└── README.md
```

---

## 🚀 Cài Đặt & Chạy

### 1. Backend (Django)

**Yêu cầu:** Python 3.8+, PostgreSQL

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

### 2. Web Frontend (React + Vite)

**Yêu cầu:** Node.js 16+

```bash
cd frontend
npm install
npm run dev
```

### 3. Mobile App (Expo)

**Yêu cầu:** Node.js, Expo Go trên điện thoại

```bash
cd mobile
npm install
npx expo start
```

---

## ✨ Tính Năng

### 👨‍💼 Admin (Web)

- Dashboard thống kê tổng quan
- Quản lý nhân viên, phòng ban, tài khoản
- Đăng ký khuôn mặt cho nhân viên (5 góc: chính diện, trái, phải, lên, xuống)
- Xem lịch sử chấm công

### 👤 Nhân viên (Web)

- Chấm công bằng khuôn mặt qua webcam
- Xác thực bằng chớp mắt (Blink Detection)
- Xem thống kê cá nhân

### 📱 Nhân viên (Mobile)

- Đăng nhập tài khoản
- Xem thống kê chuyên cần cá nhân
- Xem lịch sử điểm danh
- Nhận thông báo đẩy khi chấm công thành công

---

## 🖼 Giao Diện

### Web - Admin

#### Đăng nhập Admin

![Đăng nhập Admin](img/đăng%20nhập%20với%20tài%20khoản%20admin.png)

#### Dashboard Admin

![Dashboard Admin](img/giao%20diện%20admin%20trên%20web.png)

#### Quản lý Nhân viên

![Quản lý Nhân viên](img/giao%20diện%20quản%20lý%20nhân%20viên.png)

#### Chi tiết Nhân viên

![Chi tiết Nhân viên](img/giao%20diện%20chi%20tiết%20thông%20tiin%20nhân%20viên.png)

#### Đăng ký Khuôn mặt

![Đăng ký Khuôn mặt](img/giao%20diện%20đăng%20ký%20khuôn%20mặt.png)

#### Quản lý Phòng ban

![Quản lý Phòng ban](img/giao%20diện%20quản%20lý%20phòng%20ban.png)

#### Chi tiết Phòng ban

![Chi tiết Phòng ban](img/giao%20diện%20chi%20tiết%20phòng%20ban.png)

#### Quản lý Tài khoản

![Quản lý Tài khoản](img/giao%20diện%20quản%20lý%20tài%20khoản.png)

#### Thêm Tài khoản

![Thêm Tài khoản](img/giao%20diện%20thêm%20tài%20khoản.png)

#### Sửa Tài khoản

![Sửa Tài khoản](img/giao%20diện%20sửa%20tài%20khoản.png)

---

### Web - Nhân viên

#### Đăng nhập Nhân viên

![Đăng nhập Nhân viên](img/đăng%20nhập%20bằng%20tài%20khoản%20nhân%20viên%20trên%20web.png)

#### Thông tin Nhân viên

![Thông tin Nhân viên](img/giao%20diện%20thông%20tin%20nhân%20viên.png)

---

### Mobile App

#### Đăng nhập Mobile

![Đăng nhập Mobile](img/giao%20diện%20đăng%20nhập%20mobile.png)

#### Đăng nhập Thành công

![Đăng nhập Thành công](img/giao%20diện%20đăng%20nhập%20thành%20công%20cho%20nhân%20viên.png)

#### Thông báo Chấm công

![Thông báo Chấm công](img/thông%20báo%20chấm%20công%20mobile.png)

#### Chi tiết Thông báo

![Chi tiết Thông báo](img/chi%20tiết%20thông%20báo.png)

---


---

## 📄 License

© 2026 - Đồ án tốt nghiệp
