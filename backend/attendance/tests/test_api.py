"""Integration tests for Mobile APIs"""
import pytest
import json
from django.contrib.auth.models import User
from attendance.models import Employee


class TestLoginAPI:
    
    def test_login_valid_employee(self, api_client, employee):
        response = api_client.post('/api/login/',
            data=json.dumps({'username': 'testuser', 'password': 'testpass123'}),
            content_type='application/json')
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert data['user']['employee_id'] == 'NV001'
    
    def test_login_valid_admin(self, api_client, admin_user):
        response = api_client.post('/api/login/',
            data=json.dumps({'username': 'admin', 'password': 'adminpass123'}),
            content_type='application/json')
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert data['user']['is_superuser'] == True
    
    def test_login_invalid_credentials(self, api_client):
        response = api_client.post('/api/login/',
            data=json.dumps({'username': 'wronguser', 'password': 'wrongpass'}),
            content_type='application/json')
        assert response.status_code == 401
        assert response.json()['success'] == False
    
    def test_login_empty_username(self, api_client):
        response = api_client.post('/api/login/',
            data=json.dumps({'username': '', 'password': 'password'}),
            content_type='application/json')
        assert response.status_code == 401
    
    def test_login_empty_password(self, api_client):
        response = api_client.post('/api/login/',
            data=json.dumps({'username': 'testuser', 'password': ''}),
            content_type='application/json')
        assert response.status_code == 401
    
    def test_login_invalid_json(self, api_client):
        response = api_client.post('/api/login/',
            data='invalid json', content_type='application/json')
        assert response.status_code == 400
    
    def test_login_method_not_allowed(self, api_client):
        response = api_client.get('/api/login/')
        assert response.status_code == 405
    
    def test_login_user_without_employee(self, api_client, db):
        User.objects.create_user(username='noemp', password='pass123')
        response = api_client.post('/api/login/',
            data=json.dumps({'username': 'noemp', 'password': 'pass123'}),
            content_type='application/json')
        assert response.status_code == 403


class TestEmployeeStatsAPI:
    
    def test_stats_valid_employee(self, api_client, employee, attendance_record):
        response = api_client.get(f'/api/stats/{employee.employee_id}/')
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert 'stats' in data
    
    def test_stats_invalid_employee(self, api_client):
        response = api_client.get('/api/stats/INVALID/')
        assert response.status_code == 404
    
    def test_stats_null_employee_id(self, api_client):
        response = api_client.get('/api/stats/null/')
        assert response.status_code in [400, 404]
    
    def test_stats_none_employee_id(self, api_client):
        response = api_client.get('/api/stats/None/')
        assert response.status_code in [400, 404]


class TestAttendanceHistoryAPI:
    
    def test_history_valid_employee(self, api_client, employee, attendance_record):
        response = api_client.get(f'/api/history/{employee.employee_id}/')
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert 'history' in data
        assert isinstance(data['history'], list)
    
    def test_history_invalid_employee(self, api_client):
        response = api_client.get('/api/history/INVALID/')
        assert response.status_code == 404
    
    def test_history_null_employee_id(self, api_client):
        response = api_client.get('/api/history/null/')
        assert response.status_code in [400, 404]
