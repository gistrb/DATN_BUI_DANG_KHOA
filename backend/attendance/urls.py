from django.urls import path
from . import views, api

app_name = 'attendance'

urlpatterns = [
    # API Endpoints (for React & Mobile)
    path('process-attendance/', views.process_attendance, name='process_attendance'),
    path('check-pose/', views.check_pose, name='check_pose'),
    path('check-duplicate/', views.check_duplicate, name='check_duplicate'),
    path('register-face/', views.register_face, name='register_face'),
    path('delete-face/', views.delete_face, name='delete_face'),
    
    # Mobile App APIs
    path('api/login/', api.login_api, name='api_login'),
    path('api/stats/<str:employee_id>/', api.employee_stats_api, name='api_stats'),
    path('api/history/<str:employee_id>/', api.attendance_history_api, name='api_history'),
    path('api/employees/', api.employees_without_face_api, name='api_employees'),
    path('api/push-token/', views.register_push_token, name='api_push_token'),
    
    # React Frontend APIs
    path('api/dashboard/', views.dashboard_api, name='api_dashboard'),
    path('api/employees/list/', views.employees_api, name='api_employees_list'),
    path('api/employees/<str:employee_id>/detail/', views.employee_detail_api, name='api_employee_detail'),
    path('api/departments/list/', views.departments_api, name='api_departments_list'),
    path('api/departments/<int:pk>/detail/', views.department_detail_api, name='api_department_detail'),
    path('api/accounts/list/', views.accounts_api, name='api_accounts_list'),
    path('api/accounts/<int:pk>/detail/', views.account_detail_api, name='api_account_detail'),
    path('api/department-stats/', views.department_stats_api, name='api_department_stats'),
    path('api/department-stats/export/', views.export_department_stats_excel, name='api_department_stats_export'),
    path('api/dept-employees/<str:department_name>/', views.department_employees_attendance_api, name='api_department_employees_attendance'),
]
