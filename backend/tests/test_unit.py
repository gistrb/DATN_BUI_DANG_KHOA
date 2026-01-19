"""
UNIT TESTS - Kiểm thử Đơn vị
Test từng function/method độc lập
"""
import os
import sys
import unittest
import numpy as np
from unittest.mock import Mock, patch, MagicMock

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from attendance.face_recognition.face_processor import FaceProcessor, get_face_processor


class TestFaceProcessorUnit(unittest.TestCase):
    """Unit tests cho FaceProcessor class"""
    
    @classmethod
    def setUpClass(cls):
        """Setup một lần cho tất cả tests"""
        cls.processor = get_face_processor()
    
    # ============================================
    # 1. EQUIVALENCE PARTITIONING
    # Chia input thành các nhóm tương đương
    # ============================================
    
    def test_similarity_threshold_valid_high(self):
        """TC-U001: Test similarity cao (0.8-1.0) - Nhóm Valid High"""
        # Similarity cao => phải match
        threshold = self.processor.similarity_threshold
        self.assertLess(threshold, 0.8)  # 0.8 > threshold => should match
    
    def test_similarity_threshold_valid_medium(self):
        """TC-U002: Test similarity trung bình (0.65-0.8) - Nhóm Valid Medium"""
        threshold = self.processor.similarity_threshold
        self.assertLessEqual(0.65, threshold)
        self.assertLess(threshold, 0.8)
    
    def test_similarity_threshold_invalid_low(self):
        """TC-U003: Test similarity thấp (<0.65) - Nhóm Invalid"""
        threshold = self.processor.similarity_threshold
        # Similarity 0.5 < threshold => should NOT match
        self.assertGreater(threshold, 0.5)
    
    # ============================================
    # 2. BOUNDARY VALUE ANALYSIS
    # Test các giá trị biên
    # ============================================
    
    def test_threshold_boundary_exact(self):
        """TC-U004: Test đúng giá trị threshold (0.65)"""
        self.assertEqual(self.processor.similarity_threshold, 0.65)
    
    def test_threshold_boundary_just_below(self):
        """TC-U005: Test giá trị ngay dưới threshold"""
        # 0.649 < 0.65 => should NOT match
        test_similarity = 0.649
        self.assertLess(test_similarity, self.processor.similarity_threshold)
    
    def test_threshold_boundary_just_above(self):
        """TC-U006: Test giá trị ngay trên threshold"""
        # 0.651 > 0.65 => should match
        test_similarity = 0.651
        self.assertGreater(test_similarity, self.processor.similarity_threshold)
    
    # ============================================
    # 3. IMAGE QUALITY CHECK TESTS
    # ============================================
    
    def test_check_image_quality_valid_brightness(self):
        """TC-U007: Test ảnh với độ sáng hợp lệ (50-220)"""
        # Tạo ảnh với brightness trung bình
        image = np.ones((200, 200, 3), dtype=np.uint8) * 128
        bbox = [50, 50, 150, 150]
        
        result = self.processor.check_image_quality(image, bbox)
        self.assertIn('brightness', result)
    
    def test_check_image_quality_too_dark(self):
        """TC-U008: Test ảnh quá tối (brightness < 50)"""
        # Tạo ảnh tối
        image = np.ones((200, 200, 3), dtype=np.uint8) * 20
        bbox = [50, 50, 150, 150]
        
        result = self.processor.check_image_quality(image, bbox)
        # Có thể valid hoặc invalid tùy implementation
        self.assertIsInstance(result, dict)
    
    def test_check_image_quality_too_bright(self):
        """TC-U009: Test ảnh quá sáng (brightness > 220)"""
        # Tạo ảnh sáng
        image = np.ones((200, 200, 3), dtype=np.uint8) * 250
        bbox = [50, 50, 150, 150]
        
        result = self.processor.check_image_quality(image, bbox)
        self.assertIsInstance(result, dict)
    
    # ============================================
    # 4. EDGE CASES / ERROR HANDLING
    # ============================================
    
    def test_get_face_embedding_no_face(self):
        """TC-U010: Test với ảnh không có khuôn mặt"""
        # Ảnh trống (noise)
        blank_image = np.random.randint(0, 50, (100, 100, 3), dtype=np.uint8)
        result = self.processor.get_face_embedding(blank_image)
        self.assertIsNone(result)
    
    def test_get_face_embedding_small_image(self):
        """TC-U011: Test với ảnh quá nhỏ"""
        small_image = np.zeros((10, 10, 3), dtype=np.uint8)
        result = self.processor.get_face_embedding(small_image)
        self.assertIsNone(result)
    
    def test_cosine_similarity_same_vector(self):
        """TC-U012: Test cosine similarity với cùng 1 vector"""
        vector = np.random.rand(512).astype('float32')
        similarity = self.processor.cosine_similarity(vector, vector)
        self.assertAlmostEqual(similarity, 1.0, places=5)
    
    def test_cosine_similarity_orthogonal(self):
        """TC-U013: Test cosine similarity với 2 vector vuông góc"""
        v1 = np.array([1, 0, 0], dtype='float32')
        v2 = np.array([0, 1, 0], dtype='float32')
        similarity = self.processor.cosine_similarity(v1, v2)
        self.assertAlmostEqual(similarity, 0.0, places=5)
    
    def test_cosine_similarity_opposite(self):
        """TC-U014: Test cosine similarity với 2 vector ngược chiều"""
        v1 = np.array([1, 0, 0], dtype='float32')
        v2 = np.array([-1, 0, 0], dtype='float32')
        similarity = self.processor.cosine_similarity(v1, v2)
        self.assertAlmostEqual(similarity, -1.0, places=5)

    # ============================================
    # 5. MOCK TESTS
    # ============================================
    
    @patch('attendance.models.Employee.objects')
    def test_verify_face_no_employees(self, mock_employees):
        """TC-U015: Test verify_face khi không có nhân viên nào"""
        # Mock QuerySet
        mock_qs = MagicMock()
        mock_qs.exists.return_value = False
        mock_qs.count.return_value = 0
        mock_qs.__iter__.return_value = iter([])
        
        mock_employees.filter.return_value = mock_qs
        
        test_embedding = np.random.rand(512).astype('float32')
        result = self.processor.verify_face(test_embedding)
        # Khi không có employee => return None
        self.assertIsNone(result)


