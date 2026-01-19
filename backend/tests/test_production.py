"""
Test Waitress Production Server Performance
"""
import requests
import time
import statistics

WAITRESS_URL = "http://localhost:8001"
DJANGO_URL = "http://localhost:8000"

def test_server(base_url, name, count=10):
    """Test một server với nhiều requests"""
    print(f"\n{'='*60}")
    print(f"Testing: {name} ({base_url})")
    print(f"{'='*60}")
    
    times = []
    
    # Warm up request
    try:
        requests.get(f"{base_url}/api/dashboard/", timeout=30)
    except:
        print(f"❌ Cannot connect to {base_url}")
        return None
    
    print(f"Running {count} requests...")
    
    for i in range(count):
        start = time.time()
        response = requests.get(f"{base_url}/api/dashboard/", timeout=30)
        elapsed = (time.time() - start) * 1000
        times.append(elapsed)
        print(f"  Request {i+1}: {elapsed:.0f}ms (status: {response.status_code})")
    
    avg = statistics.mean(times)
    print(f"\nResults:")
    print(f"  Average: {avg:.0f}ms")
    print(f"  Min: {min(times):.0f}ms")
    print(f"  Max: {max(times):.0f}ms")
    
    return avg

def main():
    print("\n" + "🚀"*30)
    print("PRODUCTION SERVER PERFORMANCE TEST")
    print("🚀"*30)
    
    # Test Waitress (production-like)
    waitress_avg = test_server(WAITRESS_URL, "Waitress (Production)", 5)
    
    # Test Django dev server
    django_avg = test_server(DJANGO_URL, "Django Dev Server", 5)
    
    # Compare
    print(f"\n{'='*60}")
    print("COMPARISON")
    print(f"{'='*60}")
    
    if waitress_avg and django_avg:
        print(f"  Django Dev:  {django_avg:.0f}ms")
        print(f"  Waitress:    {waitress_avg:.0f}ms")
        
        if waitress_avg < django_avg:
            improvement = ((django_avg - waitress_avg) / django_avg) * 100
            print(f"\n  ✅ Waitress is {improvement:.0f}% faster!")
        else:
            print(f"\n  ⚠️ Similar performance - bottleneck is elsewhere")
    
    print("\n✨ Test completed!")

if __name__ == "__main__":
    main()
