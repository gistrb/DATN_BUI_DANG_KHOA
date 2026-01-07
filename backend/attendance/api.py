from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login
from django.shortcuts import get_object_or_404
from .models import Employee, AttendanceRecord
from django.db.models import Count
from django.utils import timezone
from datetime import datetime
import json
import traceback
from .views import get_vietnam_now
from calendar import monthrange

def safe_json_response(view_func):
    """Decorator to ensure API always returns valid JSON"""
    def wrapper(*args, **kwargs):
        try:
            return view_func(*args, **kwargs)
        except Exception as e:
            print(f"API Error in {view_func.__name__}: {str(e)}")
            traceback.print_exc()
            return JsonResponse({
                'success': False,
                'message': f'Server error: {str(e)}'
            }, status=500)
    return wrapper

@csrf_exempt
def login_api(request):
    """API Login for Mobile App and Admin"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                
                # Check if user is admin/staff (they don't need Employee record)
                if user.is_staff or user.is_superuser:
                    return JsonResponse({
                        'success': True,
                        'message': 'Login successful',
                        'user': {
                            'id': user.id,
                            'username': user.username,
                            'full_name': user.get_full_name() or user.username,
                            'is_staff': user.is_staff,
                            'is_superuser': user.is_superuser,
                            'employee_id': None,
                            'department': 'Admin',
                            'position': 'Administrator',
                            'avatar': False
                        }
                    })
                
                # For regular users, require Employee record
                try:
                    employee = user.employee
                    return JsonResponse({
                        'success': True,
                        'message': 'Login successful',
                        'user': {
                            'id': user.id,
                            'username': user.username,
                            'full_name': user.get_full_name(),
                            'is_staff': user.is_staff,
                            'is_superuser': user.is_superuser,
                            'employee_id': employee.employee_id,
                            'department': employee.department,
                            'position': employee.position,
                            'avatar': employee.face_embeddings is not None # Check if face registered
                        }
                    })
                except Employee.DoesNotExist:
                     return JsonResponse({'success': False, 'message': 'User is not an employee'}, status=403)
            else:
                return JsonResponse({'success': False, 'message': 'Invalid credentials'}, status=401)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)

@safe_json_response
def employee_stats_api(request, employee_id):
    """API to get employee statistics"""
    if not employee_id or employee_id == 'null' or employee_id == 'None':
        return JsonResponse({
            'success': False,
            'message': 'Invalid employee_id'
        }, status=400)
    
    try:
        employee = Employee.objects.get(employee_id=employee_id)
        now = get_vietnam_now()
        
        # Get stats for current month
        _, last_day = monthrange(now.year, now.month)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_end = now.replace(day=last_day, hour=23, minute=59, second=59, microsecond=999999)
        
        records = AttendanceRecord.objects.filter(
            employee=employee,
            date__range=[month_start.date(), month_end.date()]
        )
        
        total_days = int(records.count())
        on_time = int(records.filter(status='ON_TIME').count())
        late = int(records.filter(status='LATE').count())
        early = int(records.filter(status='EARLY').count())
        
        # Calculate diligence score (simple version: % on time)
        diligence_score = 0
        if total_days > 0:
            diligence_score = int((on_time / total_days) * 100)
            
        return JsonResponse({
            'success': True,
            'stats': {
                'month': str(now.strftime('%m/%Y')),
                'total_days': total_days,
                'on_time': on_time,
                'late': late,
                'early': early,
                'diligence_score': diligence_score
            }
        })
    except Employee.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Employee not found'}, status=404)

@safe_json_response
def attendance_history_api(request, employee_id):
    """API to get attendance history"""
    if not employee_id or employee_id == 'null' or employee_id == 'None':
        return JsonResponse({
            'success': False,
            'message': 'Invalid employee_id'
        }, status=400)
    
    try:
        employee = Employee.objects.get(employee_id=employee_id)
        # Get last 30 records
        records = AttendanceRecord.objects.filter(employee=employee).order_by('-date')[:30]
        
        history = []
        for record in records:
            # Convert UTC times to Vietnam timezone before formatting
            check_in_local = timezone.localtime(record.check_in_time) if record.check_in_time else None
            check_out_local = timezone.localtime(record.check_out_time) if record.check_out_time else None
            
            history.append({
                'date': str(record.date.strftime('%d/%m/%Y')),
                'check_in': str(check_in_local.strftime('%H:%M') if check_in_local else '--:--'),
                'check_out': str(check_out_local.strftime('%H:%M') if check_out_local else '--:--'),
                'status': str(record.get_status_display()),
                'status_code': str(record.status)
            })
            
        return JsonResponse({
            'success': True,
            'history': history
        })
    except Employee.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Employee not found'}, status=404)

def employees_without_face_api(request):
    """API to get all active employees with face registration status"""
    try:
        employees = Employee.objects.filter(
            is_active=True
        ).select_related('user').order_by('user__first_name', 'user__last_name')
        
        employee_list = []
        for emp in employees:
            employee_list.append({
                'employee_id': emp.employee_id,
                'full_name': emp.user.get_full_name(),
                'department': emp.department,
                'position': emp.position,
                'has_face': bool(emp.face_embeddings)
            })
        
        return JsonResponse({
            'success': True,
            'employees': employee_list
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