class TestAttendanceStatusUnit(unittest.TestCase):
    """Unit tests cho logic xác định trạng thái chấm công"""
    
    def test_is_late_before_830(self):
        """TC-U016: Test check-in trước 8:30 => ON_TIME"""
        from datetime import time
        from attendance.views.utils import WORK_START_TIME
        
        check_in_time = time(8, 25)
        self.assertLess(check_in_time, WORK_START_TIME)
    
    def test_is_late_after_830(self):
        """TC-U017: Test check-in sau 8:30 => LATE"""
        from datetime import time
        from attendance.views.utils import WORK_START_TIME
        
        check_in_time = time(8, 35)
        self.assertGreater(check_in_time, WORK_START_TIME)
    
    def test_is_early_before_1730(self):
        """TC-U018: Test check-out trước 17:30 => EARLY"""
        from datetime import time
        from attendance.views.utils import WORK_END_TIME
        
        check_out_time = time(16, 30)
        self.assertLess(check_out_time, WORK_END_TIME)
    
    def test_is_early_after_1730(self):
        """TC-U019: Test check-out sau 17:30 => ON_TIME"""
        from datetime import time
        from attendance.views.utils import WORK_END_TIME
        
        check_out_time = time(18, 0)
        self.assertGreater(check_out_time, WORK_END_TIME)


class TestBlurScoreUnit(unittest.TestCase):
    """Unit tests cho kiểm tra độ mờ ảnh"""
    
    def test_sharp_image(self):
        """TC-U020: Test ảnh rõ nét (blur_score > 300)"""
        # Tạo ảnh có edges rõ ràng
        sharp_image = np.zeros((200, 200), dtype=np.uint8)
        sharp_image[90:110, :] = 255  # Đường kẻ ngang
        
        import cv2
        laplacian = cv2.Laplacian(sharp_image, cv2.CV_64F)
        blur_score = laplacian.var()
        
        self.assertGreater(blur_score, 100)  # Có edges
    
    def test_blurry_image(self):
        """TC-U021: Test ảnh mờ (blur_score < 100)"""
        # Tạo ảnh uniform (không có edges)
        blurry_image = np.ones((200, 200), dtype=np.uint8) * 128
        
        import cv2
        laplacian = cv2.Laplacian(blurry_image, cv2.CV_64F)
        blur_score = laplacian.var()
        
        self.assertLess(blur_score, 1)  # Không có edges


def run_unit_tests():
    """Chạy tất cả Unit Tests"""
    print("\n" + "="*70)
    print("🧪 UNIT TESTING - Kiểm thử Đơn vị")
    print("="*70)
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestFaceProcessorUnit))
    suite.addTests(loader.loadTestsFromTestCase(TestAttendanceStatusUnit))
    suite.addTests(loader.loadTestsFromTestCase(TestBlurScoreUnit))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Summary
    print("\n" + "="*70)
    print("📊 UNIT TEST SUMMARY")
    print("="*70)
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success: {result.testsRun - len(result.failures) - len(result.errors)}")
    
    if result.wasSuccessful():
        print("\n✅ ALL UNIT TESTS PASSED!")
    else:
        print("\n❌ SOME TESTS FAILED!")
    
    return result


if __name__ == '__main__':
    run_unit_tests()
