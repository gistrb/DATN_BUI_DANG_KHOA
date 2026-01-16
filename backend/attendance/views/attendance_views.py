from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import threading
from ..models import Employee, AttendanceRecord
from .utils import get_vietnam_now, is_leaving_early, WORK_START_TIME
from .face_views import base64_to_image, get_processor
from .push_notification import send_attendance_notification


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
        result = get_processor().verify_face(image)
        

        
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
            },
            'time': now.strftime('%H:%M')
        })

    except Employee.DoesNotExist:
        return JsonResponse({'error': 'Không tìm thấy nhân viên trong hệ thống'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
