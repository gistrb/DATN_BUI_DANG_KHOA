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
        # Thường từ 0.3 đến 0.5 tùy độ khắt khe. 0.4 là mức trung bình tốt.
        self.similarity_threshold = 0.4
        
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
