import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis
from typing import Optional, List, Tuple, Union, Dict, Any
import os

class FaceProcessor:
    def __init__(self):
        # Khởi tạo InsightFace (ArcFace)
        # Sử dụng model pack 'buffalo_l' (chứa ArcFace r100)
        # providers: Ưu tiên CUDA nếu có, sau đó là CPU
        self.app = FaceAnalysis(name='buffalo_l', providers=['CUDAExecutionProvider', 'CPUExecutionProvider'])
        self.app.prepare(ctx_id=0, det_size=(640, 640))

        # Ngưỡng similarity cho ArcFace (Cosine Similarity)
        # Tăng lên 0.5 để giảm nhầm lẫn giữa các nhân viên (cải thiện từ 0.4)
        self.similarity_threshold = 0.5
        
        self.min_face_size = (64, 64)

    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        InsightFace tự động xử lý tiền xử lý (crop, align).
        Hàm này giữ lại để tương thích và kiểm tra cơ bản.
        """
        if image is None:
            return None
        if not isinstance(image, np.ndarray):
            return None
        if image.ndim != 3 or image.shape[2] != 3:
            return None
        return image

    def extract_embedding(self, image: np.ndarray) -> Optional[np.ndarray]:
        """Trích xuất embedding sử dụng ArcFace"""
        try:
            # InsightFace yêu cầu ảnh BGR (OpenCV format)
            faces = self.app.get(image)
            
            if not faces:
                return None
            
            # Lấy khuôn mặt lớn nhất
            faces = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]), reverse=True)
            face = faces[0]
            
            embedding = face.embedding
            
            # Chuẩn hóa embedding
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
                
            return embedding.astype('float32')

        except Exception as e:
            print(f"[extract_embedding] Lỗi: {e}")
            return None

    def compare_embeddings(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """So sánh độ tương đồng giữa hai embedding bằng Cosine Similarity"""
        try:
            emb1 = np.array(embedding1).flatten()
            emb2 = np.array(embedding2).flatten()

            dot_product = np.dot(emb1, emb2)
            norm1 = np.linalg.norm(emb1)
            norm2 = np.linalg.norm(emb2)

            if norm1 == 0 or norm2 == 0:
                return 0.0

            similarity = dot_product / (norm1 * norm2)
            
            return float(np.clip(similarity, -1.0, 1.0))
        except Exception as e:
            print(f"[compare_embeddings] Lỗi: {e}")
            return 0.0

    def check_image_quality(self, image: np.ndarray, face_bbox: List[float]) -> Dict[str, Any]:
        """
        Kiểm tra chất lượng ảnh và khuôn mặt
        
        Args:
            image: Ảnh đầu vào (BGR format)
            face_bbox: Bounding box của khuôn mặt [x1, y1, x2, y2]
            
        Returns:
            Dict chứa thông tin chất lượng:
            - is_valid: True nếu ảnh đạt tiêu chuẩn
            - brightness: Độ sáng trung bình
            - face_area: Diện tích khuôn mặt
            - blur_score: Điểm độ nét
            - message: Thông báo chi tiết
        """
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
        """
        Phát hiện tư thế khuôn mặt sử dụng InsightFace
        
        Args:
            image: Ảnh đầu vào (BGR format)
            
        Returns:
            Dict chứa:
            - yaw: Góc xoay trái/phải (degrees)
            - pitch: Góc ngẩng/cúi (degrees)
            - roll: Góc nghiêng (degrees)
            - pose_type: 'front', 'left', 'right', 'up', 'down'
            - bbox: Bounding box của khuôn mặt
        """
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
        """
        Phân loại tư thế dựa trên góc yaw và pitch
        
        Args:
            yaw: Góc xoay trái/phải (-180 đến +180)
            pitch: Góc ngẩng/cúi (-180 đến +180)
            
        Returns:
            'front', 'left', 'right', 'up', 'down'
        """
        # Tăng ngưỡng lên 20° để dễ phân biệt hơn
        # Ưu tiên YAW (trái/phải) TRƯỚC, sau đó mới đến pitch (lên/xuống)
        
        # Kiểm tra yaw (trái/phải) trước
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
        """Kiểm tra ảnh đầu vào hợp lệ"""
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
        """Xác thực khuôn mặt và trả về thông tin nhân viên nếu khớp"""
        query_embedding = None
        bbox = None

        # Kiểm tra xem đầu vào là ảnh hay embedding
        if isinstance(image, np.ndarray) and image.ndim == 3:
            # Nếu là ảnh, dùng app.get để lấy cả embedding và bbox
            try:
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

            max_similarity = -1
            matched_employee = None

            for employee in employees:
                embs = employee.get_face_embeddings()
                if not embs:
                    continue

                similarities = [self.compare_embeddings(query_embedding, stored_emb)
                              for stored_emb in embs]
                
                if not similarities:
                    continue

                max_employee_similarity = max(similarities)

                if max_employee_similarity > max_similarity:
                    max_similarity = max_employee_similarity
                    matched_employee = employee

            if max_similarity >= self.similarity_threshold:
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
            similarities = [self.compare_embeddings(query_embedding, stored_emb)
                          for stored_emb in stored_embeddings]
            max_similarity = max(similarities) if similarities else -1

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
