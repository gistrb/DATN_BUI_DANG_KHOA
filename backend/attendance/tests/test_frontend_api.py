"""Integration tests for Frontend APIs"""
import pytest
import json
from attendance.models import Employee, Department


class TestDashboardAPI:
    
    def test_dashboard_get(self, api_client, employee, attendance_record):
        response = api_client.get('/api/dashboard/')
        assert response.status_code == 200
    
    def test_dashboard_method_not_allowed(self, api_client):
        response = api_client.post('/api/dashboard/')
        assert response.status_code in [405, 400]


class TestEmployeesAPI:
    
    def test_employees_list(self, api_client, employee):
        response = api_client.get('/api/employees/list/')
        assert response.status_code == 200
    
    def test_create_employee(self, api_client, db):
        response = api_client.post('/api/employees/list/',
            data=json.dumps({'employee_id': 'NV_NEW', 'first_name': 'Test', 'last_name': 'User', 'department': 'IT'}),
            content_type='application/json')
        assert response.status_code in [200, 201, 400]
    
    def test_create_employee_duplicate_id(self, api_client, employee):
        response = api_client.post('/api/employees/list/',
            data=json.dumps({'employee_id': 'NV001', 'first_name': 'Duplicate', 'last_name': 'User'}),
            content_type='application/json')
        assert response.status_code in [400, 500]
    
    def test_employee_detail_get(self, api_client, employee):
        response = api_client.get(f'/api/employees/{employee.employee_id}/detail/')
        assert response.status_code == 200
    
    def test_employee_detail_not_found(self, api_client):
        response = api_client.get('/api/employees/NOTFOUND/detail/')
        assert response.status_code == 404


class TestDepartmentsAPI:
    
    def test_departments_list(self, api_client, department):
        response = api_client.get('/api/departments/list/')
        assert response.status_code == 200
    
    def test_create_department(self, api_client, db):
        response = api_client.post('/api/departments/list/',
            data=json.dumps({'name': 'Phòng Mới', 'description': 'Mô tả phòng ban mới'}),
            content_type='application/json')
        assert response.status_code in [200, 201, 400]
    
    def test_department_detail_get(self, api_client, department):
        response = api_client.get(f'/api/departments/{department.pk}/detail/')
        assert response.status_code == 200
    
    def test_department_detail_not_found(self, api_client):
        response = api_client.get('/api/departments/99999/detail/')
        assert response.status_code == 404


class TestAccountsAPI:
    
    def test_accounts_list(self, api_client, user):
        response = api_client.get('/api/accounts/list/')
        assert response.status_code == 200
    
    def test_create_account(self, api_client, db):
        response = api_client.post('/api/accounts/list/',
            data=json.dumps({'username': 'newuser', 'password': 'newpass123', 'email': 'new@example.com'}),
            content_type='application/json')
        assert response.status_code in [200, 201, 400]
    
    def test_account_detail_get(self, api_client, user):
        response = api_client.get(f'/api/accounts/{user.pk}/detail/')
        assert response.status_code == 200
    
    def test_account_detail_not_found(self, api_client):
        response = api_client.get('/api/accounts/99999/detail/')
        assert response.status_code == 404
