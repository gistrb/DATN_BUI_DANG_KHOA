import requests
import json

BASE_URL = 'http://localhost:8000/api'

def test_login(username, password):
    print(f"Testing login for {username}...")
    url = f"{BASE_URL}/login/"
    payload = {'username': username, 'password': password}
    try:
        response = requests.post(url, json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None

def test_stats(employee_id):
    print(f"\nTesting stats for {employee_id}...")
    url = f"{BASE_URL}/stats/{employee_id}/"
    try:
        response = requests.get(url)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

def test_history(employee_id):
    print(f"\nTesting history for {employee_id}...")
    url = f"{BASE_URL}/history/{employee_id}/"
    try:
        response = requests.get(url)
        print(f"Status: {response.status_code}")
        # Print first 2 records to avoid clutter
        data = response.json()
        if data.get('success'):
            print(f"History count: {len(data['history'])}")
            print(f"First record: {data['history'][0] if data['history'] else 'None'}")
        else:
            print(f"Response: {data}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Replace with a valid user/employee from your DB
    # Assuming 'admin' user exists, but might not be an employee. 
    # Let's try to find a valid employee first or just test with 'admin'
    
    # You should update these credentials to match a real user in your DB
    USERNAME = 'admin' 
    PASSWORD = '123' 
    
    login_data = test_login(USERNAME, PASSWORD)
    
    if login_data and login_data.get('success'):
        employee_id = login_data['user']['employee_id']
        test_stats(employee_id)
        test_history(employee_id)
    else:
        print("\nLogin failed, skipping stats/history tests.")
