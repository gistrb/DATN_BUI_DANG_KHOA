from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import threading
from ..models import Employee, AttendanceRecord
from .utils import get_vietnam_now, is_leaving_early, WORK_START_TIME
from .face_views import find_matching_employee
from .push_notification import send_attendance_notification


@csrf_exempt
def process_attendance(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        data = json.loads(request.body)
        embedding = data.get('embedding')
        
        if not embedding:
            return JsonResponse({'error': 'No embedding data provided'}, status=400)

        employee, score = find_matching_employee(embedding)
        
        if employee:
            print(f"[ATTENDANCE] Match found: {employee.get_full_name()} | Similarity: {score:.4f}")
        else:
            print(f"[ATTENDANCE] No match found | Best score: {score:.4f}")
        
        if not employee:
            return JsonResponse({
                'error': 'Không nhận diện được nhân viên hoặc nhân viên không trong trạng thái làm việc'
            }, status=400)

        if employee.work_status != 'WORKING':
            return JsonResponse({
                'error': f"Nhân viên {employee.get_full_name()} ({employee.work_status}) không trong trạng thái làm việc"
            }, status=400)

        now = get_vietnam_now()

        record, created = AttendanceRecord.objects.get_or_create(
            employee=employee,
            date=now.date()
        )

        current_time = now.time()
        status_message = ""

        is_first_scan = record.check_in_time is None

        if is_first_scan:
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
                check_in_local = record.check_in_time.astimezone(now.tzinfo)
                if check_in_local.time() > WORK_START_TIME:
                    record.status = 'LATE'
                else:
                    record.status = 'ON_TIME'
                status_message = "Chấm công ra ca thành công (Đúng giờ)"
            employee.current_status = 'OUT_OFFICE'

        record.save()
        employee.save()

        time_str = now.strftime('%H:%M')
        threading.Thread(
            target=send_attendance_notification,
            args=(employee, is_first_scan, time_str),
            daemon=True
        ).start()

        return JsonResponse({
            'success': True,
            'message': status_message,
            'employee': {
                'id': employee.employee_id,
                'name': employee.get_full_name(),
                'department': str(employee.department) if employee.department else '',
                'position': str(employee.position) if employee.position else '',
                'similarity': f"{score:.2%}",
                'current_status': employee.get_current_status_display(),
            },
            'attendance': {
                'date': now.strftime('%d/%m/%Y'),
                'check_in': record.check_in_time.isoformat() if record.check_in_time else None,
                'check_out': record.check_out_time.isoformat() if record.check_out_time else None,
                'status': record.get_status_display()
            },
            'time': now.strftime('%H:%M')
        })

    except Employee.DoesNotExist:
        return JsonResponse({'error': 'Không tìm thấy nhân viên trong hệ thống'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
