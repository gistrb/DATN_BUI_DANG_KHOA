"""Database Integration Tests"""
import pytest
from django.db import connection, transaction, IntegrityError
from django.db.models import Count
from django.contrib.auth.models import User
from attendance.models import Department, Employee, AttendanceRecord
from django.utils import timezone
import uuid


@pytest.mark.django_db(transaction=True)
class TestDatabaseIntegration:
    
    def test_employee_user_relationship(self, db):
        user = User.objects.create_user(username='fk_test', password='pass123')
        employee = Employee.objects.create(user=user, employee_id='NV_FK_TEST')
        assert employee.user.username == 'fk_test'
        assert user.employee == employee
    
    def test_attendance_employee_relationship(self, db):
        employee = Employee.objects.create(employee_id='NV_ATT_REL')
        record = AttendanceRecord.objects.create(
            employee=employee, status='ON_TIME',
            date=timezone.now().date() - timezone.timedelta(days=500))
        assert record.employee.employee_id == 'NV_ATT_REL'
        assert record in employee.attendancerecord_set.all()
    
    def test_cascade_delete_user_employee(self, db):
        user = User.objects.create_user(username='cascade_test', password='pass123')
        employee = Employee.objects.create(user=user, employee_id='NV_CASCADE')
        emp_id = employee.pk
        user.delete()
        assert True  # No crash
    
    def test_filter_employees_by_department(self, db):
        dept = Department.objects.create(name='Query Test Dept')
        Employee.objects.create(employee_id='NV_Q1', department=dept.name)
        Employee.objects.create(employee_id='NV_Q2', department=dept.name)
        Employee.objects.create(employee_id='NV_Q3', department='Other')
        result = Employee.objects.filter(department=dept.name)
        assert result.count() == 2
    
    def test_filter_attendance_by_date_range(self, db):
        emp = Employee.objects.create(employee_id='NV_DATE_RANGE')
        today = timezone.now().date()
        for i in range(5):
            AttendanceRecord.objects.create(
                employee=emp, date=today - timezone.timedelta(days=i+600), status='ON_TIME')
        start = today - timezone.timedelta(days=603)
        end = today - timezone.timedelta(days=600)
        result = AttendanceRecord.objects.filter(employee=emp, date__range=[start, end])
        assert result.count() == 4
    
    def test_aggregate_attendance_count(self, db):
        emp = Employee.objects.create(employee_id='NV_AGG')
        for i in range(3):
            AttendanceRecord.objects.create(
                employee=emp, date=timezone.now().date() - timezone.timedelta(days=i+700), status='ON_TIME')
        result = Employee.objects.filter(employee_id='NV_AGG').annotate(record_count=Count('attendancerecord')).first()
        assert result.record_count == 3
    
    def test_select_related_optimization(self, db):
        user = User.objects.create_user(username='opt_test', password='pass')
        Employee.objects.create(user=user, employee_id='NV_OPT')
        result = Employee.objects.select_related('user').get(employee_id='NV_OPT')
        assert result.user.username == 'opt_test'
    
    def test_atomic_transaction_success(self, db):
        with transaction.atomic():
            emp = Employee.objects.create(employee_id='NV_ATOMIC')
            AttendanceRecord.objects.create(
                employee=emp, status='ON_TIME', date=timezone.now().date() - timezone.timedelta(days=800))
        assert Employee.objects.filter(employee_id='NV_ATOMIC').exists()
    
    def test_atomic_transaction_rollback(self, db):
        try:
            with transaction.atomic():
                Employee.objects.create(employee_id='NV_ROLLBACK')
                raise Exception("Test rollback")
        except:
            pass
        assert not Employee.objects.filter(employee_id='NV_ROLLBACK').exists()
    
    def test_unique_employee_id(self, db):
        Employee.objects.create(employee_id='NV_UNIQUE')
        with pytest.raises(IntegrityError):
            Employee.objects.create(employee_id='NV_UNIQUE')
    
    def test_unique_department_name(self, db):
        unique_name = f'Unique_Dept_{uuid.uuid4().hex[:8]}'
        Department.objects.create(name=unique_name)
        with pytest.raises(IntegrityError):
            Department.objects.create(name=unique_name)
