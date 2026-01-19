"""
Stress Testing Script for Face Recognition System
Test system under load with concurrent requests
"""
import requests
import json
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import statistics
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_URL = "http://localhost:8000"

class StressTester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.results = []
        self.errors = []
        
    def make_request(self, endpoint, method='GET', data=None):
        """Make a single request and record response time"""
        start_time = time.time()
        
        try:
            if method == 'GET':
                response = requests.get(f"{self.base_url}{endpoint}", timeout=30)
            else:
                response = requests.post(f"{self.base_url}{endpoint}", 
                                        json=data, timeout=30)
            
            elapsed = time.time() - start_time
            
            return {
                'success': response.status_code == 200,
                'status_code': response.status_code,
                'elapsed': elapsed,
                'endpoint': endpoint
            }
        except requests.exceptions.Timeout:
            elapsed = time.time() - start_time
            self.errors.append({
                'endpoint': endpoint,
                'error': 'Timeout',
                'elapsed': elapsed
            })
            return {
                'success': False,
                'status_code': 0,
                'elapsed': elapsed,
                'endpoint': endpoint,
                'error': 'Timeout'
            }
        except Exception as e:
            elapsed = time.time() - start_time
            self.errors.append({
                'endpoint': endpoint,
                'error': str(e),
                'elapsed': elapsed
            })
            return {
                'success': False,
                'status_code': 0,
                'elapsed': elapsed,
                'endpoint': endpoint,
                'error': str(e)
            }
    
    def concurrent_requests(self, endpoint, num_requests, method='GET', data=None):
        """Send concurrent requests to an endpoint"""
        print(f"\n{'='*60}")
        print(f"TEST: {num_requests} concurrent requests to {endpoint}")
        print(f"{'='*60}")
        
        with ThreadPoolExecutor(max_workers=num_requests) as executor:
            futures = []
            start_time = time.time()
            
            for i in range(num_requests):
                future = executor.submit(self.make_request, endpoint, method, data)
                futures.append(future)
            
            results = []
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
            
            total_time = time.time() - start_time
        
        # Analyze results
        success_count = sum(1 for r in results if r['success'])
        failed_count = num_requests - success_count
        
        response_times = [r['elapsed'] * 1000 for r in results if r['success']]
        
        print(f"\nResults:")
        print(f"  Total requests: {num_requests}")
        print(f"  Successful: {success_count} ✅")
        print(f"  Failed: {failed_count} ❌")
        print(f"  Success rate: {success_count/num_requests*100:.1f}%")
        print(f"  Total time: {total_time:.2f}s")
        
        if response_times:
            print(f"\nResponse Times:")
            print(f"  Average: {statistics.mean(response_times):.2f}ms")
            print(f"  Median: {statistics.median(response_times):.2f}ms")
            print(f"  Min: {min(response_times):.2f}ms")
            print(f"  Max: {max(response_times):.2f}ms")
            print(f"  Std Dev: {statistics.stdev(response_times) if len(response_times) > 1 else 0:.2f}ms")
        
        # Throughput
        if total_time > 0:
            throughput = num_requests / total_time
            print(f"\nThroughput: {throughput:.2f} requests/second")
        
        return {
            'endpoint': endpoint,
            'num_requests': num_requests,
            'success_count': success_count,
            'failed_count': failed_count,
            'total_time': total_time,
            'response_times': response_times
        }
    
    def sequential_load_test(self, endpoint, num_requests, delay=0.1):
        """Send sequential requests with delay to simulate sustained load"""
        print(f"\n{'='*60}")
        print(f"SEQUENTIAL LOAD TEST: {num_requests} requests with {delay}s delay")
        print(f"Endpoint: {endpoint}")
        print(f"{'='*60}")
        
        results = []
        start_time = time.time()
        
        for i in range(num_requests):
            result = self.make_request(endpoint)
            results.append(result)
            
            if (i + 1) % 10 == 0:
                print(f"  Progress: {i+1}/{num_requests} requests sent...")
            
            time.sleep(delay)
        
        total_time = time.time() - start_time
        
        success_count = sum(1 for r in results if r['success'])
        response_times = [r['elapsed'] * 1000 for r in results if r['success']]
        
        print(f"\nResults:")
        print(f"  Total: {num_requests}")
        print(f"  Successful: {success_count} ✅")
        print(f"  Failed: {num_requests - success_count} ❌")
        print(f"  Total time: {total_time:.2f}s")
        
        if response_times:
            print(f"\nResponse Times:")
            print(f"  Average: {statistics.mean(response_times):.2f}ms")
            print(f"  Max: {max(response_times):.2f}ms")
        
        return results

