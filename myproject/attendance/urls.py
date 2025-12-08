from django.urls import path
from . import views, api

app_name = 'attendance'

urlpatterns = [
    # Django Template Views (HTML)
    path('', views.dashboard, name='dashboard'),
    path('face-check/', views.face_check, name='face_check'),
    path('register-face/', views.register_face, name='register_face'),
    path('employee/<str:employee_id>/', views.employee_detail, name='employee_detail'),
    
    # API Endpoints (for React & Mobile)
    path('process-attendance/', views.process_attendance, name='process_attendance'),
    path('check-pose/', views.check_pose, name='check_pose'),
    path('check-duplicate/', views.check_duplicate, name='check_duplicate'),
    
    # Employee management
    path('employees/', views.employee_list, name='employee_list'),
    path('employees/create/', views.employee_create, name='employee_create'),
    
    # Department management
    path('departments/', views.department_list, name='department_list'),
    path('departments/<int:pk>/', views.department_detail, name='department_detail'),
    path('departments/create/', views.department_create, name='department_create'),
    path('departments/<int:pk>/update/', views.department_update, name='department_update'),
    path('departments/<int:pk>/delete/', views.department_delete, name='department_delete'),
    
    # Mobile App APIs
    path('api/login/', api.login_api, name='api_login'),
    path('api/stats/<str:employee_id>/', api.employee_stats_api, name='api_stats'),
    path('api/history/<str:employee_id>/', api.attendance_history_api, name='api_history'),
    path('api/employees/', api.employees_without_face_api, name='api_employees'),
]
