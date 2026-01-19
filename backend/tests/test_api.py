"""
API Endpoints Testing Script
Test all critical API endpoints for functionality and error handling
"""
import requests
import json
import base64
import time
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configuration
BASE_URL = "http://localhost:8000"  # Change to your backend URL
TEST_USERNAME = "admin"  # Change to your admin username
TEST_PASSWORD = "admin"  # Change to your admin password

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

class APITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'total': 0
        }
        
    def test(self, name, func):
        """Wrapper để test một endpoint"""
        self.test_results['total'] += 1
        print(f"\n{Colors.BLUE}[TEST] {name}{Colors.END}")
        try:
            result = func()
            if result:
                self.test_results['passed'] += 1
                print(f"{Colors.GREEN}✅ PASSED{Colors.END}")
                return True
            else:
                self.test_results['failed'] += 1
                print(f"{Colors.RED}❌ FAILED{Colors.END}")
                return False
        except Exception as e:
            self.test_results['failed'] += 1
            print(f"{Colors.RED}❌ ERROR: {str(e)}{Colors.END}")
            return False
    
    def test_login(self):
        """Test login endpoint"""
        def _test():
            url = f"{self.base_url}/api/login/"
            
            # Test 1: Valid login
            response = self.session.post(url, json={
                'username': TEST_USERNAME,
                'password': TEST_PASSWORD
            })
            
            if response.status_code != 200:
                print(f"  Login failed: {response.status_code}")
                return False
            
            data = response.json()
            if not data.get('success'):
                print(f"  Login unsuccessful: {data}")
                return False
            
            print(f"  ✓ Logged in as: {data['user']['username']}")
            return True
        
        return self.test("Login API", _test)
    
    def test_dashboard(self):
        """Test dashboard API"""
        def _test():
            url = f"{self.base_url}/api/dashboard/"
            response = self.session.get(url)
            
            if response.status_code != 200:
                print(f"  Failed: {response.status_code}")
                return False
            
            data = response.json()
            if not data.get('success'):
                print(f"  Response not successful")
                return False
            
            stats = data.get('company_stats', {})
            print(f"  ✓ Total employees: {stats.get('total_employees', 0)}")
            print(f"  ✓ Working: {stats.get('working', 0)}")
            print(f"  ✓ In office: {stats.get('in_office', 0)}")
            return True
        
        return self.test("Dashboard API", _test)
    
    def test_employees_list(self):
        """Test employees list API"""
        def _test():
            url = f"{self.base_url}/api/employees/list/"
            response = self.session.get(url)
            
            if response.status_code != 200:
                print(f"  Failed: {response.status_code}")
                return False
            
            data = response.json()
            if not data.get('success'):
                return False
            
            employees = data.get('employees', [])
            print(f"  ✓ Found {len(employees)} employees")
            
            if len(employees) > 0:
                emp = employees[0]
                print(f"  ✓ Sample: {emp.get('full_name')} ({emp.get('employee_id')})")
            
            return True
        
        return self.test("Employees List API", _test)
    
    def test_departments_list(self):
        """Test departments list API"""
        def _test():
            url = f"{self.base_url}/api/departments/list/"
            response = self.session.get(url)
            
            if response.status_code != 200:
                print(f"  Failed: {response.status_code}")
                return False
            
            data = response.json()
            if not data.get('success'):
                return False
            
            departments = data.get('departments', [])
            print(f"  ✓ Found {len(departments)} departments")
            
            return True
        
        return self.test("Departments List API", _test)
    
    def test_employee_stats(self):
        """Test employee stats API"""
        def _test():
            # Get first employee
            emp_response = self.session.get(f"{self.base_url}/api/employees/list/")
            if emp_response.status_code != 200:
                print("  Cannot get employees list")
                return False
            
            employees = emp_response.json().get('employees', [])
            if len(employees) == 0:
                print("  No employees found to test")
                return True  # Skip test
            
            emp_id = employees[0]['employee_id']
            
            url = f"{self.base_url}/api/stats/{emp_id}/"
            response = self.session.get(url)
            
            if response.status_code != 200:
                print(f"  Failed: {response.status_code}")
                return False
            
            data = response.json()
            if not data.get('success'):
                return False
            
            stats = data.get('stats', {})
            print(f"  ✓ Employee: {emp_id}")
            print(f"  ✓ Total days: {stats.get('total_days', 0)}")
            print(f"  ✓ On time: {stats.get('on_time', 0)}")
            print(f"  ✓ Diligence: {stats.get('diligence_score', 0)}%")
            
            return True
        
        return self.test("Employee Stats API", _test)
    
    def test_attendance_history(self):
        """Test attendance history API"""
        def _test():
            # Get first employee
            emp_response = self.session.get(f"{self.base_url}/api/employees/list/")
            if emp_response.status_code != 200:
                print("  Cannot get employees list")
                return False
            
            employees = emp_response.json().get('employees', [])
            if len(employees) == 0:
                print("  No employees found to test")
                return True
            
            emp_id = employees[0]['employee_id']
            
            url = f"{self.base_url}/api/history/{emp_id}/"
            response = self.session.get(url)
            
            if response.status_code != 200:
                print(f"  Failed: {response.status_code}")
                return False
            
            data = response.json()
            if not data.get('success'):
                return False
            
            history = data.get('history', [])
            print(f"  ✓ Found {len(history)} records")
            
            return True
        
        return self.test("Attendance History API", _test)
    
    def test_push_token_registration(self):
        """Test push token registration"""
        def _test():
            # Get first employee
            emp_response = self.session.get(f"{self.base_url}/api/employees/list/")
            if emp_response.status_code != 200:
                return False
            
            employees = emp_response.json().get('employees', [])
            if len(employees) == 0:
                print("  No employees found to test")
                return True
            
            emp_id = employees[0]['employee_id']
            
            url = f"{self.base_url}/api/push-token/"
            test_token = "TEST_FCM_TOKEN_123456789"
            
            response = self.session.post(url, json={
                'employee_id': emp_id,
                'push_token': test_token
            })
            
            if response.status_code != 200:
                print(f"  Failed: {response.status_code}")
                return False
            
            data = response.json()
            if not data.get('success'):
                print(f"  Registration failed: {data}")
                return False
            
            print(f"  ✓ Token registered for {emp_id}")
            return True
        
        return self.test("Push Token Registration", _test)
    
    def test_error_handling(self):
        """Test error handling"""
        def _test():
            # Test 1: Invalid employee ID
            url = f"{self.base_url}/api/stats/INVALID_ID/"
            response = self.session.get(url)
            
            if response.status_code == 404 or (response.status_code == 200 and not response.json().get('success')):
                print("  ✓ Invalid employee ID handled correctly")
            else:
                print("  ✗ Invalid employee ID not handled properly")
                return False
            
            # Test 2: Invalid login
            url = f"{self.base_url}/api/login/"
            response = self.session.post(url, json={
                'username': 'invalid_user_12345',
                'password': 'wrong_password'
            })
            
            if response.status_code == 401 or not response.json().get('success'):
                print("  ✓ Invalid login handled correctly")
            else:
                print("  ✗ Invalid login not handled properly")
                return False
            
            return True
        
        return self.test("Error Handling", _test)
    
    def print_summary(self):
        """In tóm tắt kết quả"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.test_results['total']}")
        print(f"{Colors.GREEN}Passed: {self.test_results['passed']}{Colors.END}")
        print(f"{Colors.RED}Failed: {self.test_results['failed']}{Colors.END}")
        
        success_rate = (self.test_results['passed'] / self.test_results['total'] * 100) if self.test_results['total'] > 0 else 0
        print(f"\nSuccess Rate: {success_rate:.1f}%")
        
        if success_rate == 100:
            print(f"{Colors.GREEN}✅ ALL TESTS PASSED!{Colors.END}")
        elif success_rate >= 80:
            print(f"{Colors.YELLOW}⚠️ MOST TESTS PASSED{Colors.END}")
        else:
            print(f"{Colors.RED}❌ MANY TESTS FAILED{Colors.END}")
        
        print("="*60)

def main():
    print("\n" + "🧪"*30)
    print("API ENDPOINTS TESTING")
    print("🧪"*30)
    
    print(f"\n📍 Testing backend at: {BASE_URL}")
    print(f"👤 Using credentials: {TEST_USERNAME}")
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/api/dashboard/", timeout=5)
    except requests.exceptions.ConnectionError:
        print(f"\n{Colors.RED}❌ ERROR: Cannot connect to {BASE_URL}{Colors.END}")
        print("Make sure the backend server is running!")
        return
    except requests.exceptions.Timeout:
        print(f"\n{Colors.RED}❌ ERROR: Connection timeout{Colors.END}")
        return
    
    tester = APITester(BASE_URL)
    
    # Run tests
    tester.test_login()
    time.sleep(0.5)
    
    tester.test_dashboard()
    time.sleep(0.5)
    
    tester.test_employees_list()
    time.sleep(0.5)
    
    tester.test_departments_list()
    time.sleep(0.5)
    
    tester.test_employee_stats()
    time.sleep(0.5)
    
    tester.test_attendance_history()
    time.sleep(0.5)
    
    tester.test_push_token_registration()
    time.sleep(0.5)
    
    tester.test_error_handling()
    
    # Print summary
    tester.print_summary()
    
    print("\n✨ API testing completed!")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
