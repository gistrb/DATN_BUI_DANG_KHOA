"""
DB Connection Test
"""
import os
import sys
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.db import connection

# Test 1: First connection (cold)
start = time.time()
cursor = connection.cursor()
cursor.execute('SELECT 1')
result = cursor.fetchone()
cold_time = (time.time() - start) * 1000
print(f"DB cold query: {cold_time:.0f}ms")

# Test 2: Second connection (warm)
start = time.time()
cursor = connection.cursor()
cursor.execute('SELECT COUNT(*) FROM attendance_employee')
result = cursor.fetchone()
warm_time = (time.time() - start) * 1000
print(f"DB warm query (count employees): {warm_time:.0f}ms - Result: {result[0]} employees")

# Test 3: Multiple queries
from attendance.models import Employee
start = time.time()
count = Employee.objects.count()
query_time = (time.time() - start) * 1000
print(f"ORM Employee.count(): {query_time:.0f}ms - {count} employees")

# Test 4: Full dashboard-like query
from attendance.models import AttendanceRecord, Department
start = time.time()
stats = {
    'total': Employee.objects.count(),
    'working': Employee.objects.filter(work_status='WORKING').count(),
    'in_office': Employee.objects.filter(current_status='IN_OFFICE').count(),
    'departments': Department.objects.count(),
}
full_time = (time.time() - start) * 1000
print(f"Dashboard stats queries: {full_time:.0f}ms - {stats}")

print(f"\nTotal estimated API time: {cold_time + full_time:.0f}ms (cold) or {warm_time + full_time:.0f}ms (warm)")

if cold_time > 100:
    print("\n⚠️ Cold DB connection is slow. This is normal for first request.")
if full_time > 100:
    print("⚠️ Dashboard queries are slow. Consider adding indexes.")
else:
    print("✅ Database queries are fast!")
