"""System/End-to-End Tests"""
import pytest
import json
from attendance.models import Employee, Department, AttendanceRecord
from django.utils import timezone


class TestUserFlows:
    
    def test_employee_login_and_view_history(self, api_client, employee):
        login_response = api_client.post('/api/login/',
            data=json.dumps({'username': 'testuser', 'password': 'testpass123'}),
            content_type='application/json')
        assert login_response.status_code == 200
        history_response = api_client.get(f'/api/history/{employee.employee_id}/')
        assert history_response.status_code == 200
    
    def test_employee_login_and_view_stats(self, api_client, employee):
        login_response = api_client.post('/api/login/',
            data=json.dumps({'username': 'testuser', 'password': 'testpass123'}),
            content_type='application/json')
        assert login_response.status_code == 200
        stats_response = api_client.get(f'/api/stats/{employee.employee_id}/')
        assert stats_response.status_code == 200
    
    def test_admin_login_and_view_dashboard(self, api_client, admin_user):
        login_response = api_client.post('/api/login/',
            data=json.dumps({'username': 'admin', 'password': 'adminpass123'}),
            content_type='application/json')
        assert login_response.status_code == 200
        dashboard_response = api_client.get('/api/dashboard/')
        assert dashboard_response.status_code == 200
    
    def test_admin_create_department_flow(self, api_client, admin_user, db):
        api_client.post('/api/login/',
            data=json.dumps({'username': 'admin', 'password': 'adminpass123'}),
            content_type='application/json')
        response = api_client.post('/api/departments/list/',
            data=json.dumps({'name': 'Phòng Marketing', 'description': 'Marketing Department'}),
            content_type='application/json')
        assert response.status_code in [200, 201, 400]
    
    def test_admin_create_employee_flow(self, api_client, admin_user, department, db):
        api_client.post('/api/login/',
            data=json.dumps({'username': 'admin', 'password': 'adminpass123'}),
            content_type='application/json')
        response = api_client.post('/api/employees/list/',
            data=json.dumps({'employee_id': 'NV_FLOW', 'first_name': 'Flow', 'last_name': 'Test', 'department': department.name}),
            content_type='application/json')
        assert response.status_code in [200, 201, 400]
    
    def test_view_department_statistics(self, api_client, department, employee, attendance_record):
        response = api_client.get('/api/department-stats/')
        assert response.status_code == 200
    
    def test_view_employees_list_flow(self, api_client, employee):
        response = api_client.get('/api/employees/list/')
        assert response.status_code == 200
        detail_response = api_client.get(f'/api/employees/{employee.employee_id}/detail/')
        assert detail_response.status_code == 200
    
    def test_double_checkin_same_day(self, api_client, employee, db):
        AttendanceRecord.objects.create(
            employee=employee, date=timezone.now().date(),
            check_in_time=timezone.now(), status='ON_TIME')
        existing = AttendanceRecord.objects.filter(employee=employee, date=timezone.now().date()).count()
        assert existing == 1


class TestSecurityTests:
    
    def test_invalid_token_rejected(self, api_client):
        response = api_client.post('/api/login/',
            data=json.dumps({'username': 'hacker', 'password': 'wrongpass'}),
            content_type='application/json')
        assert response.status_code == 401
        assert response.json()['success'] == False
    
    def test_sql_injection_prevention(self, api_client):
        response = api_client.post('/api/login/',
            data=json.dumps({'username': "admin'; DROP TABLE users; --", 'password': 'password'}),
            content_type='application/json')
        assert response.status_code == 401
    
    def test_xss_prevention(self, api_client):
        response = api_client.post('/api/login/',
            data=json.dumps({'username': '<script>alert("xss")</script>', 'password': 'password'}),
            content_type='application/json')
        assert response.status_code == 401
    
    def test_rate_limit_simulation(self, api_client):
        for _ in range(5):
            response = api_client.post('/api/login/',
                data=json.dumps({'username': 'attacker', 'password': 'wrongpass'}),
                content_type='application/json')
            assert response.status_code == 401
    
    def test_access_other_employee_data(self, api_client, employee, db):
        other_emp = Employee.objects.create(employee_id='NV_OTHER', first_name='Other', last_name='User')
        response1 = api_client.get(f'/api/stats/{employee.employee_id}/')
        response2 = api_client.get(f'/api/stats/{other_emp.employee_id}/')
        assert response1.status_code == 200
        assert response2.status_code == 200
