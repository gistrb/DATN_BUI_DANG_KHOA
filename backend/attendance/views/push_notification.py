import json
import os
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from ..models import Employee

# Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, messaging

# Initialize Firebase Admin SDK (only once)
_firebase_app = None

def get_firebase_app():
    """Initialize Firebase Admin SDK with service account"""
    global _firebase_app
    if _firebase_app is None:
        try:
            # Path to service account file
            service_account_path = os.path.join(
                settings.BASE_DIR, 
                'config', 
                'datastoragedemo-99ff9-3abc57b4ec78.json'
            )
            
            if os.path.exists(service_account_path):
                cred = credentials.Certificate(service_account_path)
                _firebase_app = firebase_admin.initialize_app(cred)
                print("Firebase Admin SDK initialized successfully")
            else:
                print(f"Firebase service account file not found: {service_account_path}")
                return None
        except Exception as e:
            print(f"Error initializing Firebase: {e}")
            return None
    return _firebase_app


def send_fcm_notification(fcm_token, title, body, data=None):
    """
    Send push notification using Firebase Cloud Messaging V1 API
    """
    if not fcm_token:
        return False
    
    # Ensure Firebase is initialized
    app = get_firebase_app()
    if app is None:
        print("Firebase not initialized, skipping push notification")
        return False
    
    try:
        # Build the message
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            token=fcm_token,
            android=messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    sound='default',
                    priority='high',
                    channel_id='attendance',
                ),
            ),
        )
        
        # Send the message
        response = messaging.send(message)
        print(f"FCM notification sent successfully: {response}")
        return True
        
    except Exception as e:
        print(f"Error sending FCM notification: {e}")
        return False


def send_attendance_notification(employee, is_check_in, time_str):
    """
    Send attendance notification to employee's mobile app
    Uses FCM token stored in employee model
    """
    if not employee.expo_push_token:
        print(f"No push token for employee {employee.employee_id}")
        return False
    
    # Extract FCM token from Expo Push Token format
    # ExponentPushToken[xxx] -> we need the actual FCM token
    fcm_token = employee.expo_push_token
    
    # If it's an Expo Push Token format, we can't use it directly with FCM
    # We need to get the actual FCM device token
    if fcm_token.startswith('ExponentPushToken'):
        # For Expo tokens, we still try via Expo Push Service
        return send_expo_push_notification(employee, is_check_in, time_str)
    
    if is_check_in:
        title = "✅ Check-in thành công!"
        body = f"Bạn đã check-in lúc {time_str}. Chúc bạn một ngày làm việc hiệu quả!"
    else:
        title = "✅ Check-out thành công!"
        body = f"Bạn đã check-out lúc {time_str}. Hẹn gặp lại ngày mai!"
    
    data = {
        'type': 'attendance',
        'action': 'check_in' if is_check_in else 'check_out',
        'time': time_str,
        'employee_id': employee.employee_id,
        'realtime_update': 'true',
    }
    
    return send_fcm_notification(fcm_token, title, body, data)


def send_expo_push_notification(employee, is_check_in, time_str):
    """
    Fallback: Send push notification using Expo Push Service
    This is used when we have ExponentPushToken format
    """
    import requests
    
    push_token = employee.expo_push_token
    if not push_token:
        return False
    
    if is_check_in:
        title = "✅ Check-in thành công!"
        body = f"Bạn đã check-in lúc {time_str}. Chúc bạn một ngày làm việc hiệu quả!"
    else:
        title = "✅ Check-out thành công!"
        body = f"Bạn đã check-out lúc {time_str}. Hẹn gặp lại ngày mai!"
    
    message = {
        'to': push_token,
        'sound': 'default',
        'title': title,
        'body': body,
        'data': {
            'type': 'attendance',
            'action': 'check_in' if is_check_in else 'check_out',
            'time': time_str,
            'employee_id': employee.employee_id,
            'realtime_update': 'true',
        },
    }
    
    try:
        response = requests.post(
            'https://exp.host/--/api/v2/push/send',
            headers={
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            data=json.dumps(message),
            timeout=10
        )
        result = response.json()
        print(f"Expo Push notification sent: {result}")
        return True
    except Exception as e:
        print(f"Error sending Expo push notification: {e}")
        return False


@csrf_exempt
def register_push_token(request):
    """
    API endpoint to register/update push token for an employee
    POST /api/push-token/
    Body: { "employee_id": "NV001", "push_token": "ExponentPushToken[xxx]" }
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        employee_id = data.get('employee_id')
        push_token = data.get('push_token')
        
        if not employee_id or not push_token:
            return JsonResponse({
                'success': False,
                'error': 'Missing employee_id or push_token'
            }, status=400)
        
        try:
            employee = Employee.objects.get(employee_id=employee_id)
            employee.expo_push_token = push_token
            employee.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Push token registered successfully'
            })
            
        except Employee.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Employee not found'
            }, status=404)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
