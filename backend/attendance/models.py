from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import numpy as np
import json
from pgvector.django import VectorField

class Department(models.Model):
    """Model quản lý phòng ban"""
    name = models.CharField(max_length=100, unique=True, verbose_name="Tên phòng ban")
    description = models.TextField(blank=True, null=True, verbose_name="Mô tả")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Ngày tạo")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Ngày cập nhật")

    class Meta:
        verbose_name = "Phòng ban"
        verbose_name_plural = "Phòng ban"
        ordering = ['name']

    def __str__(self):
        return self.name
    
    def get_employee_count(self):
        """Đếm số nhân viên trong phòng ban"""
        return self.employees.count()
    
    def get_active_employee_count(self):
        """Đếm số nhân viên đang làm việc"""
        return self.employees.filter(work_status='WORKING').count()


class Employee(models.Model):
    GENDER_CHOICES = [
        ('M', 'Nam'),
        ('F', 'Nữ'),
        ('O', 'Khác')
    ]

    WORK_STATUS_CHOICES = [
        ('WORKING', 'Đang làm việc tại công ty'),
        ('ON_LEAVE', 'Đang nghỉ phép'),
        ('TERMINATED', 'Đã nghỉ việc'),
    ]

    CURRENT_STATUS_CHOICES = [
        ('IN_OFFICE', 'Đang trong ca làm việc'),
        ('OUT_OFFICE', 'Đã check-out'),
        ('NOT_IN', 'Chưa check-in')
    ]

    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True)
    employee_id = models.CharField(max_length=20, unique=True, verbose_name="Mã nhân viên")
    first_name = models.CharField(max_length=50, verbose_name="Tên", default='')
    last_name = models.CharField(max_length=50, verbose_name="Họ", default='')
    email = models.EmailField(blank=True, null=True, verbose_name="Email")
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default='O', verbose_name="Giới tính")
    date_of_birth = models.DateField(null=True, blank=True, verbose_name="Ngày sinh")
    phone_number = models.CharField(max_length=15, null=True, blank=True, verbose_name="Số điện thoại")
    address = models.TextField(null=True, blank=True, verbose_name="Địa chỉ")
    department = models.ForeignKey(
        'Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees',
        verbose_name="Phòng ban"
    )
    position = models.CharField(max_length=100, default='Nhân viên', verbose_name="Chức vụ")
    join_date = models.DateField(default=timezone.now, verbose_name="Ngày vào làm")
    face_embeddings = models.TextField(null=True, blank=True)  # Store multiple face embeddings as JSON

    # Trạng thái làm việc tổng thể
    work_status = models.CharField(
        max_length=20,
        choices=WORK_STATUS_CHOICES,
        default='WORKING',
        verbose_name="Trạng thái làm việc"
    )

    # Trạng thái hiện tại (trong ca/ngoài ca)
    current_status = models.CharField(
        max_length=20,
        choices=CURRENT_STATUS_CHOICES,
        default='NOT_IN',
        verbose_name="Trạng thái hiện tại",
        editable=False  # Không cho phép chỉnh sửa trực tiếp trong admin
    )

    is_active = models.BooleanField(default=True, verbose_name="Tài khoản đang hoạt động")
    expo_push_token = models.CharField(max_length=255, null=True, blank=True, verbose_name="Expo Push Token")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Tự động cập nhật current_status dựa trên work_status
        if self.work_status == 'TERMINATED':
            self.current_status = 'NOT_IN'
            self.is_active = False
        elif self.work_status == 'ON_LEAVE':
            self.current_status = 'NOT_IN'
        else:  # WORKING
            # Chỉ cập nhật nếu là bản ghi mới
            if not self.pk:
                self.current_status = 'NOT_IN'

        super().save(*args, **kwargs)

    def set_face_embeddings(self, embedding_arrays):
        """Lưu list của các embedding vào bảng phụ bằng pgvector"""
        # Xóa các embedding cũ
        self.face_embeddings_vector.all().delete()
        
        # Thêm các embedding mới
        for emb in embedding_arrays:
            if hasattr(emb, 'tolist'):
                emb_list = emb.tolist()
            else:
                emb_list = emb
            EmployeeFaceEmbedding.objects.create(employee=self, embedding=emb_list)

    def get_face_embeddings(self):
        """Lấy list của các embedding từ bảng phụ"""
        embeddings = self.face_embeddings_vector.all()
        return [np.array(e.embedding) for e in embeddings]

    def clear_face_embeddings(self):
        """Xóa tất cả face embeddings của nhân viên"""
        self.face_embeddings_vector.all().delete()
        self.save()
        return True

    def update_current_status(self, is_checking_in):
        """Cập nhật trạng thái hiện tại của nhân viên"""
        if self.work_status != 'WORKING':
            return False

        if is_checking_in:
            self.current_status = 'IN_OFFICE'
        else:
            self.current_status = 'OUT_OFFICE'
        self.save()
        return True

    class Meta:
        verbose_name = "Nhân viên"
        verbose_name_plural = "Nhân viên"
        ordering = ['employee_id']

    def get_full_name(self):
        """Trả về họ tên đầy đủ của nhân viên"""
        return f"{self.last_name} {self.first_name}".strip() or self.employee_id

    def __str__(self):
        return f"{self.get_full_name()} ({self.employee_id})"


class EmployeeFaceEmbedding(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='face_embeddings_vector', verbose_name="Nhân viên")
    # TFLite/ONNX embedding size is normally around 128 or 512, our ONNX model output says 512
    # Adjust dimensions if you know the exact size of your embedding. 
    embedding = VectorField(dimensions=512, verbose_name="Face Embedding Vector")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Face Embedding"
        verbose_name_plural = "Face Embeddings"
        indexes = [
            # Index for faster cosine distance queries
            # models.Index(fields=['embedding'], name='employee_emb_idx', opclasses=['vector_cosine_ops'])  # HNSW or IVFFlat recommended for large scale, but fine without for now
        ]

    def __str__(self):
        return f"Embedding for {self.employee.get_full_name()}"

class AttendanceRecord(models.Model):
    STATUS_CHOICES = [
        ('ON_TIME', 'Đúng giờ'),
        ('LATE', 'Đi muộn'),
        ('EARLY', 'Về sớm'),
        ('ABSENT', 'Vắng mặt'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, verbose_name="Nhân viên")
    date = models.DateField(auto_now_add=True, verbose_name="Ngày")
    check_in_time = models.DateTimeField(null=True, blank=True, verbose_name="Thời gian check-in")
    check_out_time = models.DateTimeField(null=True, blank=True, verbose_name="Thời gian check-out")
    check_in_photo = models.ImageField(upload_to='attendance_photos/', null=True, blank=True, verbose_name="Ảnh check-in")
    check_out_photo = models.ImageField(upload_to='attendance_photos/', null=True, blank=True, verbose_name="Ảnh check-out")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, verbose_name="Trạng thái")
    note = models.TextField(blank=True, null=True, verbose_name="Ghi chú")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Bản ghi chấm công"
        verbose_name_plural = "Bản ghi chấm công"
        unique_together = ['employee', 'date']
        ordering = ['-date', '-check_in_time']

    def __str__(self):
        return f"{self.employee.user.get_full_name()} - {self.date} - {self.status}"
