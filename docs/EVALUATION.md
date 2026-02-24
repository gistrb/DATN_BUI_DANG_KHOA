# CHƯƠNG 5: KẾT QUẢ VÀ HƯỚNG PHÁT TRIỂN

## 5.1. Kết quả đạt được

Sau quá trình nghiên cứu và thực hiện, đồ án đã hoàn thành việc xây dựng khung hệ thống điểm danh và quản lý nhân sự, đáp ứng các yêu cầu cơ bản:

1.  **Hệ thống phần mềm**:
    - **Mobile App (React Native)**: Cho phép nhân viên đăng nhập, xem thống kê chuyên cần, lịch sử chấm công và nhận thông báo nhắc nhở.
    - **Web Portal (ReactJS)**: Cung cấp công cụ quản trị (Dashboard, quản lý nhân viên, phòng ban, báo cáo, xuất Excel).
    - **Backend API (Django)**: Xử lý nghiệp vụ, xác thực người dùng (JWT) và cung cấp API chuẩn RESTful cho các client.

2.  **Hạ tầng triển khai**:
    - Hệ thống được đóng gói hoàn chỉnh bằng **Docker** (Containerization).
    - Đã triển khai thành công trên **Render Cloud Platform**, đảm bảo tính ổn định và khả năng truy cập mọi lúc mọi nơi.

3.  **Mã nguồn dự án**:
    - Toàn bộ mã nguồn được tổ chức theo kiến trúc Client-Server rõ ràng, dễ bảo trì và mở rộng.
    - **Link Repository**: [https://github.com/gistrb/DATN_BUI_DANG_KHOA](https://github.com/gistrb/DATN_BUI_DANG_KHOA)

## 5.2. Đánh giá cơ chế và hiệu năng

Hệ thống đã xây dựng được cơ sở hạ tầng cho việc nhận diện và xác thực:

- **Cơ chế xác thực**: Sử dụng **JWT (JSON Web Token)** để bảo mật phiên làm việc trên đa nền tảng.
- **Xử lý dữ liệu khuôn mặt**: Backend đã tích hợp sẵn luồng xử lý vector đặc trưng (Embeddings) và thuật toán so khớp **Cosine Similarity** để kiểm tra độ trùng khớp.
- **Hiệu năng API**: Các API truy xuất dữ liệu (Lịch sử, Thống kê) có tốc độ phản hồi nhanh (< 500ms), đảm bảo trải nghiệm mượt mà trên ứng dụng di động.

## 5.3. Ưu điểm và hạn chế của hệ thống

### Ưu điểm

- **Tính sẵn sàng cao**: Nền tảng Render đảm bảo Uptime 99.9% và tự động mở rộng (auto-scaling) khi cần thiết.
- **Trải nghiệm người dùng**: Giao diện Mobile và Web được thiết kế nhất quán, hiện đại.
- **Kiến trúc mở**: Dễ dàng tích hợp thêm các module AI xử lý ảnh phức tạp vào Backend mà không ảnh hưởng đến luồng hoạt động của Mobile App.
- **Bảo mật**: Dữ liệu người dùng được mã hóa, giao tiếp qua HTTPS.

### Hạn chế

- **Tính năng Check-in**: Module nhận diện khuôn mặt và chụp ảnh điểm danh trên Mobile App đang trong giai đoạn phát triển (Phase 2), hiện tại ứng dụng tập trung vào tính năng tra cứu và thông báo.
- **Phụ thuộc kết nối**: Yêu cầu kết nối Internet liên tục để đồng bộ dữ liệu.
- **Xử lý ảnh**: Thuật toán xử lý ảnh nâng cao (InsightFace) đã được định nghĩa nhưng chưa được kích hoạt hoàn toàn trong phiên bản hiện tại.

## 5.4. Hướng phát triển

Dựa trên kết quả hiện tại, hướng phát triển tiếp theo của đề tài tập trung vào việc hoàn thiện module AI:

1.  **Hoàn thiện Module Check-in AI**:
    - Kích hoạt thư viện **InsightFace** trên Backend để xử lý ảnh upload từ người dùng.
    - Bổ sung màn hình Camera Capture trên Mobile App để cho phép nhân viên tự chụp ảnh chấm công.
    - Tích hợp **Liveness Detection** để ngăn chặn giả mạo (Anti-spoofing).

2.  **Tối ưu ứng dụng**:
    - Xây dựng chế độ **Offline Mode**: Cho phép xem lịch sử khi không có mạng.
    - Cải thiện tốc độ phản hồi bằng cách cache dữ liệu tĩnh.

3.  **Mở rộng nghiệp vụ**:
    - Tích hợp module **Tính lương tự động** từ dữ liệu chấm công.
    - Hỗ trợ **Đa chi nhánh** cho doanh nghiệp quy mô lớn.
