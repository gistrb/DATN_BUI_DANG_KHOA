import cv2
import numpy as np
from insightface.app import FaceAnalysis
from typing import Optional, List, Tuple, Union, Dict, Any
import os

_face_processor_instance = None

def get_face_processor():
    global _face_processor_instance
    if _face_processor_instance is None:
        _face_processor_instance = FaceProcessor()
    return _face_processor_instance

class FaceProcessor:
    def __init__(self):
        self.app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
        self.app.prepare(ctx_id=0, det_size=(640, 640))

        self.similarity_threshold = 0.75
        
        self.min_face_size = (64, 64)
        
        self.top_k = 3
        
        self.cosine_weight = 1.0
        self.l2_weight = 0.0
        
        print("[FaceProcessor] Initialized with buffalo_l model")

    def enhance_image(self, image: np.ndarray) -> np.ndarray:
        """
        Cải thiện chất lượng ảnh
        Hiện tại: Trả về ảnh gốc để đảm bảo độ chính xác của model buffalo_l
        """
        return image



    def compute_top_k_similarity(self, query_embedding: np.ndarray,stored_embeddings: list, k: int = None) -> float:

        if not stored_embeddings:
            return 0.0
        
        # Debug: In thông tin embedding (đã disable)
        # print(f"[compute_similarity] Query embedding shape: {query_embedding.shape}...")
        
        # Tính similarity với tất cả embeddings
        similarities = [self.compare_embeddings(query_embedding, emb) 
                       for emb in stored_embeddings]
        
        # Sử dụng MAX thay vì weighted average
        # Vì khi đăng ký nhiều góc (front/left/right/up/down), 
        # chỉ cần 1 góc match tốt là đủ để xác nhận
        return max(similarities)

    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        if image is None:
            return None
        if not isinstance(image, np.ndarray):
            return None
        if image.ndim != 3 or image.shape[2] != 3:
            return None
        return image

    def extract_embedding(self, image: np.ndarray, use_enhancement: bool = True) -> Optional[np.ndarray]:

        try:
            # Áp dụng image enhancement để tăng độ chính xác
            if use_enhancement:
                processed_image = self.enhance_image(image)
            else:
                processed_image = image
            
            # InsightFace yêu cầu ảnh BGR (OpenCV format)
            faces = self.app.get(processed_image)
            
            # Nếu không tìm thấy face với ảnh enhanced, thử lại với ảnh gốc
            if not faces and use_enhancement:
                print("[extract_embedding] Thử lại với ảnh gốc...")
                faces = self.app.get(image)
            
            if not faces:
                return None
            
            # Lấy khuôn mặt lớn nhất
            faces = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]), reverse=True)
            face = faces[0]
            
            embedding = face.embedding
            
            # Chuẩn hóa embedding (L2 normalization)
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
                
            return embedding.astype('float32')

        except Exception as e:
            print(f"[extract_embedding] Lỗi: {e}")
            return None

    def cosine_similarity(self, emb1: np.ndarray, emb2: np.ndarray) -> float:

        try:
            emb1 = np.array(emb1).flatten()
            emb2 = np.array(emb2).flatten()
            dot_product = np.dot(emb1, emb2)
            norm1 = np.linalg.norm(emb1)
            norm2 = np.linalg.norm(emb2)
            if norm1 == 0 or norm2 == 0:
                return 0.0
            return float(np.clip(dot_product / (norm1 * norm2), -1.0, 1.0))
        except:
            return 0.0

    def l2_distance(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        """L2 (Euclidean) Distance: 0 = giống hoàn toàn"""
        try:
            emb1 = np.array(emb1).flatten()
            emb2 = np.array(emb2).flatten()
            return float(np.linalg.norm(emb1 - emb2))
        except:
            return 2.0  # Max distance for normalized vectors

    def compare_embeddings(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:

        return self.cosine_similarity(embedding1, embedding2)

    def check_image_quality(self, image: np.ndarray, face_bbox: List[float]) -> Dict[str, Any]:

        try:
            # Chuyển sang grayscale để tính toán
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # 1. Tính độ sáng trung bình
            brightness = np.mean(gray)
            
            # 2. Tính kích thước khuôn mặt
            x1, y1, x2, y2 = face_bbox
            face_width = x2 - x1
            face_height = y2 - y1
            face_area = face_width * face_height
            
            # 3. Tính độ nét (Laplacian variance)
            # Giá trị cao = ảnh nét, giá trị thấp = ảnh mờ
            face_region = gray[int(y1):int(y2), int(x1):int(x2)]
            if face_region.size > 0:
                blur_score = cv2.Laplacian(face_region, cv2.CV_64F).var()
            else:
                blur_score = 0
            
            # Tiêu chuẩn chất lượng:
            # - Độ sáng: 50-220 (tránh quá tối hoặc quá sáng)
            # - Diện tích khuôn mặt: > 10000 pixels
            # - Độ nét: > 100 (Laplacian variance)
            is_bright_enough = 50 < brightness < 220
            is_face_large_enough = face_area > 10000
            is_sharp_enough = blur_score > 100
            
            is_valid = is_bright_enough and is_face_large_enough and is_sharp_enough
            
            # Tạo thông báo chi tiết
            if not is_valid:
                issues = []
                if not is_bright_enough:
                    if brightness <= 50:
                        issues.append("Ảnh quá tối")
                    else:
                        issues.append("Ảnh quá sáng")
                if not is_face_large_enough:
                    issues.append("Khuôn mặt quá nhỏ")
                if not is_sharp_enough:
                    issues.append("Ảnh bị mờ")
                message = ", ".join(issues)
            else:
                message = "Chất lượng tốt"
            
            return {
                'is_valid': is_valid,
                'brightness': float(brightness),
                'face_area': float(face_area),
                'blur_score': float(blur_score),
                'message': message
            }
            
        except Exception as e:
            print(f"[check_image_quality] Lỗi: {e}")
            return {
                'is_valid': False,
                'brightness': 0,
                'face_area': 0,
                'blur_score': 0,
                'message': f'Lỗi kiểm tra chất lượng: {str(e)}'
            }

    def detect_pose(self, image: np.ndarray) -> Optional[Dict[str, Any]]:

        try:
            faces = self.app.get(image)
            if not faces:
                return None
            
            # Lấy khuôn mặt lớn nhất
            faces = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]), reverse=True)
            face = faces[0]
            
            # InsightFace cung cấp pose - đã là degrees rồi, KHÔNG cần convert
            if hasattr(face, 'pose') and face.pose is not None:
                # InsightFace's pose có thể có thứ tự khác!
                # Thử nghiệm: hoán đổi và đảo dấu
                raw_0 = float(face.pose[0])
                raw_1 = float(face.pose[1])
                raw_2 = float(face.pose[2])
                
                # Dựa trên feedback: yaw và pitch bị hoán đổi + đảo dấu
                # pitch ở index 0, yaw ở index 1
                pitch_raw = raw_0   # KHÔNG đảo dấu pitch (đã test)
                yaw_raw = -raw_1    # Đảo dấu yaw
                roll_raw = raw_2
                
                # Normalize về khoảng -180 đến 180
                def normalize_angle(angle):
                    """Normalize góc về khoảng -180 đến 180"""
                    while angle > 180:
                        angle -= 360
                    while angle < -180:
                        angle += 360
                    return angle
                
                yaw = normalize_angle(yaw_raw)
                pitch = normalize_angle(pitch_raw)
                roll = normalize_angle(roll_raw)
                
                print(f"[detect_pose] Raw [0]={raw_0:.2f}, [1]={raw_1:.2f}, [2]={raw_2:.2f}")
                print(f"[detect_pose] After swap+flip: yaw={yaw:.2f}°, pitch={pitch:.2f}°, roll={roll:.2f}°")
            else:
                # Nếu model không hỗ trợ pose, trả về front
                print("[detect_pose] Model không hỗ trợ pose detection - sử dụng phương pháp dự phòng")
                return {
                    'yaw': 0.0,
                    'pitch': 0.0,
                    'roll': 0.0,
                    'pose_type': 'front',
                    'bbox': [int(x) for x in face.bbox]
                }
            
            # Phân loại tư thế
            pose_type = self._classify_pose(yaw, pitch)
            print(f"[detect_pose] Classified as: {pose_type}")
            
            return {
                'yaw': float(yaw),
                'pitch': float(pitch),
                'roll': float(roll),
                'pose_type': pose_type,
                'bbox': [int(x) for x in face.bbox]
            }
            
        except Exception as e:
            print(f"[detect_pose] Lỗi: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def _classify_pose(self, yaw: float, pitch: float) -> str:

        if abs(yaw) > 20:  # Nếu xoay trái/phải rõ ràng
            if yaw < -20:
                return 'left'    # Xoay trái
            elif yaw > 20:
                return 'right'   # Xoay phải
        
        # Sau đó mới kiểm tra pitch (lên/xuống)
        if abs(pitch) > 20:  # Nếu ngẩng/cúi rõ ràng
            if pitch > 20:
                return 'up'      # Ngẩng đầu
            elif pitch < -20:
                return 'down'    # Cúi đầu
        
        # Nếu cả yaw và pitch đều nhỏ → chính diện
        return 'front'

    def _validate_image(self, image: np.ndarray) -> bool:
        if image is None:
            return False
        if not isinstance(image, np.ndarray):
            return False
        if image.ndim != 3 or image.shape[2] != 3:
            return False
        if image.size == 0:
            return False
        return True

    def register_face(self, image: np.ndarray, employee_id: int) -> bool:
        """Đăng ký khuôn mặt mới cho nhân viên"""
        print(f"[register_face] Bắt đầu đăng ký cho nhân viên: {employee_id}")

        embedding = self.extract_embedding(image)
        if embedding is None:
            print("[register_face] Không trích xuất được embedding.")
            return False

        if not self.save_embedding_to_db(employee_id, embedding):
            return False

        print(f"[register_face] Đăng ký thành công cho nhân viên {employee_id}")
        return True

    def verify_face(self, image: np.ndarray, stored_embeddings: List[np.ndarray] = None) -> Optional[Dict[str, Any]]:
        
        query_embedding = None
        bbox = None

        # Kiểm tra xem đầu vào là ảnh hay embedding
        if isinstance(image, np.ndarray) and image.ndim == 3:
            # Nếu là ảnh, áp dụng enhancement và lấy embedding
            try:
                # Áp dụng image enhancement để tăng độ chính xác
                enhanced_image = self.enhance_image(image)
                
                faces = self.app.get(enhanced_image)
                
                # Fallback: thử lại với ảnh gốc nếu không detect được
                if not faces:
                    print("[verify_face] Thử lại với ảnh gốc...")
                    faces = self.app.get(image)
                
                if not faces:
                    return None
                
                # Lấy khuôn mặt lớn nhất
                faces = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]), reverse=True)
                face = faces[0]
                
                # Lấy bbox (convert to list of int)
                bbox = [int(x) for x in face.bbox]
                
                embedding = face.embedding
                norm = np.linalg.norm(embedding)
                if norm > 0:
                    embedding = embedding / norm
                query_embedding = embedding.astype('float32')
                
            except Exception as e:
                print(f"[verify_face] Lỗi xử lý ảnh: {e}")
                return None
        else:
            query_embedding = image

        if query_embedding is None:
            return None



        result = None

        if stored_embeddings is None:
            from attendance.models import Employee
            employees = Employee.objects.filter(face_embeddings__isnull=False)
            
            print(f"[verify_face] Tìm thấy {employees.count()} nhân viên có face embeddings")

            max_similarity = -1
            matched_employee = None

            for employee in employees:
                embs = employee.get_face_embeddings()
                if not embs:
                    print(f"[verify_face] {employee.employee_id}: Không có embeddings hợp lệ")
                    continue

                # Sử dụng Top-K weighted average thay vì max
                employee_similarity = self.compute_top_k_similarity(query_embedding, embs)
                print(f"[verify_face] {employee.employee_id} ({employee.user.get_full_name()}): similarity = {employee_similarity:.4f}, embeddings count = {len(embs)}")
                
                if employee_similarity > max_similarity:
                    max_similarity = employee_similarity
                    matched_employee = employee

            print(f"[verify_face] Best match: {matched_employee.employee_id if matched_employee else 'None'}, max_similarity = {max_similarity:.4f}")
            
            if max_similarity >= self.similarity_threshold and matched_employee:
                result = {
                    'employee_id': matched_employee.employee_id,
                    'full_name': matched_employee.user.get_full_name(),
                    'department': matched_employee.department,
                    'position': matched_employee.position,
                    'similarity_score': float(max_similarity),
                    'work_status': matched_employee.work_status,
                    'current_status': matched_employee.current_status
                }
        else:
            # Sử dụng Top-K matching cho stored_embeddings
            max_similarity = self.compute_top_k_similarity(query_embedding, stored_embeddings)

            if max_similarity >= self.similarity_threshold:
                result = True

        # Nếu có kết quả và có bbox, thêm bbox vào kết quả
        if result and isinstance(result, dict) and bbox:
            result['bbox'] = bbox
            
        return result

    def save_embedding_to_db(self, employee_id: int, embedding: np.ndarray) -> bool:
        """Lưu embedding mới vào database"""
        from attendance.models import Employee
        try:
            employee = Employee.objects.get(id=employee_id)
            current_embeddings = employee.get_face_embeddings()
            current_embeddings.append(embedding)
            employee.set_face_embeddings(current_embeddings)
            employee.save()
            return True
        except Employee.DoesNotExist:
            print(f"[save_embedding_to_db] Không tìm thấy nhân viên với ID: {employee_id}")
            return False
        except Exception as e:
            print(f"[save_embedding_to_db] Lỗi khi lưu embedding: {e}")
            return False

    def clear_face_data(self, employee_id: int) -> bool:
        """Xóa dữ liệu khuôn mặt của nhân viên"""
        try:
            from attendance.models import Employee
            employee = Employee.objects.get(id=employee_id)
            employee.clear_face_embeddings()
            print(f"[clear_face_data] Đã xóa dữ liệu khuôn mặt của nhân viên {employee_id}")
            return True
        except Exception as e:
            print(f"[clear_face_data] Lỗi khi xóa dữ liệu khuôn mặt: {e}")
            return False

    def get_face_embedding(self, image: np.ndarray) -> Optional[np.ndarray]:
        """Alias cho phương thức extract_embedding"""
        return self.extract_embedding(image)
