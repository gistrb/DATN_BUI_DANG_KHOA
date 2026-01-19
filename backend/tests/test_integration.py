"""
INTEGRATION TESTS - Kiểm thử Tích hợp
Test sự tương tác giữa các module/components
"""
import os
import json
import unittest
from unittest.mock import patch, MagicMock

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.test import TestCase, Client
from django.contrib.auth.models import User
from attendance.models import Employee, AttendanceRecord, Department


class TestAPIIntegration(TestCase):
    """Integration tests: API → Service → Database"""
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.client = Client()
    
    def setUp(self):
        """Setup test data cho mỗi test"""
        # Tạo user admin
        self.admin_user = User.objects.create_user(
            username='testadmin',
            password='testpass123',
            is_staff=True
        )
        
        # Tạo department
        self.department = Department.objects.create(
            name='Test Department'
        )
        
        # Tạo employee
        self.employee = Employee.objects.create(
            employee_id='INT001',
            first_name='Integration',
            last_name='Test',
            email='integration@test.com',
            department='Test Department',
            position='Tester',
            work_status='WORKING',
            current_status='NOT_IN'
        )
    
    def tearDown(self):
        """Cleanup sau mỗi test"""
        AttendanceRecord.objects.all().delete()
        Employee.objects.all().delete()
        Department.objects.all().delete()
        User.objects.all().delete()
    
    # ============================================
    # 1. LOGIN API INTEGRATION
    # ============================================
    
    def test_login_success(self):
        """TC-I001: Test login API với credentials đúng"""
        response = self.client.post(
            '/api/login/',
            data=json.dumps({
                'username': 'testadmin',
                'password': 'testpass123'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['user']['username'], 'testadmin')
    
    def test_login_wrong_password(self):
        """TC-I002: Test login API với password sai"""
        response = self.client.post(
            '/api/login/',
            data=json.dumps({
                'username': 'testadmin',
                'password': 'wrongpassword'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 401)
        data = response.json()
        self.assertFalse(data['success'])
    
    def test_login_user_not_exists(self):
        """TC-I003: Test login API với user không tồn tại"""
        response = self.client.post(
            '/api/login/',
            data=json.dumps({
                'username': 'nonexistent',
                'password': 'password'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 401)
    
    # ============================================
    # 2. DASHBOARD API INTEGRATION
    # ============================================
    
    def test_dashboard_api(self):
        """TC-I004: Test dashboard API trả về đúng data"""
        response = self.client.get('/api/dashboard/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('company_stats', data)
        self.assertIn('total_employees', data['company_stats'])
    
    def test_dashboard_counts_employees(self):
        """TC-I005: Test dashboard API đếm đúng số nhân viên"""
        # Lấy số nhân viên trước
        response = self.client.get('/api/dashboard/')
        initial_count = response.json()['company_stats']['total_employees']
        
        # Thêm nhân viên mới
        Employee.objects.create(
            employee_id='INT002',
            first_name='New',
            last_name='Employee',
            email='new@test.com'
        )
        
        # Xóa cache nếu có
        from django.core.cache import cache
        cache.clear()
        
        # Check lại
        response = self.client.get('/api/dashboard/')
        new_count = response.json()['company_stats']['total_employees']
        
        self.assertEqual(new_count, initial_count + 1)
    
    # ============================================
    # 3. EMPLOYEE API INTEGRATION
    # ============================================
    
    def test_employees_list_api(self):
        """TC-I006: Test employees list API"""
        response = self.client.get('/api/employees/list/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('employees', data)
    
    def test_employee_stats_api(self):
        """TC-I007: Test employee stats API"""
        response = self.client.get(f'/api/stats/{self.employee.employee_id}/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('stats', data)
    
    def test_employee_stats_invalid_id(self):
        """TC-I008: Test employee stats API với ID không hợp lệ"""
        response = self.client.get('/api/stats/INVALID_ID/')
        
        self.assertEqual(response.status_code, 404)
    
    def test_employee_history_api(self):
        """TC-I009: Test employee history API"""
        response = self.client.get(f'/api/history/{self.employee.employee_id}/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('history', data)
    
    # ============================================
    # 4. DEPARTMENT API INTEGRATION
    # ============================================
    
    def test_departments_list_api(self):
        """TC-I010: Test departments list API"""
        response = self.client.get('/api/departments/list/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('departments', data)
    
    # ============================================
    # 5. PUSH TOKEN INTEGRATION
    # ============================================
    
    def test_push_token_registration(self):
        """TC-I011: Test push token registration API"""
        response = self.client.post(
            '/api/push-token/',
            data=json.dumps({
                'employee_id': self.employee.employee_id,
                'push_token': 'TEST_FCM_TOKEN_123'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        
        # Verify token saved to database
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.push_token, 'TEST_FCM_TOKEN_123')


class TestDatabaseIntegration(TestCase):
    """Integration tests: Database relationships and constraints"""
    
    def setUp(self):
        self.employee = Employee.objects.create(
            employee_id='DB001',
            first_name='Database',
            last_name='Test',
            email='db@test.com'
        )
    
    def tearDown(self):
        AttendanceRecord.objects.all().delete()
        Employee.objects.all().delete()
    
    # ============================================
    # 6. DATABASE RELATIONSHIPS
    # ============================================
    
    def test_attendance_employee_relationship(self):
        """TC-I012: Test quan hệ AttendanceRecord -> Employee"""
        from datetime import date, time
        
        record = AttendanceRecord.objects.create(
            employee=self.employee,
            date=date.today(),
            check_in_time=time(8, 30),
            status='ON_TIME'
        )
        
        # Verify relationship
        self.assertEqual(record.employee.employee_id, 'DB001')
        
        # Verify reverse relationship
        self.assertEqual(self.employee.attendance_records.count(), 1)
    
    def test_employee_unique_id(self):
        """TC-I013: Test unique constraint trên employee_id"""
        from django.db import IntegrityError
        
        with self.assertRaises(IntegrityError):
            Employee.objects.create(
                employee_id='DB001',  # Duplicate
                first_name='Another',
                last_name='Employee',
                email='another@test.com'
            )
    
    def test_cascade_delete_attendance(self):
        """TC-I014: Test xóa Employee không xóa cascade AttendanceRecord (tùy config)"""
        from datetime import date, time
        
        AttendanceRecord.objects.create(
            employee=self.employee,
            date=date.today(),
            check_in_time=time(8, 30)
        )
        
        record_count_before = AttendanceRecord.objects.count()
        self.assertEqual(record_count_before, 1)
        
        # Delete employee
        self.employee.delete()
        
        # Check attendance records
        record_count_after = AttendanceRecord.objects.count()
        # Depending on CASCADE setting, this might be 0 or error
        self.assertEqual(record_count_after, 0)


class TestServiceIntegration(TestCase):
    """Integration tests: Services and external dependencies"""
    
    def setUp(self):
        self.employee = Employee.objects.create(
            employee_id='SRV001',
            first_name='Service',
            last_name='Test',
            email='service@test.com',
            push_token='TEST_TOKEN_123'
        )
    
    def tearDown(self):
        Employee.objects.all().delete()
    
    # ============================================
    # 7. FACE PROCESSOR + DATABASE INTEGRATION
    # ============================================
    
    @patch('attendance.face_recognition.face_processor.FaceProcessor.get_face_embedding')
    def test_verify_face_with_database(self, mock_embedding):
        """TC-I015: Test verify_face tích hợp với database"""
        import numpy as np
        from attendance.face_recognition.face_processor import get_face_processor
        
        # Mock embedding
        mock_embedding.return_value = np.random.rand(512).astype('float32')
        
        processor = get_face_processor()
        # Verify against empty database
        result = processor.verify_face(mock_embedding.return_value)
        
        # Nếu không có employee có face data => None
        if self.employee.face_embeddings is None:
            self.assertIsNone(result)
    
    # ============================================
    # 8. PUSH NOTIFICATION INTEGRATION
    # ============================================
    
    @patch('attendance.views.push_notification.send_fcm_notification')
    def test_notification_after_attendance(self, mock_fcm):
        """TC-I016: Test gửi notification sau khi chấm công"""
        mock_fcm.return_value = True
        
        from attendance.views.push_notification import send_attendance_notification
        
        result = send_attendance_notification(
            self.employee.employee_id,
            'Check-in thành công'
        )
        
        # FCM should be called if employee has push_token
        if self.employee.push_token:
            mock_fcm.assert_called()


def run_integration_tests():
    """Chạy tất cả Integration Tests"""
    print("\n" + "="*70)
    print("🔗 INTEGRATION TESTING - Kiểm thử Tích hợp")
    print("="*70)
    
    from django.test.utils import setup_test_environment
    setup_test_environment()
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestAPIIntegration))
    suite.addTests(loader.loadTestsFromTestCase(TestDatabaseIntegration))
    suite.addTests(loader.loadTestsFromTestCase(TestServiceIntegration))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Summary
    print("\n" + "="*70)
    print("📊 INTEGRATION TEST SUMMARY")
    print("="*70)
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success: {result.testsRun - len(result.failures) - len(result.errors)}")
    
    if result.wasSuccessful():
        print("\n✅ ALL INTEGRATION TESTS PASSED!")
    else:
        print("\n❌ SOME TESTS FAILED!")
    
    return result


if __name__ == '__main__':
    run_integration_tests()
