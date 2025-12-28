from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LoginView
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib import messages
from datetime import timedelta
from ..models import Employee, AttendanceRecord, Department
from .utils import get_vietnam_now

class CustomLoginView(LoginView):
    def form_valid(self, form):
        user = form.get_user()
        # Chỉ cho phép admin/staff đăng nhập vào Django Templates
        if not user.is_staff:
            messages.error(self.request, 'Chỉ quản trị viên mới có thể đăng nhập vào hệ thống này.')
            return self.form_invalid(form)
        messages.success(self.request, f'Chào mừng {user.get_full_name() or user.username}! Đăng nhập thành công.')
        return super().form_valid(form)

@login_required
@staff_member_required(login_url='attendance:login')
def dashboard(request):
    vietnam_now = get_vietnam_now()

    company_stats = {
        'total_employees': Employee.objects.count(),
        'working': Employee.objects.filter(work_status='WORKING').count(),
        'on_leave': Employee.objects.filter(work_status='ON_LEAVE').count(),
        'terminated': Employee.objects.filter(work_status='TERMINATED').count(),
        'in_office': Employee.objects.filter(current_status='IN_OFFICE', work_status='WORKING').count(),
        'out_office': Employee.objects.filter(current_status='OUT_OFFICE', work_status='WORKING').count(),
        'not_in': Employee.objects.filter(current_status='NOT_IN', work_status='WORKING').count(),
    }

    # Admin dashboard - hiển thị danh sách nhân viên có điểm danh gần đây
    yesterday = vietnam_now.date() - timedelta(days=1)
    recent_records = AttendanceRecord.objects.filter(
        date__gte=yesterday
    ).select_related('employee', 'employee__user').order_by('-check_in_time')
    
    recent_employee_ids = recent_records.values_list('employee_id', flat=True).distinct()
    
    employees = Employee.objects.filter(id__in=recent_employee_ids).select_related('user')
    employee_order = {emp_id: idx for idx, emp_id in enumerate(recent_employee_ids)}
    employees = sorted(employees, key=lambda e: employee_order.get(e.id, 999))

    employees = list(employees)
    dept_map = {d.name: d.id for d in Department.objects.all()}
    for emp in employees:
        emp.department_id = dept_map.get(emp.department)

    context = {
        'current_time': vietnam_now,
        'company_stats': company_stats,
        'employees': employees,
        'total_departments': Department.objects.count(),
    }
    return render(request, 'attendance/dashboard.html', context)

