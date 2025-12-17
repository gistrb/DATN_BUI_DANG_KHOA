from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LoginView
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.db.models import Count
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from calendar import monthrange
import calendar
from .models import Employee, AttendanceRecord, Department
from .face_recognition.face_processor import FaceProcessor
import json
import base64
import numpy as np
import cv2
import io
from PIL import Image

face_processor = FaceProcessor()

class CustomLoginView(LoginView):
    """Custom login view to add success message"""
    def form_valid(self, form):
        messages.success(self.request, f'Chào mừng {form.get_user().get_full_name() or form.get_user().username}! Đăng nhập thành công.')
        return super().form_valid(form)


# Định nghĩa thời gian làm việc (múi giờ Việt Nam)
WORK_START_TIME = time(8, 30)  # 8:30 sáng
WORK_END_TIME = time(17, 30)   # 5:30 chiều
LUNCH_START = time(12, 0)      # 12:00 trưa
LUNCH_END = time(13, 30)       # 13:30 chiều
EARLY_THRESHOLD = timedelta(hours=1)  # Về sớm hơn 1 tiếng so với giờ tan ca

def get_vietnam_now():
    """Lấy thời gian hiện tại theo múi giờ Việt Nam"""
    return timezone.localtime(timezone.now(), timezone=ZoneInfo('Asia/Ho_Chi_Minh'))

def is_leaving_early(check_out_time):
    """Kiểm tra xem thời gian check-out có được tính là về sớm không"""
    # Nếu check-out trước giờ nghỉ trưa
    if check_out_time.time() < LUNCH_START:
        return True

    # Nếu check-out trong giờ nghỉ trưa
    if LUNCH_START <= check_out_time.time() <= LUNCH_END:
        return False  # Có thể là ra về ăn trưa

    # Nếu check-out sau giờ nghỉ trưa nhưng sớm hơn giờ tan ca 1 tiếng
    end_time = datetime.combine(check_out_time.date(), WORK_END_TIME)
    end_time = timezone.make_aware(end_time, timezone=ZoneInfo('Asia/Ho_Chi_Minh'))
    if check_out_time < end_time - EARLY_THRESHOLD:
        return True

    return False

@login_required
def dashboard(request):
    """Dashboard view hiển thị thống kê chấm công"""
    vietnam_now = get_vietnam_now()

    # Thống kê tổng quát về nhân viên
    company_stats = {
        'total_employees': Employee.objects.count(),
        'working': Employee.objects.filter(work_status='WORKING').count(),
        'on_leave': Employee.objects.filter(work_status='ON_LEAVE').count(),
        'terminated': Employee.objects.filter(work_status='TERMINATED').count(),

        # Thống kê trạng thái hiện tại
        'in_office': Employee.objects.filter(current_status='IN_OFFICE', work_status='WORKING').count(),
        'out_office': Employee.objects.filter(current_status='OUT_OFFICE', work_status='WORKING').count(),
        'not_in': Employee.objects.filter(current_status='NOT_IN', work_status='WORKING').count(),
    }

    personal_stats = None
    recent_history = None

    if request.user.is_staff:
        # Lấy nhân viên có hoạt động chấm công gần đây (hôm nay hoặc hôm qua)
        yesterday = vietnam_now.date() - timedelta(days=1)
        recent_records = AttendanceRecord.objects.filter(
            date__gte=yesterday
        ).select_related('employee', 'employee__user').order_by('-check_in_time')
        
        # Lấy danh sách employee_id đã chấm công gần đây
        recent_employee_ids = recent_records.values_list('employee_id', flat=True).distinct()
        
        # Lấy thông tin nhân viên có hoạt động gần đây, sắp xếp theo thời gian check-in mới nhất
        employees = Employee.objects.filter(
            id__in=recent_employee_ids
        ).select_related('user')
        
        # Sắp xếp employees theo thứ tự check-in time mới nhất
        employee_order = {emp_id: idx for idx, emp_id in enumerate(recent_employee_ids)}
        employees = sorted(employees, key=lambda e: employee_order.get(e.id, 999))
    else:
        employee = Employee.objects.get(user=request.user)
        today_records = AttendanceRecord.objects.filter(
            employee=employee,
            date=vietnam_now.date()
        )
        employees = [employee]
        
        # Tính toán thống kê cá nhân cho tháng hiện tại
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
        
        # Lấy lịch sử 5 lần chấm công gần nhất
        recent_history = AttendanceRecord.objects.filter(employee=employee).order_by('-date')[:5]

        # Xử lý dữ liệu lịch chấm công tháng hiện tại
        cal = calendar.monthcalendar(vietnam_now.year, vietnam_now.month)
        calendar_data = []
        
        # Tạo dictionary map ngày -> trạng thái
        attendance_map = {
            record.date.day: record.status 
            for record in month_records
        }

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

    # Add department_id to employees for linking in template (only for staff view where we list employees)
    if request.user.is_staff:
        # Convert QuerySet to list to allow attribute assignment
        employees = list(employees)
        dept_map = {d.name: d.id for d in Department.objects.all()}
        for emp in employees:
            emp.department_id = dept_map.get(emp.department)

    context = {
        'current_time': vietnam_now,
        'company_stats': company_stats,
        'employees': employees,
        'personal_stats': personal_stats,
        'calendar_data': calendar_data if not request.user.is_staff else None,
        'total_departments': Department.objects.count(),
    }
    return render(request, 'attendance/dashboard.html', context)