def test_memory_stability():
    """Test for memory leaks with repeated requests"""
    print(f"\n{'='*60}")
    print("MEMORY STABILITY TEST")
    print(f"{'='*60}")
    
    try:
        import psutil
        process = psutil.Process()
        
        start_memory = process.memory_info().rss / 1024 / 1024
        print(f"Initial memory: {start_memory:.2f} MB")
        
        # Make 100 requests
        tester = StressTester(BASE_URL)
        for i in range(100):
            tester.make_request("/api/dashboard/")
            if (i + 1) % 20 == 0:
                current_memory = process.memory_info().rss / 1024 / 1024
                print(f"  After {i+1} requests: {current_memory:.2f} MB")
        
        end_memory = process.memory_info().rss / 1024 / 1024
        memory_increase = end_memory - start_memory
        
        print(f"\nFinal memory: {end_memory:.2f} MB")
        print(f"Memory increase: {memory_increase:.2f} MB")
        
        if memory_increase < 50:
            print("✅ Memory usage stable (< 50MB increase)")
        else:
            print("⚠️ Significant memory increase detected")
            
    except ImportError:
        print("⚠️ psutil not installed. Run: pip install psutil")

def main():
    print("\n" + "💪"*30)
    print("STRESS TESTING")
    print("💪"*30)
    
    print(f"\n📍 Testing backend at: {BASE_URL}")
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/api/dashboard/", timeout=5)
    except:
        print(f"\n❌ ERROR: Cannot connect to {BASE_URL}")
        print("Make sure the backend server is running!")
        return
    
    tester = StressTester(BASE_URL)
    
    # Test 1: Light load (5 concurrent requests)
    tester.concurrent_requests("/api/dashboard/", 5)
    time.sleep(2)
    
    # Test 2: Medium load (10 concurrent requests)
    tester.concurrent_requests("/api/dashboard/", 10)
    time.sleep(2)
    
    # Test 3: Heavy load (20 concurrent requests)
    tester.concurrent_requests("/api/dashboard/", 20)
    time.sleep(2)
    
    # Test 4: API with more processing (employees list)
    tester.concurrent_requests("/api/employees/list/", 10)
    time.sleep(2)
    
    # Test 5: Sequential sustained load
    tester.sequential_load_test("/api/dashboard/", 50, delay=0.1)
    
    # Test 6: Memory stability
    test_memory_stability()
    
    # Summary
    print(f"\n{'='*60}")
    print("STRESS TEST SUMMARY")
    print(f"{'='*60}")
    
    if len(tester.errors) == 0:
        print("✅ No errors encountered")
    else:
        print(f"⚠️ Total errors: {len(tester.errors)}")
        print("\nError details:")
        for error in tester.errors[:5]:  # Show first 5 errors
            print(f"  - {error['endpoint']}: {error['error']}")
    
    print(f"\n{'='*60}")
    print("RECOMMENDATIONS")
    print(f"{'='*60}")
    
    print("""
📊 Based on stress test results:

1. Light Load (5 concurrent):
   - Should handle easily
   - Expected: < 200ms response time

2. Medium Load (10 concurrent):
   - Should be OK for development
   - Expected: < 500ms response time

3. Heavy Load (20+ concurrent):
   - May struggle on free tier (512MB RAM)
   - Consider:
     * Reducing det_size to 480x480
     * Implementing request queue
     * Upgrading to paid tier

4. Production Recommendations:
   - Use load balancer for multiple workers
   - Implement rate limiting (max 5 req/min per user)
   - Monitor memory usage
   - Setup auto-scaling if possible
    """)
    
    print("\n✨ Stress testing completed!")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
