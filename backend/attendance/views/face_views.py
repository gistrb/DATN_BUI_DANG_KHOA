from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from ..models import Employee
from .utils import get_vietnam_now
import json
import numpy as np

# Helper to compute cosine similarity
def compute_similarity(embedding1, embedding2):
    # Setup for verification
    # embedding1: list or np array
    # embedding2: list or np array
    vec1 = np.array(embedding1)
    vec2 = np.array(embedding2)
    
    # Compute Cosine Similarity
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
        
    return np.dot(vec1, vec2) / (norm1 * norm2)

def find_matching_employee(input_embedding, threshold=0.75): # Increased for aligned faces
    employees = Employee.objects.filter(is_active=True, face_embeddings__isnull=False)
    
    # Debug: Log embedding dimensions
    print(f"[DEBUG] Input embedding length: {len(input_embedding)}")
    
    best_match = None
    max_score = 0
    
    for emp in employees:
        stored_embeddings = emp.get_face_embeddings() # Assuming this returns list of lists
        if not stored_embeddings:
            continue
        
        # Debug: Log stored embedding dimensions (first one only)
        if stored_embeddings:
            print(f"[DEBUG] Stored embedding for {emp.get_full_name()}: length={len(stored_embeddings[0])}")
            
        # Compare with all stored embeddings for this employee
        for stored_emb in stored_embeddings:
            score = compute_similarity(input_embedding, stored_emb)
            if score > max_score:
                max_score = score
                best_match = emp
                
    if max_score > threshold:
        return best_match, max_score
    return None, max_score

@csrf_exempt
def check_duplicate(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            embedding = data.get('embedding')
            
            if not embedding:
                return JsonResponse({'success': False, 'error': 'No embedding provided'}, status=400)
            
            existing_employee, score = find_matching_employee(embedding)
            
            if existing_employee:
                return JsonResponse({
                    'success': True,
                    'is_duplicate': True,
                    'employee_id': existing_employee.employee_id,
                    'employee_name': existing_employee.get_full_name(),
                    'score': float(score)
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

    if request.method == 'GET':
         employees = Employee.objects.filter(
            is_active=True,
            face_embeddings__isnull=True
        ).order_by('first_name', 'last_name')
         from django.shortcuts import render
         return render(request, 'attendance/register_face.html', {'employees': employees})

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            employee_id = data.get('employee_id')
            embeddings = data.get('embeddings', []) # Expecting list of embeddings
            
            # Legacy support if frontend sends 'images' - though we prefer embeddings
            if not embeddings and 'images' in data:
                 return JsonResponse({'error': 'Backend no longer supports image processing. Please update frontend.'}, status=400)

            if not embeddings:
                return JsonResponse({'error': 'Không có dữ liệu khuôn mặt (embeddings)'}, status=400)

            employee = Employee.objects.get(employee_id=employee_id)

            if employee.face_embeddings:
                return JsonResponse({
                    'error': 'Nhân viên này đã đăng ký khuôn mặt',
                    'details': 'Vui lòng chọn nhân viên khác'
                }, status=400)
            
            # Simple server-side duplicate check using the first embedding
            # (Optional: check all)
            first_embedding = embeddings[0]
            existing_emp, score = find_matching_employee(first_embedding)
             
            if existing_emp and existing_emp.employee_id != employee.employee_id:
                 return JsonResponse({
                    'error': f"Khuôn mặt này đã tồn tại trong hệ thống",
                    'details': f"Trùng với nhân viên: {existing_emp.get_full_name()} ({existing_emp.employee_id})"
                }, status=400)

            # Save embeddings
            # Ensure they are stored as list of lists
            employee.set_face_embeddings(embeddings)
            employee.save()

            now = get_vietnam_now()
            return JsonResponse({
                'success': True,
                'message': 'Đăng ký khuôn mặt thành công',
                'employee': {
                    'id': employee.employee_id,
                    'name': employee.get_full_name(),
                    'department': employee.department if hasattr(employee, 'department') else '',
                    'position': employee.position if hasattr(employee, 'position') else '',
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

@csrf_exempt
def delete_face(request):
    """API để xóa dữ liệu khuôn mặt"""
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({'error': 'Permission denied'}, status=403)
        
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            employee_id = data.get('employee_id')
            
            if not employee_id:
                return JsonResponse({'error': 'Missing employee_id'}, status=400)
                
            employee = Employee.objects.get(employee_id=employee_id)
            
            if not employee.face_embeddings:
                return JsonResponse({'error': 'Nhân viên chưa đăng ký khuôn mặt'}, status=400)
                
            employee.clear_face_embeddings()
            
            return JsonResponse({
                'success': True,
                'message': f'Đã xóa dữ liệu khuôn mặt của nhân viên {employee.get_full_name()}'
            })
            
        except Employee.DoesNotExist:
            return JsonResponse({'error': 'Không tìm thấy nhân viên'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
            
    return JsonResponse({'error': 'Method not allowed'}, status=405)
    
@csrf_exempt
def check_pose(request):
     # Deprecated or simple OK
     return JsonResponse({'success': True, 'message': 'Pose check moved to frontend'})
