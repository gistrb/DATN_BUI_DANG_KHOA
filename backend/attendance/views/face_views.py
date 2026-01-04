from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from ..models import Employee
from ..face_recognition.face_processor import get_face_processor
from .utils import get_vietnam_now
import json
import base64
import numpy as np
import cv2
import io
from PIL import Image

face_processor = get_face_processor()

def base64_to_image(base64_string):
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    image_bytes = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_bytes))
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

@csrf_exempt
def check_pose(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            image_data = data.get('image')
            
            if not image_data:
                return JsonResponse({'success': False, 'error': 'No image provided'}, status=400)
            
            image = base64_to_image(image_data)
            if image is None:
                return JsonResponse({'success': False, 'error': 'Invalid image data'}, status=400)
            
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
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def check_duplicate(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            image_data = data.get('image')
            
            if not image_data:
                return JsonResponse({'success': False, 'error': 'No image provided'}, status=400)
            
            image = base64_to_image(image_data)
            embedding = face_processor.get_face_embedding(image)
            
            if embedding is None:
                return JsonResponse({'success': False, 'error': 'No face detected'}, status=400)
            
            existing_face = face_processor.verify_face(embedding, check_liveness=False)
            
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
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def register_face(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    if not request.user.is_staff:
        return JsonResponse({'error': 'Permission denied'}, status=403)

    employees = Employee.objects.filter(
        is_active=True,
        face_embeddings__isnull=True
    ).order_by('user__first_name', 'user__last_name')

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            employee_id = data.get('employee_id')
            image_data_list = data.get('images', [])

            if not image_data_list:
                return JsonResponse({'error': 'Không có ảnh được cung cấp'}, status=400)

            employee = Employee.objects.get(employee_id=employee_id)

            if employee.face_embeddings:
                return JsonResponse({
                    'error': 'Nhân viên này đã đăng ký khuôn mặt',
                    'details': 'Vui lòng chọn nhân viên khác'
                }, status=400)

            embeddings = []
            checked_duplicate = False
            
            for image_data in image_data_list:
                image = base64_to_image(image_data)
                embedding = face_processor.get_face_embedding(image)
                
                if embedding is not None:
                    # Kiểm tra chất lượng ảnh
                    # Lấy bbox để tính diện tích khuôn mặt
                    faces = face_processor.app.get(image)
                    if faces:
                        bbox = faces[0].bbox
                        quality_check = face_processor.check_image_quality(image, bbox)
                        
                        if not quality_check['is_valid']:
                            return JsonResponse({
                                'error': 'Chất lượng ảnh không đạt yêu cầu',
                                'details': f"Ảnh thứ {len(embeddings)+1}: {quality_check['message']}"
                            }, status=400)

                    if not checked_duplicate:
                        existing_face = face_processor.verify_face(embedding, check_liveness=False)
                        if existing_face and existing_face['employee_id'] != employee.employee_id:
                            return JsonResponse({
                                'error': f"Khuôn mặt này đã tồn tại trong hệ thống",
                                'details': f"Trùng với nhân viên: {existing_face['full_name']} ({existing_face['employee_id']})"
                            }, status=400)
                        checked_duplicate = True
                    embeddings.append(embedding)

            if len(embeddings) < 10:
                return JsonResponse({
                    'error': f'Không đủ mẫu khuôn mặt hợp lệ. Chỉ nhận được {len(embeddings)}/20 mẫu'
                }, status=400)

            # Lưu embedding
            employee.set_face_embeddings(embeddings)
            employee.save()

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

    from django.shortcuts import render
    return render(request, 'attendance/register_face.html', {'employees': employees})
