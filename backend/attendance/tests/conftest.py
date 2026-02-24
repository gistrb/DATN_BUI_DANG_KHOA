"""Pytest fixtures for attendance app tests"""
import pytest
from django.contrib.auth.models import User
from attendance.models import Department, Employee, AttendanceRecord


@pytest.fixture
def user(db):
    return User.objects.create_user(username='testuser', email='test@example.com', password='testpass123')


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(username='admin', email='admin@example.com', password='adminpass123')


@pytest.fixture
def department(db):
    return Department.objects.create(name='Phòng IT', description='Phòng công nghệ thông tin')


@pytest.fixture
def employee(db, user, department):
    return Employee.objects.create(
        user=user, employee_id='NV001', first_name='Khoa', last_name='Bùi',
        email='khoa@example.com', department=department, position='Developer', work_status='WORKING')


@pytest.fixture
def attendance_record(db, employee):
    from django.utils import timezone
    return AttendanceRecord.objects.create(employee=employee, check_in_time=timezone.now(), status='ON_TIME')


@pytest.fixture
def api_client():
    from django.test import Client
    return Client()