def face_check(request):
    """View cho trang chấm công bằng khuôn mặt (không cần đăng nhập)"""
    return render(request, 'attendance/face_check.html')

def base64_to_image(base64_string):
    """Chuyển đổi base64 thành numpy array image"""
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    image_bytes = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_bytes))
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

@csrf_exempt
def check_pose(request):
    """API endpoint kiểm tra tư thế khuôn mặt"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            image_data = data.get('image')
            
            if not image_data:
                return JsonResponse({'success': False, 'error': 'No image provided'}, status=400)
            
            # Chuyển base64 thành image
            image = base64_to_image(image_data)
            if image is None:
                return JsonResponse({'success': False, 'error': 'Invalid image data'}, status=400)
            
            # Phát hiện tư thế
            pose_info = face_processor.detect_pose(image)
            
            if pose_info:
                return JsonResponse({
                    'success': True,
                    'yaw': pose_info['yaw'],
                    'pitch': pose_info['pitch'],
                    'roll': pose_info['roll'],
                    'pose_type': pose_info['pose_type'],
                    'bbox': pose_info['bbox']
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error': 'No face detected or pose not supported'
                }, status=400)
                
        except Exception as e:
            print(f"[check_pose] Error: {e}")
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def check_duplicate(request):
    """API endpoint kiểm tra khuôn mặt trùng lặp"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            image_data = data.get('image')
            
            if not image_data:
                return JsonResponse({'success': False, 'error': 'No image provided'}, status=400)
            
            # Chuyển base64 thành image
            image = base64_to_image(image_data)
            embedding = face_processor.get_face_embedding(image)
            
            if embedding is None:
                return JsonResponse({'success': False, 'error': 'No face detected'}, status=400)
            
            # Kiểm tra trùng lặp
            existing_face = face_processor.verify_face(embedding)
            
            if existing_face:
                return JsonResponse({
                    'success': True,
                    'is_duplicate': True,
                    'employee_id': existing_face['employee_id'],
                    'employee_name': existing_face['full_name']
                })
            else:
                return JsonResponse({
                    'success': True,
                    'is_duplicate': False
                })
                
        except Exception as e:
            print(f"[check_duplicate] Error: {e}")
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
# @login_required  <-- Commented out to debug/handle API requests better
def register_face(request):
    """API endpoint đăng ký khuôn mặt với nhiều mẫu"""
    print(f"DEBUG: register_face called. User: {request.user}, Is Authenticated: {request.user.is_authenticated}")
    
    # Check login manually for API
    if not request.user.is_authenticated:
         # Try to see if there's any session info provided?
         print("DEBUG: User is NOT authenticated. Cookies:", request.COOKIES)
         return JsonResponse({'error': 'Authentication required. Please login again.'}, status=401)
    
    if not request.user.is_staff:
        print("DEBUG: Permission denied. User is not staff.")
        return JsonResponse({'error': 'Permission denied'}, status=403)

    # Lấy danh sách nhân viên chưa có face_embeddings và đang active
    employees = Employee.objects.filter(
        is_active=True,
        face_embeddings__isnull=True  # Chỉ lấy nhân viên chưa có embeddings
    ).order_by('user__first_name', 'user__last_name')

    if request.method == 'POST':
        try:
            print("DEBUG: Processing POST request")
            data = json.loads(request.body)
            employee_id = data.get('employee_id')
            image_data_list = data.get('images', [])
            print(f"DEBUG: Data received. Employee ID: {employee_id}, Image count: {len(image_data_list)}")

            if not image_data_list:
                return JsonResponse({'error': 'Không có ảnh được cung cấp'}, status=400)

            employee = Employee.objects.get(employee_id=employee_id)

            # Kiểm tra xem nhân viên đã có embeddings chưa
            if employee.face_embeddings:
                return JsonResponse({
                    'error': 'Nhân viên này đã đăng ký khuôn mặt',
                    'details': 'Vui lòng chọn nhân viên khác'
                }, status=400)

            # Xử lý từng ảnh và lấy embeddings
            embeddings = []
            checked_duplicate = False
            
            for image_data in image_data_list:
                image = base64_to_image(image_data)
                embedding = face_processor.get_face_embedding(image)
                
                if embedding is not None:
                    # Kiểm tra trùng lặp với khuôn mặt đầu tiên hợp lệ
                    if not checked_duplicate:
                        existing_face = face_processor.verify_face(embedding)
                        if existing_face and existing_face['employee_id'] != employee.employee_id:
                            return JsonResponse({
                                'error': f"Khuôn mặt này đã tồn tại trong hệ thống",
                                'details': f"Trùng với nhân viên: {existing_face['full_name']} ({existing_face['employee_id']})"
                            }, status=400)
                        checked_duplicate = True
                        
                    embeddings.append(embedding)

            if len(embeddings) < 10:  # Yêu cầu ít nhất 10 mẫu thành công
                return JsonResponse({
                    'error': f'Không đủ mẫu khuôn mặt hợp lệ. Chỉ nhận được {len(embeddings)}/20 mẫu'
                }, status=400)

            # Lưu tất cả embeddings
            employee.set_face_embeddings(embeddings)
            employee.save()

            # Trả về thông tin chi tiết
            now = get_vietnam_now()
            return JsonResponse({
                'success': True,
                'message': 'Đăng ký khuôn mặt thành công',
                'employee': {
                    'id': employee.employee_id,
                    'name': employee.user.get_full_name(),
                    'department': employee.department,
                    'position': employee.position,
                },
                'samples_count': len(embeddings),
                'timestamp': now.strftime('%d/%m/%Y %H:%M:%S')
            })

        except Employee.DoesNotExist:
            return JsonResponse({
                'error': 'Không tìm thấy nhân viên',
                'details': 'Vui lòng kiểm tra lại mã nhân viên'
            }, status=404)
        except Exception as e:
            return JsonResponse({
                'error': 'Lỗi khi xử lý đăng ký',
                'details': str(e)
            }, status=500)

    return render(request, 'attendance/register_face.html', {'employees': employees})

