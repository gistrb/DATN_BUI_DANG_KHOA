"""
Performance Profiling Script
Identify bottlenecks in API endpoints
"""
import requests
import time
import cProfile
import pstats
import io
from functools import wraps

BASE_URL = "http://localhost:8000"

def profile_request(url, method='GET', data=None):
    """Profile a single API request"""
    print(f"\n{'='*60}")
    print(f"PROFILING: {url}")
    print(f"{'='*60}")
    
    # Measure different components
    timings = {}
    
    # 1. DNS + Connection
    start = time.time()
    try:
        if method == 'GET':
            response = requests.get(url, timeout=10)
        else:
            response = requests.post(url, json=data, timeout=10)
        timings['total'] = (time.time() - start) * 1000
        timings['status_code'] = response.status_code
        
        # Parse response
        start_parse = time.time()
        try:
            data = response.json()
            timings['parse'] = (time.time() - start_parse) * 1000
        except:
            timings['parse'] = 0
        
        # Report breakdown
        print(f"\nTiming Breakdown:")
        print(f"  Total Time: {timings['total']:.2f}ms")
        print(f"  Status Code: {timings['status_code']}")
        print(f"  JSON Parse: {timings['parse']:.2f}ms")
        print(f"  Network + Server: {timings['total'] - timings['parse']:.2f}ms")
        
        # Identify issue
        server_time = timings['total'] - timings['parse']
        if server_time > 1000:
            print(f"\n⚠️  SERVER BOTTLENECK: {server_time:.2f}ms")
            print(f"    Likely causes:")
            print(f"    - Slow database queries")
            print(f"    - Heavy middleware processing")
            print(f"    - Unoptimized business logic")
        elif server_time > 500:
            print(f"\n⚠️  SERVER SLOW: {server_time:.2f}ms")
        else:
            print(f"\n✅ Server response good: {server_time:.2f}ms")
        
        return timings
        
    except requests.exceptions.Timeout:
        print("❌ Request timed out after 10s")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def check_middleware():
    """Check Django middleware overhead"""
    print(f"\n{'='*60}")
    print("CHECKING MIDDLEWARE OVERHEAD")
    print(f"{'='*60}")
    
    print("""
Middleware that can slow down requests:
1. SessionMiddleware - Use only if needed
2. CsrfViewMiddleware - Can be slow with many requests
3. AuthenticationMiddleware - DB query per request
4. SecurityMiddleware - Multiple checks

Recommendations:
- Remove unused middleware
- Use @csrf_exempt for API endpoints
- Cache authentication results
- Consider DRF (Django REST Framework) for APIs
    """)

def check_database_queries():
    """Suggestions for database optimization"""
    print(f"\n{'='*60}")
    print("DATABASE OPTIMIZATION TIPS")
    print(f"{'='*60}")
    
    print("""
Common issues:
1. N+1 Query Problem
   - Use select_related() for ForeignKey
   - Use prefetch_related() for ManyToMany

2. Missing Indexes
   - Add db_index=True to frequently queried fields
   - Example: employee_id, date fields

3. Unoptimized Queries
   - Use only() or defer() to limit fields
   - Use values() for simple data

Quick fixes:
```python
# Before (slow):
employees = Employee.objects.all()
for emp in employees:
    print(emp.user.username)  # N+1 query!

# After (fast):
employees = Employee.objects.select_related('user').all()
for emp in employees:
    print(emp.user.username)  # 1 query only
```

To find slow queries:
1. Enable Django Debug Toolbar
2. Or add to settings.py:
   LOGGING = {
       'loggers': {
           'django.db.backends': {
               'level': 'DEBUG',
           }
       }
   }
    """)

def check_caching():
    """Caching recommendations"""
    print(f"\n{'='*60}")
    print("CACHING RECOMMENDATIONS")
    print(f"{'='*60}")
    
    print("""
Dashboard API caches candidates:
- Company stats (cache 1 minute)
- Employee list (cache 5 minutes)
- Department list (cache 10 minutes)

Implementation:
```python
from django.core.cache import cache

def dashboard_api(request):
    cache_key = 'dashboard_stats'
    stats = cache.get(cache_key)
    
    if stats is None:
        stats = calculate_stats()  # Expensive operation
        cache.set(cache_key, stats, 60)  # Cache for 60 seconds
    
    return JsonResponse({'stats': stats})
```

Setup cache in settings.py:
```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}
```
    """)

def main():
    print("\n" + "🔍"*30)
    print("PERFORMANCE PROFILING & ANALYSIS")
    print("🔍"*30)
    
    # Profile key endpoints
    endpoints = [
        f"{BASE_URL}/api/dashboard/",
        f"{BASE_URL}/api/employees/list/",
        f"{BASE_URL}/api/departments/list/",
    ]
    
    for endpoint in endpoints:
        profile_request(endpoint)
        time.sleep(1)
    
    # Analysis
    check_middleware()
    check_database_queries()
    check_caching()
    
    # Summary
    print(f"\n{'='*60}")
    print("OPTIMIZATION PRIORITY")
    print(f"{'='*60}")
    print("""
🔥 HIGH PRIORITY (Do first):
1. Add caching for dashboard/stats APIs
2. Optimize database queries (select_related, prefetch_related)
3. Add indexes to Employee.employee_id, AttendanceRecord.date

⚠️  MEDIUM PRIORITY:
4. Remove unused middleware for API endpoints
5. Use @csrf_exempt decorator for mobile APIs
6. Enable query logging to find slow queries

💡 LOW PRIORITY (Nice to have):
7. Consider Django REST Framework
8. Setup Redis for production caching
9. Use connection pooling for database
    """)
    
    print(f"\n{'='*60}")
    print("QUICK WIN: Add this to your views")
    print(f"{'='*60}")
    print("""
from django.core.cache import cache
from django.views.decorators.cache import cache_page

# Cache for 60 seconds
@cache_page(60)
def dashboard_api(request):
    # ... your code

# Or manual caching:
def dashboard_api(request):
    stats = cache.get('dashboard_stats')
    if not stats:
        stats = compute_stats()  # Your expensive operation
        cache.set('dashboard_stats', stats, 60)
    return JsonResponse({'stats': stats})
    """)
    
    print("\n✨ Profiling completed!")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
