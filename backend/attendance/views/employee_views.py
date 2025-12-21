from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from ..models import Employee

@login_required
def employee_list(request):
    if not request.user.is_staff:
        messages.error(request, 'Bạn không có quyền truy cập trang này.')
        return redirect('attendance:dashboard')
    
    employees = Employee.objects.select_related('user').all().order_by('employee_id')
    departments = Employee.objects.values_list('department', flat=True).distinct().order_by('department')
    
    context = {
        'employees': employees,
        'departments': departments,
        'total_employees': employees.count(),
        'working_count': employees.filter(work_status='WORKING').count(),
        'on_leave_count': employees.filter(work_status='ON_LEAVE').count(),
        'terminated_count': employees.filter(work_status='TERMINATED').count(),
    }
    
    return render(request, 'attendance/employee_list.html', context)

@login_required
def employee_create(request):
    if not request.user.is_staff:
        messages.error(request, 'Bạn không có quyền truy cập trang này.')
        return redirect('attendance:dashboard')
    
    if request.method == 'POST':
        from ..forms import EmployeeCreationForm
        form = EmployeeCreationForm(request.POST)
        
        if form.is_valid():
            try:
                employee = form.save()
                messages.success(
                    request, 
                    f'Đã tạo nhân viên {employee.user.get_full_name()} ({employee.employee_id}) thành công.'
                )
                return redirect('attendance:employee_list')
            except Exception as e:
                messages.error(request, f'Lỗi khi tạo nhân viên: {str(e)}')
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f'{form.fields.get(field).label if field != "__all__" else ""}: {error}')
    else:
        from ..forms import EmployeeCreationForm
        form = EmployeeCreationForm()
    
    return render(request, 'attendance/employee_form.html', {'form': form})
