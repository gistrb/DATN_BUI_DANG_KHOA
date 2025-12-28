from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from calendar import monthrange
import calendar
import json
import threading
from ..models import Employee, AttendanceRecord
from ..face_recognition.face_processor import FaceProcessor
from .utils import get_vietnam_now, is_leaving_early, WORK_START_TIME
from .face_views import base64_to_image
from .push_notification import send_attendance_notification

face_processor = FaceProcessor()

def face_check(request):
    return render(request, 'attendance/face_check.html')

@csrf_exempt
def process_attendance(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        data = json.loads(request.body)
        image_data = data.get('image')
        if not image_data:
            return JsonResponse({'error': 'No image data'}, status=400)

        image = base64_to_image(image_data)
        # Tạm tắt liveness check để debug (check_liveness=False)
        result = face_processor.verify_face(image, check_liveness=True)
        
        # Kiểm tra nếu phát hiện giả mạo (liveness check)
        if result and 'error' in result and result['error'] == 'spoof_detected':
            return JsonResponse({
                'error': result['message'],
                'error_type': 'spoof_detected',
                'liveness_score': result.get('liveness_score', 0),
                'liveness_message': result.get('liveness_message', '')
            }, status=400)
        
        if result is None:
            return JsonResponse({
                'error': 'Không nhận diện được nhân viên hoặc nhân viên không trong trạng thái làm việc'
            }, status=400)

        employee = Employee.objects.get(employee_id=result['employee_id'])

        if employee.work_status != 'WORKING':
            return JsonResponse({
                'error': f"Nhân viên {result['full_name']} ({result['work_status']}) không trong trạng thái làm việc"
            }, status=400)

        now = get_vietnam_now()
        is_checking_in = employee.current_status in ['NOT_IN', 'OUT_OFFICE']

        record, created = AttendanceRecord.objects.get_or_create(
            employee=employee,
            date=now.date()
        )

        current_time = now.time()
        status_message = ""

        if is_checking_in:
            record.check_in_time = now
            if current_time <= WORK_START_TIME:
                record.status = 'ON_TIME'
                status_message = "Chấm công vào ca thành công (Đúng giờ)"
            else:
                record.status = 'LATE'
                status_message = "Chấm công vào ca thành công (Đi muộn)"
            employee.current_status = 'IN_OFFICE'
        else:
            record.check_out_time = now
            if is_leaving_early(now):
                record.status = 'EARLY'
                status_message = "Chấm công ra ca thành công (Về sớm)"
            else:
                status_message = "Chấm công ra ca thành công"
            employee.current_status = 'OUT_OFFICE'

        record.save()
        employee.save()

        # Send push notification to mobile app (async - không chờ response)
        time_str = now.strftime('%H:%M')
        threading.Thread(
            target=send_attendance_notification,
            args=(employee, is_checking_in, time_str),
            daemon=True
        ).start()

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
    if not request.user.is_staff and request.user.employee.employee_id != employee_id:
        from django.shortcuts import redirect
        return redirect('attendance:dashboard')

    employee = get_object_or_404(Employee, employee_id=employee_id)
    now = get_vietnam_now()

    _, last_day = monthrange(now.year, now.month)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_end = now.replace(day=last_day, hour=23, minute=59, second=59, microsecond=999999)

    attendance_records = AttendanceRecord.objects.filter(
        employee=employee,
        date__range=[month_start.date(), month_end.date()]
    ).order_by('-date')

    stats = {
        'on_time': attendance_records.filter(status='ON_TIME').count(),
        'late': attendance_records.filter(status='LATE').count(),
        'early': attendance_records.filter(status='EARLY').count(),
    }

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
