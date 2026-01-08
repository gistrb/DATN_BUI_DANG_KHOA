"""
API endpoints for React frontend
Provides JSON responses for dashboard, employees, departments, and accounts
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.db.models import Count  # Keep for potential future use
from datetime import timedelta
import json

from ..models import Employee, AttendanceRecord, Department
from .utils import get_vietnam_now


def json_response(data, status=200):
    """Helper to create JSON response"""
    return JsonResponse(data, status=status, json_dumps_params={'ensure_ascii': False})


def error_response(message, status=400):
    """Helper for error responses"""
    return json_response({'success': False, 'message': message}, status)


@csrf_exempt
def dashboard_api(request):
    """API to get dashboard data for React frontend"""
    if request.method != 'GET':
        return error_response('Method not allowed', 405)
    
    vietnam_now = get_vietnam_now()
    
    # Company statistics
    company_stats = {
        'total_employees': Employee.objects.count(),
        'working': Employee.objects.filter(work_status='WORKING').count(),
        'on_leave': Employee.objects.filter(work_status='ON_LEAVE').count(),
        'terminated': Employee.objects.filter(work_status='TERMINATED').count(),
        'in_office': Employee.objects.filter(current_status='IN_OFFICE', work_status='WORKING').count(),
        'out_office': Employee.objects.filter(current_status='OUT_OFFICE', work_status='WORKING').count(),
        'not_in': Employee.objects.filter(current_status='NOT_IN', work_status='WORKING').count(),
    }
    
    # Recent employees with attendance
    yesterday = vietnam_now.date() - timedelta(days=1)
    recent_records = AttendanceRecord.objects.filter(
        date__gte=yesterday
    ).select_related('employee', 'employee__user').order_by('-check_in_time')
    
    recent_employee_ids = list(recent_records.values_list('employee_id', flat=True).distinct()[:10])
    employees_qs = Employee.objects.filter(id__in=recent_employee_ids).select_related('user')
    
    employees = []
    for emp in employees_qs:
        employees.append({
            'employee_id': emp.employee_id,
            'full_name': emp.get_full_name(),
            'department': emp.department,
            'position': emp.position,
            'work_status': emp.work_status,
            'current_status': emp.current_status,
            'has_face': emp.face_embeddings is not None,
        })
    
    return json_response({
        'success': True,
        'company_stats': company_stats,
        'employees': employees,
        'total_departments': Department.objects.count(),
        'current_time': vietnam_now.isoformat(),
    })


@csrf_exempt
def employees_api(request):
    """API to list/create employees"""
    if request.method == 'GET':
        employees = Employee.objects.select_related('user').all()
        
        # Apply filters
        department = request.GET.get('department')
        status = request.GET.get('status')
        search = request.GET.get('search', '')
        
        if department:
            employees = employees.filter(department=department)
        if status:
            employees = employees.filter(work_status=status)
        if search:
            employees = employees.filter(
                user__first_name__icontains=search
            ) | employees.filter(
                user__last_name__icontains=search
            ) | employees.filter(
                employee_id__icontains=search
            )
        
        data = []
        for emp in employees:
            data.append({
                'employee_id': emp.employee_id,
                'full_name': emp.get_full_name(),
                'email': emp.email or '',
                'department': emp.department,
                'position': emp.position,
                'work_status': emp.work_status,
                'work_status_display': emp.get_work_status_display(),
                'current_status': emp.current_status,
                'join_date': emp.join_date.isoformat() if emp.join_date else None,
                'has_face': emp.face_embeddings is not None,
                'has_account': emp.user is not None,
            })
        
        # Get departments for filter
        departments = list(Department.objects.values_list('name', flat=True))
        
        # Statistics
        stats = {
            'total': Employee.objects.count(),
            'working': Employee.objects.filter(work_status='WORKING').count(),
            'on_leave': Employee.objects.filter(work_status='ON_LEAVE').count(),
            'terminated': Employee.objects.filter(work_status='TERMINATED').count(),
        }
        
        return json_response({
            'success': True,
            'employees': data,
            'departments': departments,
            'stats': stats,
        })
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Auto-generate employee_id if not provided
            employee_id = data.get('employee_id')
            if not employee_id:
                # Find the highest employee_id and increment
                last_employee = Employee.objects.filter(
                    employee_id__startswith='NV'
                ).order_by('-employee_id').first()
                
                if last_employee:
                    try:
                        last_num = int(last_employee.employee_id[2:])  # Extract number after 'NV'
                        new_num = last_num + 1
                    except ValueError:
                        new_num = 1
                else:
                    new_num = 1
                
                employee_id = f'NV{new_num:03d}'  # Format: NV001, NV002, etc.
            
            # Create employee without user account
            # User/account can be created separately via account management
            employee = Employee.objects.create(
                user=None,
                employee_id=employee_id,
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', ''),
                email=data.get('email', ''),
                department=data.get('department', ''),
                position=data.get('position', ''),
                work_status=data.get('work_status', 'WORKING'),
            )
            
            return json_response({
                'success': True,
                'message': f'Đã tạo nhân viên {employee_id} thành công',
                'employee_id': employee.employee_id,
            }, 201)
            
        except json.JSONDecodeError:
            return error_response('Invalid JSON')
        except Exception as e:
            return error_response(str(e))
    
    return error_response('Method not allowed', 405)


@csrf_exempt
def employee_detail_api(request, employee_id):
    """API to get/update/delete single employee"""
    try:
        employee = Employee.objects.select_related('user').get(employee_id=employee_id)
    except Employee.DoesNotExist:
        return error_response('Employee not found', 404)
    
    if request.method == 'GET':
        # Get attendance history
        records = AttendanceRecord.objects.filter(
            employee=employee
        ).order_by('-date')[:30]
        
        history = []
        vietnam_tz = get_vietnam_now().tzinfo  # Get Vietnam timezone
        for record in records:
            # Convert UTC times to Vietnam timezone
            check_in_vn = None
            check_out_vn = None
            if record.check_in_time:
                check_in_vn = record.check_in_time.astimezone(vietnam_tz).strftime('%H:%M')
            if record.check_out_time:
                check_out_vn = record.check_out_time.astimezone(vietnam_tz).strftime('%H:%M')
            
            history.append({
                'date': record.date.isoformat(),
                'check_in': check_in_vn,
                'check_out': check_out_vn,
                'status': record.status,
                'status_display': record.get_status_display(),
            })
        
        return json_response({
            'success': True,
            'employee': {
                'employee_id': employee.employee_id,
                'username': employee.user.username if employee.user else None,
                'full_name': employee.get_full_name(),
                'first_name': employee.first_name,
                'last_name': employee.last_name,
                'email': employee.email or '',
                'department': employee.department,
                'position': employee.position,
                'work_status': employee.work_status,
                'work_status_display': employee.get_work_status_display(),
                'current_status': employee.current_status,
                'join_date': employee.join_date.isoformat() if employee.join_date else None,
                'has_face': employee.face_embeddings is not None,
                'has_account': employee.user is not None,
            },
            'attendance_history': history,
        })
    
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            
            # Update user (only if user exists)
            user = employee.user
            if user:
                if 'first_name' in data:
                    user.first_name = data['first_name']
                if 'last_name' in data:
                    user.last_name = data['last_name']
                if 'email' in data:
                    user.email = data['email']
                if 'password' in data and data['password']:
                    user.set_password(data['password'])
                user.save()
            
            # Update employee
            if 'department' in data:
                employee.department = data['department']
            if 'position' in data:
                employee.position = data['position']
            if 'work_status' in data:
                employee.work_status = data['work_status']
            employee.save()
            
            return json_response({
                'success': True,
                'message': 'Employee updated successfully',
            })
            
        except json.JSONDecodeError:
            return error_response('Invalid JSON')
        except Exception as e:
            return error_response(str(e))
    
    elif request.method == 'DELETE':
        user = employee.user
        employee.delete()
        if user:
            user.delete()
        return json_response({
            'success': True,
            'message': 'Đã xóa nhân viên thành công',
        })
    
    return error_response('Method not allowed', 405)


@csrf_exempt
def departments_api(request):
    """API to list/create departments"""
    if request.method == 'GET':
        departments = Department.objects.all()
        
        data = []
        for dept in departments:
            # Count employees by department name (since Employee.department is CharField)
            employee_count = Employee.objects.filter(department=dept.name).count()
            data.append({
                'id': dept.id,
                'name': dept.name,
                'description': dept.description,
                'employee_count': employee_count,
            })
        
        return json_response({
            'success': True,
            'departments': data,
        })
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            dept = Department.objects.create(
                name=data['name'],
                description=data.get('description', ''),
            )
            
            return json_response({
                'success': True,
                'message': 'Department created successfully',
                'id': dept.id,
            }, 201)
            
        except json.JSONDecodeError:
            return error_response('Invalid JSON')
        except Exception as e:
            return error_response(str(e))
    
    return error_response('Method not allowed', 405)


@csrf_exempt
def department_detail_api(request, pk):
    """API to get/update/delete single department"""
    try:
        department = Department.objects.get(pk=pk)
    except Department.DoesNotExist:
        return error_response('Department not found', 404)
    
    # Count employees by department name
    employee_count = Employee.objects.filter(department=department.name).count()
    
    if request.method == 'GET':
        # Get employees in this department
        employees = Employee.objects.filter(
            department=department.name
        ).select_related('user')
        
        emp_data = []
        for emp in employees:
            emp_data.append({
                'employee_id': emp.employee_id,
                'full_name': emp.get_full_name(),
                'position': emp.position,
                'work_status': emp.work_status,
            })
        
        return json_response({
            'success': True,
            'department': {
                'id': department.id,
                'name': department.name,
                'description': department.description,
                'employee_count': employee_count,
            },
            'employees': emp_data,
        })
    
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            
            if 'name' in data:
                department.name = data['name']
            if 'description' in data:
                department.description = data['description']
            department.save()
            
            return json_response({
                'success': True,
                'message': 'Department updated successfully',
            })
            
        except json.JSONDecodeError:
            return error_response('Invalid JSON')
        except Exception as e:
            return error_response(str(e))
    
    elif request.method == 'DELETE':
        # Check if department has employees
        if employee_count > 0:
            return error_response(
                f'Không thể xóa phòng ban "{department.name}" vì còn {employee_count} nhân viên. '
                f'Vui lòng chuyển nhân viên sang phòng ban khác trước khi xóa.',
                400
            )
        
        department.delete()
        return json_response({
            'success': True,
            'message': 'Đã xóa phòng ban thành công',
        })
    
    return error_response('Method not allowed', 405)


@csrf_exempt
def accounts_api(request):
    """API to list/create user accounts"""
    if request.method == 'GET':
        users = User.objects.all().prefetch_related('employee')
        
        data = []
        for user in users:
            employee = getattr(user, 'employee', None)
            data.append({
                'id': user.id,
                'username': user.username,
                'full_name': user.get_full_name(),
                'email': user.email,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'is_active': user.is_active,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'has_employee': employee is not None,
                'employee_id': employee.employee_id if employee else None,
            })
        
        # Get employees without user accounts for account creation
        available_employees = Employee.objects.filter(user__isnull=True)
        available_list = []
        for emp in available_employees:
            available_list.append({
                'employee_id': emp.employee_id,
                'full_name': emp.get_full_name(),
                'first_name': emp.first_name,
                'last_name': emp.last_name,
                'email': emp.email or '',
                'department': emp.department,
                'position': emp.position,
            })
        
        return json_response({
            'success': True,
            'accounts': data,
            'available_employees': available_list,
        })
    
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Require employee_id for new accounts
            employee_id = data.get('employee_id')
            if not employee_id:
                return error_response('Vui lòng chọn nhân viên để liên kết tài khoản')
            
            try:
                employee = Employee.objects.get(employee_id=employee_id, user__isnull=True)
            except Employee.DoesNotExist:
                return error_response('Nhân viên không tồn tại hoặc đã có tài khoản')
            
            # Create user with employee's name
            user = User.objects.create_user(
                username=data['username'],
                password=data['password'],
                email=employee.email or '',
                first_name=employee.first_name,
                last_name=employee.last_name,
            )
            
            if data.get('is_staff'):
                user.is_staff = True
            if data.get('is_superuser'):
                user.is_superuser = True
            user.save()
            
            # Link employee to user
            employee.user = user
            employee.save()
            
            return json_response({
                'success': True,
                'message': f'Đã tạo tài khoản và liên kết với nhân viên {employee_id}',
                'id': user.id,
            }, 201)
            
        except json.JSONDecodeError:
            return error_response('Invalid JSON')
        except Exception as e:
            return error_response(str(e))
    
    return error_response('Method not allowed', 405)


@csrf_exempt
def account_detail_api(request, pk):
    """API to get/update/delete single account"""
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return error_response('Account not found', 404)
    
    if request.method == 'GET':
        employee = getattr(user, 'employee', None)
        
        return json_response({
            'success': True,
            'account': {
                'id': user.id,
                'username': user.username,
                'full_name': user.get_full_name(),
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'is_active': user.is_active,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'has_employee': employee is not None,
                'employee_id': employee.employee_id if employee else None,
            },
        })
    
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            
            if 'first_name' in data:
                user.first_name = data['first_name']
            if 'last_name' in data:
                user.last_name = data['last_name']
            if 'email' in data:
                user.email = data['email']
            if 'is_staff' in data:
                user.is_staff = data['is_staff']
            if 'is_active' in data:
                user.is_active = data['is_active']
            if 'password' in data and data['password']:
                user.set_password(data['password'])
            user.save()
            
            return json_response({
                'success': True,
                'message': 'Account updated successfully',
            })
            
        except json.JSONDecodeError:
            return error_response('Invalid JSON')
        except Exception as e:
            return error_response(str(e))
    
    elif request.method == 'DELETE':
        # Unlink employee first if exists
        if hasattr(user, 'employee'):
            employee = user.employee
            employee.user = None
            employee.save()
        
        user.delete()
        return json_response({
            'success': True,
            'message': 'Đã xóa tài khoản thành công',
        })
    
    return error_response('Method not allowed', 405)
