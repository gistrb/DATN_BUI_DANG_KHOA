"""Service Integration Tests"""
import pytest
import numpy as np
from unittest.mock import Mock, patch
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from attendance.models import Department, Employee
from django.utils import timezone
import uuid


@pytest.mark.django_db(transaction=True)
class TestAuthenticationIntegration:
    
    def test_authenticate_valid_user(self, db):
        User.objects.create_user(username='auth_test', password='pass123')
        user = authenticate(username='auth_test', password='pass123')
        assert user is not None
        assert user.username == 'auth_test'
    
    def test_authenticate_invalid_password(self, db):
        User.objects.create_user(username='auth_fail', password='correct')
        user = authenticate(username='auth_fail', password='wrong')
        assert user is None
    
    def test_authenticate_user_with_employee(self, db):
        user = User.objects.create_user(username='emp_auth', password='pass123')
        Employee.objects.create(user=user, employee_id='NV_AUTH')
        auth_user = authenticate(username='emp_auth', password='pass123')
        assert auth_user.employee.employee_id == 'NV_AUTH'


@pytest.mark.django_db(transaction=True)
class TestEmployeeServiceIntegration:
    
    def test_employee_status_sync_with_attendance(self, db):
        emp = Employee.objects.create(employee_id='NV_STATUS_SYNC')
        assert emp.current_status == 'NOT_IN'
        emp.update_current_status(is_checking_in=True)
        emp.refresh_from_db()
        assert emp.current_status == 'IN_OFFICE'
    
    def test_employee_work_status_affects_attendance(self, db):
        emp = Employee.objects.create(employee_id='NV_TERM', work_status='TERMINATED')
        result = emp.update_current_status(is_checking_in=True)
        assert result == False
        assert emp.current_status == 'NOT_IN'
    
    def test_department_employee_count_sync(self, db):
        dept_name = f'Count_Dept_{uuid.uuid4().hex[:8]}'
        dept = Department.objects.create(name=dept_name)
        assert dept.get_employee_count() == 0
        Employee.objects.create(employee_id='NV_C1', department=dept)
        Employee.objects.create(employee_id='NV_C2', department=dept)
        assert dept.get_employee_count() == 2


@pytest.mark.django_db(transaction=True)
class TestFaceRecognitionServiceIntegration:
    
    def test_employee_face_data_storage(self, db):
        emp = Employee.objects.create(employee_id='NV_FACE_STORE')
        mock_embeddings = [np.random.rand(512) for _ in range(3)]
        emp.set_face_embeddings(mock_embeddings)
        emp.save()
        retrieved = emp.get_face_embeddings()
        assert len(retrieved) == 3
        assert all(isinstance(e, np.ndarray) for e in retrieved)
    
    def test_employee_face_data_clear(self, db):
        emp = Employee.objects.create(employee_id='NV_FACE_CLEAR')
        emp.set_face_embeddings([np.random.rand(512)])
        emp.save()
        emp.clear_face_embeddings()
        emp.save()
        assert emp.face_embeddings is None
        assert emp.get_face_embeddings() == []
    



@pytest.mark.django_db(transaction=True)
class TestNotificationServiceIntegration:
    
    def test_expo_push_token_storage(self, db):
        emp = Employee.objects.create(employee_id='NV_PUSH')
        emp.expo_push_token = 'ExponentPushToken[xxxxxxxxxxxxxx]'
        emp.save()
        emp.refresh_from_db()
        assert 'ExponentPushToken' in emp.expo_push_token
    
    def test_employee_with_push_token_filter(self, db):
        emp1 = Employee.objects.create(employee_id='NV_WITH_TOKEN', expo_push_token='ExponentPushToken[xxx]')
        emp2 = Employee.objects.create(employee_id='NV_NO_TOKEN')
        with_tokens = Employee.objects.exclude(expo_push_token__isnull=True).exclude(expo_push_token='')
        assert emp1 in with_tokens
        assert emp2 not in with_tokens
