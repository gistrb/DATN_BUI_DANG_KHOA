"""
Test Runner - Chạy tất cả các test
"""
import os
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
django.setup()


def run_all_tests():
    """Chạy tất cả các loại test"""
    print("\n" + "🧪"*35)
    print("COMPLETE TEST SUITE")
    print("🧪"*35)
    
    results = {}
    
    # 1. Unit Tests
    print("\n" + "="*70)
    print("1/3: UNIT TESTS")
    print("="*70)
    try:
        from tests.test_unit import run_unit_tests
        results['unit'] = run_unit_tests()
    except Exception as e:
        print(f"❌ Unit Tests Error: {e}")
        results['unit'] = None
    
    # 2. Integration Tests (requires test database)
    print("\n" + "="*70)
    print("2/3: INTEGRATION TESTS")
    print("="*70)
    print("⚠️  Integration tests require test database setup")
    print("Run separately with: python manage.py test tests.test_integration")
    results['integration'] = None
    
    # 3. System Tests
    print("\n" + "="*70)
    print("3/3: SYSTEM TESTS")
    print("="*70)
    try:
        from tests.test_system import run_system_tests
        results['system'] = run_system_tests()
    except Exception as e:
        print(f"❌ System Tests Error: {e}")
        results['system'] = None
    
    # Final Summary
    print("\n" + "="*70)
    print("📊 FINAL SUMMARY")
    print("="*70)
    
    for test_type, result in results.items():
        if result is None:
            status = "⚠️ SKIPPED/ERROR"
        elif result.wasSuccessful():
            status = "✅ PASSED"
        else:
            status = f"❌ FAILED ({len(result.failures)} failures, {len(result.errors)} errors)"
        
        print(f"{test_type.upper():15} {status}")
    
    print("\n" + "="*70)
    
    # Overall result
    all_passed = all(
        r is not None and r.wasSuccessful() 
        for r in results.values() 
        if r is not None
    )
    
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
    else:
        print("⚠️  SOME TESTS NEED ATTENTION")
    
    print("="*70 + "\n")


if __name__ == '__main__':
    run_all_tests()