@csrf_exempt
def process_attendance(request):
    """API endpoint xử lý chấm công với nhiều mẫu"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        data = json.loads(request.body)
        image_data = data.get('image')
        if not image_data:
            return JsonResponse({'error': 'No image data'}, status=400)

        # Chuyển đổi ảnh và lấy embedding
        image = base64_to_image(image_data)

        # Nhận diện khuôn mặt và lấy thông tin nhân viên
        result = face_processor.verify_face(image)
        if result is None:
            return JsonResponse({
                'error': 'Không nhận diện được nhân viên hoặc nhân viên không trong trạng thái làm việc'
            }, status=400)

        # Lấy nhân viên từ database
        employee = Employee.objects.get(employee_id=result['employee_id'])

        # Kiểm tra trạng thái làm việc
        if employee.work_status != 'WORKING':
            return JsonResponse({
                'error': f"Nhân viên {result['full_name']} ({result['work_status']}) không trong trạng thái làm việc"
            }, status=400)

        # Xử lý chấm công với múi giờ Việt Nam
        now = get_vietnam_now()

        # Kiểm tra trạng thái hiện tại của nhân viên để xác định check-in hay check-out
        is_checking_in = employee.current_status in ['NOT_IN', 'OUT_OFFICE']

        # Lấy hoặc tạo bản ghi chấm công cho ngày hiện tại
        record, created = AttendanceRecord.objects.get_or_create(
            employee=employee,
            date=now.date()
        )

        current_time = now.time()
        status_message = ""

        if is_checking_in:
            # Xử lý check-in
            record.check_in_time = now
            if current_time <= WORK_START_TIME:
                record.status = 'ON_TIME'
                status_message = "Chấm công vào ca thành công (Đúng giờ)"
            else:
                record.status = 'LATE'
                status_message = "Chấm công vào ca thành công (Đi muộn)"
            employee.current_status = 'IN_OFFICE'
        else:
            # Xử lý check-out
            record.check_out_time = now
            if is_leaving_early(now):
                record.status = 'EARLY'
                status_message = "Chấm công ra ca thành công (Về sớm)"
            else:
                status_message = "Chấm công ra ca thành công"
            employee.current_status = 'OUT_OFFICE'

        # Lưu bản ghi chấm công và cập nhật trạng thái nhân viên
        record.save()
        employee.save()

        # Trả về thông tin nhân viên và kết quả chấm công
        return JsonResponse({
            'success': True,
            'message': status_message,
            'employee': {
                'id': result['employee_id'],
                'name': result['full_name'],
                'department': result['department'],
                'position': result['position'],
                'similarity': f"{result['similarity_score']:.2%}",
                'current_status': employee.get_current_status_display(),
                'bbox': result.get('bbox')
            },
            'attendance': {
                'date': now.strftime('%d/%m/%Y'),
                'check_in': record.check_in_time.isoformat() if record.check_in_time else None,
                'check_out': record.check_out_time.isoformat() if record.check_out_time else None,
                'status': record.get_status_display()
            }
        })

    except Employee.DoesNotExist:
        return JsonResponse({'error': 'Không tìm thấy nhân viên trong hệ thống'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def employee_detail(request, employee_id):
    """View hiển thị chi tiết thông tin nhân viên và thống kê chấm công"""
    # Kiểm tra quyền truy cập
    if not request.user.is_staff and request.user.employee.employee_id != employee_id:
        return redirect('attendance:dashboard')

    employee = get_object_or_404(Employee, employee_id=employee_id)
    now = get_vietnam_now()

    # Lấy ngày đầu và cuối của tháng hiện tại
    _, last_day = monthrange(now.year, now.month)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_end = now.replace(day=last_day, hour=23, minute=59, second=59, microsecond=999999)

    # Lấy tất cả bản ghi chấm công trong tháng
    attendance_records = AttendanceRecord.objects.filter(
        employee=employee,
        date__range=[month_start.date(), month_end.date()]
    ).order_by('-date')

    # Tính toán thống kê
    stats = {
        'on_time': attendance_records.filter(status='ON_TIME').count(),
        'late': attendance_records.filter(status='LATE').count(),
        'early': attendance_records.filter(status='EARLY').count(),
    }

    # Thống kê theo ngày trong tuần
    weekday_stats = {
        'on_time': [0] * 7,
        'late': [0] * 7,
        'early': [0] * 7
    }

    for record in attendance_records:
        weekday = record.date.weekday()
        if record.status == 'ON_TIME':
            weekday_stats['on_time'][weekday] += 1
        elif record.status == 'LATE':
            weekday_stats['late'][weekday] += 1
        elif record.status == 'EARLY':
            weekday_stats['early'][weekday] += 1

    context = {
        'employee': employee,
        'attendance_records': attendance_records,
        'stats': stats,
        'weekday_stats': weekday_stats,
        'current_month': now,
    }

    return render(request, 'attendance/employee_detail.html', context)
# Department CRUD Views
@login_required
def department_list(request):
    """Danh sách phòng ban"""
    if not request.user.is_staff:
        messages.error(request, 'Bạn không có quyền truy cập trang này.')
        return redirect('attendance:dashboard')
    
    departments = Department.objects.all().order_by('name')
    return render(request, 'attendance/department_list.html', {'departments': departments})

@login_required
def department_create(request):
    """Tạo phòng ban mới"""
    if not request.user.is_staff:
        messages.error(request, 'Bạn không có quyền truy cập trang này.')
        return redirect('attendance:dashboard')
    
    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description', '')
        
        if not name:
            messages.error(request, 'Tên phòng ban không được để trống.')
            return render(request, 'attendance/department_form.html')
        
        # Check if department already exists
        if Department.objects.filter(name=name).exists():
            messages.error(request, f'Phòng ban "{name}" đã tồn tại.')
            return render(request, 'attendance/department_form.html')
        
        Department.objects.create(name=name, description=description)
        messages.success(request, f'Đã tạo phòng ban "{name}" thành công.')
        return redirect('attendance:department_list')
    
    return render(request, 'attendance/department_form.html')

@login_required
def department_update(request, pk):
    """Cập nhật phòng ban"""
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
        
        # Check if name is taken by another department
        if Department.objects.filter(name=name).exclude(pk=pk).exists():
            messages.error(request, f'Phòng ban "{name}" đã tồn tại.')
            return render(request, 'attendance/department_form.html', {'department': department})
        
        # Update employees if department name changed
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
    """Xóa phòng ban"""
    if not request.user.is_staff:
        messages.error(request, 'Bạn không có quyền truy cập trang này.')
        return redirect('attendance:dashboard')
    
    department = get_object_or_404(Department, pk=pk)
    
    if request.method == 'POST':
        dept_name = department.name
        # Update employees to "Chưa phân công" before deleting department
        Employee.objects.filter(department=dept_name).update(department='Chưa phân công')
        department.delete()
        messages.success(request, f'Đã xóa phòng ban "{dept_name}" thành công.')
        return redirect('attendance:department_list')
    
    return render(request, 'attendance/department_confirm_delete.html', {'department': department})
# Employee Management View
@login_required
def employee_list(request):
    """Danh sách quản lý nhân viên"""
    if not request.user.is_staff:
        messages.error(request, 'Bạn không có quyền truy cập trang này.')
        return redirect('attendance:dashboard')
    
    employees = Employee.objects.select_related('user').all().order_by('employee_id')
    
    # Get unique departments for filter
    departments = Employee.objects.values_list('department', flat=True).distinct().order_by('department')
    
    # Statistics
    total_employees = employees.count()
    working_count = employees.filter(work_status='WORKING').count()
    on_leave_count = employees.filter(work_status='ON_LEAVE').count()
    terminated_count = employees.filter(work_status='TERMINATED').count()
    
    context = {
        'employees': employees,
        'departments': departments,
        'total_employees': total_employees,
        'working_count': working_count,
        'on_leave_count': on_leave_count,
        'terminated_count': terminated_count,
    }
    
    return render(request, 'attendance/employee_list.html', context)

@login_required
def employee_create(request):
    """Tạo nhân viên mới"""
    if not request.user.is_staff:
        messages.error(request, 'Bạn không có quyền truy cập trang này.')
        return redirect('attendance:dashboard')
    
    if request.method == 'POST':
        from .forms import EmployeeCreationForm
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
            # Form có lỗi validation
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f'{form.fields.get(field).label if field != "__all__" else ""}: {error}')
    else:
        from .forms import EmployeeCreationForm
        form = EmployeeCreationForm()
    
    return render(request, 'attendance/employee_form.html', {'form': form})

# Department Detail View
@login_required
def department_detail(request, pk):
    """Chi tiết phòng ban và danh sách nhân viên"""
    if not request.user.is_staff:
        messages.error(request, 'Bạn không có quyền truy cập trang này.')
        return redirect('attendance:dashboard')
    
    department = get_object_or_404(Department, pk=pk)
    employees = Employee.objects.filter(department=department.name).select_related('user').order_by('employee_id')
    
    # Statistics
    total_employees = employees.count()
    working_count = employees.filter(work_status='WORKING').count()
    on_leave_count = employees.filter(work_status='ON_LEAVE').count()
    terminated_count = employees.filter(work_status='TERMINATED').count()
    
    context = {
        'department': department,
        'employees': employees,
        'total_employees': total_employees,
        'working_count': working_count,
        'on_leave_count': on_leave_count,
        'terminated_count': terminated_count,
    }
    
    return render(request, 'attendance/department_detail.html', context)
