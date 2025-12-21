from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from ..models import Employee, Department

@login_required
def department_list(request):
    if not request.user.is_staff:
        messages.error(request, 'Bạn không có quyền truy cập trang này.')
        return redirect('attendance:dashboard')
    
    departments = Department.objects.all().order_by('name')
    return render(request, 'attendance/department_list.html', {'departments': departments})

@login_required
def department_create(request):
    if not request.user.is_staff:
        messages.error(request, 'Bạn không có quyền truy cập trang này.')
        return redirect('attendance:dashboard')
    
    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description', '')
        
        if not name:
            messages.error(request, 'Tên phòng ban không được để trống.')
            return render(request, 'attendance/department_form.html')
        
        if Department.objects.filter(name=name).exists():
            messages.error(request, f'Phòng ban "{name}" đã tồn tại.')
            return render(request, 'attendance/department_form.html')
        
        Department.objects.create(name=name, description=description)
        messages.success(request, f'Đã tạo phòng ban "{name}" thành công.')
        return redirect('attendance:department_list')
    
    return render(request, 'attendance/department_form.html')

@login_required
def department_update(request, pk):
    if not request.user.is_staff:
        messages.error(request, 'Bạn không có quyền truy cập trang này.')
        return redirect('attendance:dashboard')
    
    department = get_object_or_404(Department, pk=pk)
    
    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description', '')
        
        if not name:
            messages.error(request, 'Tên phòng ban không được để trống.')
            return render(request, 'attendance/department_form.html', {'department': department})
        
        if Department.objects.filter(name=name).exclude(pk=pk).exists():
            messages.error(request, f'Phòng ban "{name}" đã tồn tại.')
            return render(request, 'attendance/department_form.html', {'department': department})
        
        old_name = department.name
        if old_name != name:
            Employee.objects.filter(department=old_name).update(department=name)
        
        department.name = name
        department.description = description
        department.save()
        
        messages.success(request, f'Đã cập nhật phòng ban "{name}" thành công.')
        return redirect('attendance:department_list')
    
    return render(request, 'attendance/department_form.html', {'department': department})

@login_required
def department_delete(request, pk):
    if not request.user.is_staff:
        messages.error(request, 'Bạn không có quyền truy cập trang này.')
        return redirect('attendance:dashboard')
    
    department = get_object_or_404(Department, pk=pk)
    
    if request.method == 'POST':
        dept_name = department.name
        Employee.objects.filter(department=dept_name).update(department='Chưa phân công')
        department.delete()
        messages.success(request, f'Đã xóa phòng ban "{dept_name}" thành công.')
        return redirect('attendance:department_list')
    
    return render(request, 'attendance/department_confirm_delete.html', {'department': department})

@login_required
def department_detail(request, pk):
    if not request.user.is_staff:
        messages.error(request, 'Bạn không có quyền truy cập trang này.')
        return redirect('attendance:dashboard')
    
    department = get_object_or_404(Department, pk=pk)
    employees = Employee.objects.filter(department=department.name).select_related('user').order_by('employee_id')
    
    context = {
        'department': department,
        'employees': employees,
        'total_employees': employees.count(),
        'working_count': employees.filter(work_status='WORKING').count(),
        'on_leave_count': employees.filter(work_status='ON_LEAVE').count(),
        'terminated_count': employees.filter(work_status='TERMINATED').count(),
    }
    
    return render(request, 'attendance/department_detail.html', context)
