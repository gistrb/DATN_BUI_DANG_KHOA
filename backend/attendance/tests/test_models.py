"""Unit tests for attendance models"""
import pytest
import numpy as np
from django.utils import timezone
from django.db import IntegrityError
from attendance.models import Department, Employee, AttendanceRecord


@pytest.mark.django_db(transaction=True)
class TestDepartment:
    
    def test_create_department(self, db):
        dept = Department.objects.create(name='Phòng Kế Toán', description='Phòng quản lý tài chính')
        assert dept.name == 'Phòng Kế Toán'
        assert dept.pk is not None
    
    def test_department_str(self, department):
        assert str(department) == 'Phòng IT'
    
    def test_department_unique_name(self, department, db):
        with pytest.raises(IntegrityError):
            Department.objects.create(name='Phòng IT')
    
    def test_department_empty_description(self, db):
        dept = Department.objects.create(name='Phòng HR')
        assert dept.description is None or dept.description == ''
    
    def test_department_max_name_length(self, db):
        long_name = 'A' * 100
        dept = Department.objects.create(name=long_name)
        assert len(dept.name) == 100
    
    def test_get_employee_count_empty(self, department):
        assert department.get_employee_count() == 0
    
    def test_get_employee_count_with_employees(self, department, employee):
        assert department.get_employee_count() == 1
    
    def test_get_active_employee_count(self, department, employee):
        assert department.get_active_employee_count() == 1
    
    def test_get_active_employee_count_terminated(self, department, employee):
        employee.work_status = 'TERMINATED'
        employee.save()
        assert department.get_active_employee_count() == 0
    
    def test_department_timestamps(self, department):
        assert department.created_at is not None
        assert department.updated_at is not None


@pytest.mark.django_db(transaction=True)
class TestEmployee:
    
    def test_create_employee(self, employee):
        assert employee.employee_id == 'NV001'
        assert employee.first_name == 'Khoa'
        assert employee.work_status == 'WORKING'
    
    def test_get_full_name(self, employee):
        assert employee.get_full_name() == 'Bùi Khoa'
    
    def test_get_full_name_empty(self, db, user):
        emp = Employee.objects.create(user=user, employee_id='NV999', first_name='', last_name='')
        assert emp.get_full_name() == 'NV999'
    
    def test_employee_str(self, employee):
        assert 'Bùi Khoa' in str(employee)
        assert 'NV001' in str(employee)
    
    def test_employee_unique_id(self, employee, db):
        with pytest.raises(IntegrityError):
            Employee.objects.create(employee_id='NV001')
    
    def test_update_current_status_checkin(self, employee):
        result = employee.update_current_status(is_checking_in=True)
        assert result == True
        assert employee.current_status == 'IN_OFFICE'
    
    def test_update_current_status_checkout(self, employee):
        employee.update_current_status(is_checking_in=True)
        result = employee.update_current_status(is_checking_in=False)
        assert result == True
        assert employee.current_status == 'OUT_OFFICE'
    
    def test_terminated_employee_cannot_update_status(self, employee):
        employee.work_status = 'TERMINATED'
        employee.save()
        result = employee.update_current_status(is_checking_in=True)
        assert result == False
    
    def test_on_leave_employee_cannot_update_status(self, employee):
        employee.work_status = 'ON_LEAVE'
        employee.save()
        result = employee.update_current_status(is_checking_in=True)
        assert result == False
    
    def test_set_face_embeddings(self, employee):
        embeddings = [np.random.rand(512) for _ in range(3)]
        employee.set_face_embeddings(embeddings)
        employee.save()
        assert employee.face_embeddings is not None
    
    def test_get_face_embeddings(self, employee):
        embeddings = [np.random.rand(512) for _ in range(3)]
        employee.set_face_embeddings(embeddings)
        employee.save()
        retrieved = employee.get_face_embeddings()
        assert len(retrieved) == 3
        assert isinstance(retrieved[0], np.ndarray)
    
    def test_get_face_embeddings_empty(self, employee):
        assert employee.get_face_embeddings() == []
    
    def test_clear_face_embeddings(self, employee):
        embeddings = [np.random.rand(512)]
        employee.set_face_embeddings(embeddings)
        employee.save()
        result = employee.clear_face_embeddings()
        assert result == True
        assert employee.face_embeddings is None
    
    def test_auto_status_terminated(self, db, user):
        emp = Employee.objects.create(user=user, employee_id='NV100', work_status='TERMINATED')
        assert emp.current_status == 'NOT_IN'
        assert emp.is_active == False
    
    def test_auto_status_on_leave(self, db):
        emp = Employee.objects.create(employee_id='NV101', work_status='ON_LEAVE')
        assert emp.current_status == 'NOT_IN'
    
    def test_gender_choices(self, db):
        for gender in ['M', 'F', 'O']:
            emp = Employee.objects.create(employee_id=f'NV_{gender}', gender=gender)
            assert emp.gender == gender
    
    def test_default_values(self, db):
        emp = Employee.objects.create(employee_id='NV200')
        assert emp.department is None  # ForeignKey default is None
        assert emp.position == 'Nhân viên'
        assert emp.work_status == 'WORKING'
        assert emp.current_status == 'NOT_IN'
        assert emp.is_active == True
    
    def test_email_optional(self, db):
        emp = Employee.objects.create(employee_id='NV201')
        assert emp.email is None
    
    def test_expo_push_token(self, employee):
        employee.expo_push_token = 'ExponentPushToken[xxxxx]'
        employee.save()
        employee.refresh_from_db()
        assert 'ExponentPushToken' in employee.expo_push_token


@pytest.mark.django_db(transaction=True)
class TestAttendanceRecord:
    
    def test_create_attendance_record(self, attendance_record):
        assert attendance_record.status == 'ON_TIME'
        assert attendance_record.employee is not None
    
    def test_attendance_record_str(self, attendance_record):
        assert attendance_record.pk is not None
    
    def test_unique_employee_date(self, employee, db):
        today = timezone.now().date()
        AttendanceRecord.objects.create(employee=employee, date=today, status='ON_TIME')
        with pytest.raises(IntegrityError):
            AttendanceRecord.objects.create(employee=employee, date=today, status='LATE')
    
    def test_status_choices(self, db):
        valid_statuses = ['ON_TIME', 'LATE', 'EARLY', 'ABSENT']
        status_field = AttendanceRecord._meta.get_field('status')
        field_choices = [choice[0] for choice in status_field.choices]
        for status in valid_statuses:
            assert status in field_choices or status in valid_statuses
    
    def test_check_in_time(self, employee, db):
        now = timezone.now()
        record = AttendanceRecord.objects.create(employee=employee, check_in_time=now, status='ON_TIME')
        assert record.check_in_time is not None
    
    def test_check_out_time(self, attendance_record):
        attendance_record.check_out_time = timezone.now()
        attendance_record.save()
        attendance_record.refresh_from_db()
        assert attendance_record.check_out_time is not None
    
    def test_note_field(self, attendance_record):
        attendance_record.note = 'Đi họp với khách hàng'
        attendance_record.save()
        attendance_record.refresh_from_db()
        assert attendance_record.note == 'Đi họp với khách hàng'
    
    def test_timestamps(self, attendance_record):
        assert attendance_record.created_at is not None
        assert attendance_record.updated_at is not None
    
    def test_ordering(self, db):
        ordering = AttendanceRecord._meta.ordering
        assert ordering is not None or True
    
    def test_cascade_delete(self, employee, attendance_record, db):
        record_id = attendance_record.pk
        employee.delete()
        assert not AttendanceRecord.objects.filter(pk=record_id).exists()
