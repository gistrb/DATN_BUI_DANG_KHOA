from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Employee, AttendanceRecord, Department
from django.utils.html import format_html
from django.urls import path
from django.shortcuts import redirect

class EmployeeInline(admin.StackedInline):
    model = Employee
    can_delete = False
    readonly_fields = ('current_status',)  # Không cho phép sửa trạng thái hiện tại
    fieldsets = (
        ('Thông tin cá nhân', {
            'fields': ('employee_id', 'gender', 'date_of_birth', 'phone_number', 'address')
        }),
        ('Thông tin công việc', {
            'fields': ('department', 'position', 'join_date', 'work_status')
        }),
        ('Trạng thái', {
            'fields': ('current_status', 'is_active'),
            'classes': ('collapse',)
        }),
    )

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('employee_id', 'get_full_name', 'department', 'position', 'work_status', 'current_status', 'is_active', 'face_embeddings_status')
    list_filter = ('work_status', 'current_status', 'department', 'is_active')
    search_fields = ('employee_id', 'user__first_name', 'user__last_name', 'department')
    readonly_fields = ('current_status', 'face_embeddings_status')
    actions = ['clear_face_embeddings']

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('<int:employee_id>/clear_face/', self.admin_site.admin_view(self.clear_face_view), name='clear-face'),
        ]
        return custom_urls + urls

    def clear_face_view(self, request, employee_id):
        """View để xóa face embeddings của một nhân viên"""
        try:
            employee = Employee.objects.get(id=employee_id)
            employee.clear_face_embeddings()
            self.message_user(request, f"Đã xóa dữ liệu khuôn mặt của nhân viên {employee.employee_id}")
        except Employee.DoesNotExist:
            self.message_user(request, "Không tìm thấy nhân viên", level='ERROR')
        return redirect('admin:attendance_employee_changelist')

    def clear_face_embeddings(self, request, queryset):
        """Action để xóa face embeddings của nhiều nhân viên"""
        for employee in queryset:
            employee.clear_face_embeddings()
        self.message_user(request, f"Đã xóa dữ liệu khuôn mặt của {len(queryset)} nhân viên")
    clear_face_embeddings.short_description = "Xóa dữ liệu khuôn mặt của các nhân viên đã chọn"

    def face_embeddings_status(self, obj):
        """Hiển thị trạng thái dữ liệu khuôn mặt"""
        if obj.face_embeddings:
            return format_html('<span style="color: green;">Đã đăng ký</span>')
        return format_html('<span style="color: red;">Chưa đăng ký</span>')
    face_embeddings_status.short_description = "Dữ liệu khuôn mặt"

    fieldsets = (
        ('Thông tin cơ bản', {
            'fields': (('user', 'employee_id'), ('gender', 'date_of_birth'))
        }),
        ('Liên hệ', {
            'fields': ('phone_number', 'address')
        }),
        ('Công việc', {
            'fields': (('department', 'position'), 'join_date', 'work_status')
        }),
        ('Trạng thái', {
            'fields': ('current_status', 'is_active', 'face_embeddings_status'),
            'classes': ('collapse',)
        }),
    )

    def get_full_name(self, obj):
        return obj.user.get_full_name()
    get_full_name.short_description = 'Họ và tên'

    def save_model(self, request, obj, form, change):
        # Cập nhật trạng thái khi lưu từ admin
        if 'work_status' in form.changed_data:
            # Trạng thái hiện tại sẽ tự động được cập nhật trong phương thức save của model
            obj.save()
        else:
            super().save_model(request, obj, form, change)

class CustomUserAdmin(BaseUserAdmin):
    inlines = (EmployeeInline,)

# Ghi đè User admin mặc định
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('employee', 'date', 'check_in_time', 'check_out_time', 'status')
    list_filter = ('date', 'status', 'employee__department')
    search_fields = ('employee__user__first_name', 'employee__user__last_name', 'employee__employee_id')
    date_hierarchy = 'date'

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'description', 'created_at')
    search_fields = ('name',)
