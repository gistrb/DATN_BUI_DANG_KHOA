from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LoginView
from django.contrib import messages
from datetime import timedelta
from calendar import monthrange
import calendar
from ..models import Employee, AttendanceRecord, Department
from .utils import get_vietnam_now

class CustomLoginView(LoginView):
    def form_valid(self, form):
        messages.success(self.request, f'Chào mừng {form.get_user().get_full_name() or form.get_user().username}! Đăng nhập thành công.')
        return super().form_valid(form)

@login_required
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

    personal_stats = None
    recent_history = None
    calendar_data = None

    if request.user.is_staff:
        yesterday = vietnam_now.date() - timedelta(days=1)
        recent_records = AttendanceRecord.objects.filter(
            date__gte=yesterday
        ).select_related('employee', 'employee__user').order_by('-check_in_time')
        
        recent_employee_ids = recent_records.values_list('employee_id', flat=True).distinct()
        
        employees = Employee.objects.filter(id__in=recent_employee_ids).select_related('user')
        employee_order = {emp_id: idx for idx, emp_id in enumerate(recent_employee_ids)}
        employees = sorted(employees, key=lambda e: employee_order.get(e.id, 999))
    else:
        employee = Employee.objects.get(user=request.user)
        employees = [employee]
        
        _, last_day = monthrange(vietnam_now.year, vietnam_now.month)
        month_start = vietnam_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_end = vietnam_now.replace(day=last_day, hour=23, minute=59, second=59, microsecond=999999)
        
        month_records = AttendanceRecord.objects.filter(
            employee=employee,
            date__range=[month_start.date(), month_end.date()]
        )
        
        personal_stats = {
            'on_time': month_records.filter(status='ON_TIME').count(),
            'late': month_records.filter(status='LATE').count(),
            'early': month_records.filter(status='EARLY').count(),
            'total_days': month_records.count()
        }
        
        recent_history = AttendanceRecord.objects.filter(employee=employee).order_by('-date')[:5]

        cal = calendar.monthcalendar(vietnam_now.year, vietnam_now.month)
        calendar_data = []
        
        attendance_map = {record.date.day: record.status for record in month_records}

        for week in cal:
            week_data = []
            for day in week:
                if day == 0:
                    week_data.append(None)
                else:
                    week_data.append({
                        'day': day,
                        'status': attendance_map.get(day),
                        'is_today': day == vietnam_now.day
                    })
            calendar_data.append(week_data)

    if request.user.is_staff:
        employees = list(employees)
        dept_map = {d.name: d.id for d in Department.objects.all()}
        for emp in employees:
            emp.department_id = dept_map.get(emp.department)

    context = {
        'current_time': vietnam_now,
        'company_stats': company_stats,
        'employees': employees,
        'personal_stats': personal_stats,
        'calendar_data': calendar_data,
        'total_departments': Department.objects.count(),
    }
    return render(request, 'attendance/dashboard.html', context)
