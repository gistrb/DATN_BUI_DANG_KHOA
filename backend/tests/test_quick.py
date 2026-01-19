"""
Quick Performance Test after Optimization
"""
import requests
import time
import statistics

BASE_URL = "http://localhost:8000"

def test_endpoint(url, num_requests=5):
    """Test một endpoint và báo cáo response time"""
    times = []
    
    for i in range(num_requests):
        start = time.time()
        response = requests.get(url, timeout=30)
        elapsed = (time.time() - start) * 1000
        times.append(elapsed)
        
    return {
        'avg': statistics.mean(times),
        'min': min(times),
        'max': max(times),
        'status': 'cached' if times[1] < times[0] * 0.5 else 'normal'
    }

def main():
    print("\n" + "⚡"*30)
    print("QUICK PERFORMANCE TEST (After Optimization)")
    print("⚡"*30)
    
    endpoints = [
        ("/api/dashboard/", "Dashboard API"),
        ("/api/employees/list/", "Employees List"),
        ("/api/departments/list/", "Departments List"),
    ]
    
    print(f"\n{'Endpoint':<25} {'Avg':<12} {'Min':<12} {'Max':<12} {'Cache?'}")
    print("-"*70)
    
    for path, name in endpoints:
        result = test_endpoint(f"{BASE_URL}{path}")
        print(f"{name:<25} {result['avg']:.0f}ms      {result['min']:.0f}ms      {result['max']:.0f}ms      {result['status']}")
    
    # Test concurrent
    print(f"\n{'='*60}")
    print("CONCURRENT TEST: 5 requests to Dashboard")
    print("="*60)
    
    import concurrent.futures
    
    def single_request():
        start = time.time()
        requests.get(f"{BASE_URL}/api/dashboard/", timeout=30)
        return (time.time() - start) * 1000
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        start_total = time.time()
        futures = [executor.submit(single_request) for _ in range(5)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
        total_time = time.time() - start_total
    
    print(f"  Total time: {total_time:.2f}s")
    print(f"  Avg response: {statistics.mean(results):.0f}ms")
    print(f"  Throughput: {5/total_time:.2f} req/s")
    
    # Evaluation
    avg_response = statistics.mean(results)
    print(f"\n{'='*60}")
    print("EVALUATION")
    print("="*60)
    
    if avg_response < 500:
        print("✅ EXCELLENT: Response time < 500ms")
    elif avg_response < 1000:
        print("✅ GOOD: Response time < 1s")
    elif avg_response < 2000:
        print("⚠️ ACCEPTABLE: Response time < 2s")
    else:
        print("❌ SLOW: Response time > 2s - More optimization needed")
    
    print("\n✨ Quick test completed!")

if __name__ == "__main__":
    main()
