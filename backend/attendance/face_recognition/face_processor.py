import cv2
import numpy as np
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

        # Ngưỡng similarity - giảm xuống để robust hơn với ánh sáng
        self.similarity_threshold = 0.68
        
        self.min_face_size = (64, 64)
        
        # Cấu hình Top-K matching
        self.top_k = 3
        
        # Trọng số cho ensemble matching (Cosine + L2)
        self.cosine_weight = 0.6
        self.l2_weight = 0.4

    def adaptive_gamma_correction(self, image: np.ndarray) -> np.ndarray:
        """Tự động điều chỉnh gamma dựa trên độ sáng ảnh"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        mean_brightness = np.mean(gray)
        
        # Tính gamma tự động: ảnh tối -> gamma < 1, ảnh sáng -> gamma > 1
        if mean_brightness < 80:
            gamma = 0.6  # Làm sáng ảnh tối
        elif mean_brightness > 180:
            gamma = 1.5  # Làm tối ảnh sáng
        else:
            gamma = 1.0  # Giữ nguyên
        
        if gamma != 1.0:
            inv_gamma = 1.0 / gamma
            table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(256)]).astype("uint8")
            return cv2.LUT(image, table)
        return image

    def enhance_image(self, image: np.ndarray) -> np.ndarray:
        """Cải thiện chất lượng ảnh với adaptive gamma + CLAHE"""
        try:
            if image is None:
                return None
            
            # Bước 1: Adaptive gamma correction
            gamma_corrected = self.adaptive_gamma_correction(image)
            
            # Bước 2: CLAHE trong LAB color space
            lab = cv2.cvtColor(gamma_corrected, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            # Tăng clipLimit lên 3.0 để xử lý ánh sáng tốt hơn
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            l_enhanced = clahe.apply(l)
            
            lab_enhanced = cv2.merge([l_enhanced, a, b])
            enhanced = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2BGR)
            
            # Bước 3: Giảm nhiễu nhẹ
            enhanced = cv2.bilateralFilter(enhanced, 5, 50, 50)
            
            return enhanced
            
        except Exception as e:
            return image

    def compute_top_k_similarity(self, query_embedding: np.ndarray, 
                                  stored_embeddings: list, k: int = None) -> float:
        """
        Tính similarity sử dụng Top-K average
        Giảm ảnh hưởng của outlier, tăng độ chính xác
        
        Args:
            query_embedding: Embedding của ảnh cần kiểm tra
            stored_embeddings: Danh sách embeddings đã lưu
            k: Số lượng top similarities để tính trung bình
            
        Returns:
            Similarity score trung bình của top-k
        """
        if not stored_embeddings:
            return 0.0
        
        k = k or self.top_k
        
        # Tính similarity với tất cả embeddings
        similarities = [self.compare_embeddings(query_embedding, emb) 
                       for emb in stored_embeddings]
        
        # Lấy top-k cao nhất
        k = min(k, len(similarities))
        top_similarities = sorted(similarities, reverse=True)[:k]
        
        # Tính trung bình có trọng số (similarity cao có trọng số lớn hơn)
        if len(top_similarities) == 1:
            return top_similarities[0]
        
        # Weighted average: similarity càng cao, trọng số càng lớn
        weights = [s ** 2 for s in top_similarities]  # Quadratic weighting
        weighted_sum = sum(s * w for s, w in zip(top_similarities, weights))
        weight_total = sum(weights)
        
        if weight_total == 0:
            return 0.0
        
        return weighted_sum / weight_total

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

    def extract_embedding(self, image: np.ndarray, use_enhancement: bool = True) -> Optional[np.ndarray]:
        """
        Trích xuất embedding sử dụng ArcFace
        
        Args:
            image: Ảnh đầu vào (BGR format)
            use_enhancement: Có sử dụng image enhancement không (mặc định True)
            
        Returns:
            Embedding vector đã chuẩn hóa hoặc None nếu không detect được face
        """
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
        """Cosine Similarity: 1 = giống hoàn toàn, 0 = khác hoàn toàn"""
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
        """Ensemble: Kết hợp Cosine Similarity + L2 Distance"""
        cosine_sim = self.cosine_similarity(embedding1, embedding2)
        l2_dist = self.l2_distance(embedding1, embedding2)
        
        # Convert L2 distance to similarity (0-2 range -> 0-1 similarity)
        l2_sim = max(0, 1 - (l2_dist / 2))
        
        # Weighted ensemble
        combined = self.cosine_weight * cosine_sim + self.l2_weight * l2_sim
        return float(combined)

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
        """
        Xác thực khuôn mặt và trả về thông tin nhân viên nếu khớp
        
        Cải tiến (v2.0):
        - Sử dụng image enhancement trước khi nhận diện
        - Top-K weighted average matching thay vì max
        - Trả về confidence level
        """
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

            max_similarity = -1
            matched_employee = None

            for employee in employees:
                embs = employee.get_face_embeddings()
                if not embs:
                    continue

                # Sử dụng Top-K weighted average thay vì max
                employee_similarity = self.compute_top_k_similarity(query_embedding, embs)
                
                if employee_similarity > max_similarity:
                    max_similarity = employee_similarity
                    matched_employee = employee

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
